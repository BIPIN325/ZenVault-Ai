import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - mammoth does not provide official types
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';



/**
 * Universal Offline Document Extractor
 * Parses Text, Markdown, PDF, DOCX, and Images into clean raw text strings.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type;
  const name = file.name.toLowerCase();

  try {
    // 1. Plain Text & Markdown
    if (type === 'text/plain' || type === 'text/markdown' || name.endsWith('.md') || name.endsWith('.txt')) {
      return await file.text();
    }

    // 2. Word Documents (DOCX)
    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      // mammoth reads the ArrayBuffer and converts the DOCX XML to raw text
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    // 3. PDF Documents
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      // Force overwrite the workerSrc to bypass Next.js Fast Refresh caching old URLs
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Load the document safely in the browser memory
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      // Iterate through each page sequentially
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Concatenate text items per page
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    }

    // 4. Images & Handwritten Scans (OCR)
    if (type.startsWith('image/')) {
      // ARCHITECTURE NOTE:
      // Tesseract.js will dynamically fetch its webassembly core (.wasm) and 
      // the English language trained data (.traineddata) from a public CDN (unpkg).
      // To make this 100% offline, these files must be bundled manually into /public.
      // Additionally, OCR is heavy. In future iterations, this logic should be 
      // wrapped in a dedicated Web Worker to prevent UI thread blocking.
      
      const worker = await Tesseract.createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      return text;
    }

    throw new Error(`Unsupported file format: ${type || file.name}`);
  } catch (error: any) {
    console.error("omniParser extraction failed:", error);
    throw new Error(`Failed to extract text from ${file.name}. Reason: ${error?.message || error}`);
  }
}
