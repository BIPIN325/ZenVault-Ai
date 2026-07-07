import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error - mammoth does not provide official types
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Universal Offline Document Extractor
 * Parses Text, HTML, Markdown, PDF, DOCX, Images, and Audio into clean raw text strings.
 */

// Helper to run workers asynchronously
function runWorkerTask(workerUrl: URL, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, { type: 'module' });
    const id = uuidv4();

    worker.onmessage = (event: MessageEvent) => {
      const { type, data, text, error } = event.data;
      if (type === 'PROGRESS') {
        console.log(`Worker Progress [${file.name}]:`, data);
      } else if (type === 'RESULT') {
        worker.terminate();
        resolve(text);
      } else if (type === 'ERROR') {
        worker.terminate();
        reject(new Error(error));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage({ id, file });
  });
}

export async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type;
  const name = file.name.toLowerCase();

  try {
    // 1. Plain Text & Markdown
    if (type === 'text/plain' || type === 'text/markdown' || name.endsWith('.md') || name.endsWith('.txt')) {
      return await file.text();
    }

    // 2. HTML (Offline Web Scraping)
    if (type === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) {
      const htmlText = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      // Remove scripts and styles
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(s => s.remove());
      
      // Return clean text
      return doc.body.textContent?.trim() || '';
    }

    // 3. Word Documents (DOCX)
    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    // 4. PDF Documents
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    }

    // 5. Images (OCR)
    if (type.startsWith('image/')) {
      const Tesseract = (await import('tesseract.js')).default;
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => console.log('OCR Progress:', m)
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      return text;
    }

    // 6. Audio (Whisper Transcription)
    if (type.startsWith('audio/') || type === 'video/webm' || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.webm')) {
      return await runWorkerTask(new URL('../workers/audio.worker.ts', import.meta.url), file);
    }

    throw new Error(`Unsupported file format: ${type || file.name}`);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("omniParser extraction failed:", err);
    throw new Error(`Failed to extract text from ${file.name}. Reason: ${err?.message || err}`);
  }
}
