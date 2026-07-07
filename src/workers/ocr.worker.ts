import Tesseract from 'tesseract.js';

self.addEventListener('message', async (event: MessageEvent) => {
  const { id, file } = event.data;
  
  if (!file) {
    self.postMessage({ id, type: 'ERROR', error: 'No file provided to OCR worker' });
    return;
  }

  try {
    self.postMessage({ id, type: 'PROGRESS', data: { status: 'Initializing OCR Engine...' } });
    
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          self.postMessage({ 
            id, 
            type: 'PROGRESS', 
            data: { status: `Recognizing: ${Math.round(m.progress * 100)}%` } 
          });
        }
      }
    });

    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    self.postMessage({ id, type: 'RESULT', text });
  } catch (error: unknown) {
    const err = error as Error;
    self.postMessage({ id, type: 'ERROR', error: err.message || String(err) });
  }
});
