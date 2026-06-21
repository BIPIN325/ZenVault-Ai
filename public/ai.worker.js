import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// Skip local model check since we are running in the browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance(progress_callback) {
    if (this.instance === null) {
      console.log("Initializing Transformers.js pipeline...");
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

console.log("AI Web Worker script successfully loaded via CDN.");
self.postMessage({ type: 'WORKER_LOADED' });

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, text, id } = event.data;

  if (type === 'GENERATE_EMBEDDING' || type === 'INIT_MODEL') {
    if (type === 'GENERATE_EMBEDDING') {
      console.log(`Worker received GENERATE_EMBEDDING request for id: ${id}`);
    } else {
      console.log(`Worker received INIT_MODEL request to pre-warm the engine.`);
    }

    try {
      // Retrieve the embedding pipeline. When called for the first time,
      // this will load the pipeline and save it for future use.
      const extractor = await PipelineSingleton.getInstance((x) => {
        // Send a progress message to the main thread
        console.log("Transformers.js progress:", x);
        self.postMessage({ type: 'PROGRESS', data: x });
      });

      if (type === 'INIT_MODEL') return;

      // Actually perform the feature extraction
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      
      // Extract the float32 array into a standard number array
      const embedding = Array.from(output.data);

      // Send the output back to the main thread
      self.postMessage({
        type: 'EMBEDDING_RESULT',
        id,
        embedding
      });
    } catch (error) {
      console.error("Worker error during embedding:", error);
      self.postMessage({
        type: 'ERROR',
        id,
        error: error.message || 'Unknown error generating embedding'
      });
    }
  }
});
