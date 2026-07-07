import { pipeline, env } from '@xenova/transformers';

// Disable fetching model config/weights from remote if we want strict offline, 
// but for the first load we need it. LocalForage caching handles subsequent loads.
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
  static task = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-tiny.en';
  static instance: unknown = null;

  static async getInstance(progress_callback: (progress: unknown) => void) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback,
        device: 'webgpu', // Prefer WebGPU
      }).catch(async (err) => {
        console.warn("WebGPU failed, falling back to WASM for Audio Transcription", err);
        // Fallback to WASM
        return await pipeline(this.task, this.model, {
          progress_callback,
          device: 'wasm'
        });
      });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { id, file } = event.data;

  if (!file) {
    self.postMessage({ id, type: 'ERROR', error: 'No audio file provided to Audio worker' });
    return;
  }

  try {
    const transcriber = await PipelineSingleton.getInstance(x => {
      self.postMessage({ id, type: 'PROGRESS', data: x });
    });

    self.postMessage({ id, type: 'PROGRESS', data: { status: 'Transcribing audio...' } });

    // Web Audio API cannot be used directly in Workers in all browsers (like OfflineAudioContext), 
    // but Transformers.js can handle Float32Array or URLs. We can read the File Blob to an array buffer.
    // For audio files, Transformers.js pipeline usually expects a URL or Float32Array. 
    // Creating a URL object inside the worker:
    const url = URL.createObjectURL(file);
    
    // Pass the URL directly to the pipeline. Transformers.js handles fetching and decoding via standard audio contexts where available, or basic decoding.
    // Note: If Web Audio API is completely unavailable in the worker context, this might require main-thread audio decoding.
    // However, recent Transformers.js supports worker-side decoding or URL passing.
    const result = await transcriber(url);
    URL.revokeObjectURL(url);

    const text = result.text || '';
    self.postMessage({ id, type: 'RESULT', text });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Audio worker error:", err);
    self.postMessage({ id, type: 'ERROR', error: err.message || String(err) });
  }
});
