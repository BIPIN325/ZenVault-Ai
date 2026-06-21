// Polyfill process.env for Next.js Turbopack Web Worker environment
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = { env: {} };
} else if (typeof globalThis.process.env === 'undefined') {
  (globalThis as any).process.env = {};
}

class PipelineSingleton {
  static task = 'feature-extraction' as const;
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      console.log("Dynamically importing Transformers.js...");
      const { pipeline, env } = await import('@xenova/transformers');
      
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      console.log("Initializing Transformers.js pipeline...");
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

console.log("AI Web Worker script successfully parsed and executed.");
self.postMessage({ type: 'WORKER_LOADED' });

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, text, id } = event.data;

  if (type === 'GENERATE_EMBEDDING') {
    console.log(`Worker received GENERATE_EMBEDDING request for id: ${id}`);
    try {
      // Retrieve the embedding pipeline. When called for the first time,
      // this will load the pipeline and save it for future use.
      const extractor = await PipelineSingleton.getInstance((x: any) => {
        // Send a progress message to the main thread
        console.log("Transformers.js progress:", x);
        self.postMessage({ type: 'PROGRESS', data: x });
      });

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
      self.postMessage({
        type: 'ERROR',
        id,
        error: error instanceof Error ? error.message : 'Unknown error generating embedding'
      });
    }
  }
});
