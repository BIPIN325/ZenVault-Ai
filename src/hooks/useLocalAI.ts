"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface AIProgressEvent {
  status: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export function useLocalAI() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [progressEvent, setProgressEvent] = useState<AIProgressEvent | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Store promise resolvers to match requests with responses
  const callbacks = useRef<Map<string, { resolve: (val: number[]) => void, reject: (err: any) => void }>>(new Map());

  useEffect(() => {
    if (!workerRef.current) {
      console.log("Instantiating AI Web Worker from public directory...");
      // Instantiate the worker from the public directory to bypass Turbopack completely
      workerRef.current = new Worker('/ai.worker.js', {
        type: 'module'
      });

      workerRef.current.onerror = (err) => {
        console.error("CRITICAL: Web Worker encountered an error!", err);
        callbacks.current.forEach(cb => cb.reject(new Error("Web Worker crashed: " + err.message)));
        callbacks.current.clear();
      };

      // Listen for messages
      workerRef.current.addEventListener('message', (event) => {
        const { type, data, id, embedding, error } = event.data;
        console.log("Main thread received message from worker:", type, data || id || error);

        if (type === 'PROGRESS') {
          setProgressEvent(data);
          if (data.status === 'initiate' || data.status === 'download') {
            setIsDownloading(true);
          } else if (data.status === 'ready') {
            setIsDownloading(false);
            setIsReady(true);
          }
        } else if (type === 'EMBEDDING_RESULT') {
          const cb = callbacks.current.get(id);
          if (cb) {
            cb.resolve(embedding);
            callbacks.current.delete(id);
          }
        } else if (type === 'ERROR') {
          const cb = callbacks.current.get(id);
          if (cb) {
            cb.reject(new Error(error));
            callbacks.current.delete(id);
          }
        } else if (type === 'WORKER_LOADED') {
          console.log("Worker has booted up and is ready to accept messages.");
        }
      });
    }

    return () => {
      // Optional: Cleanup the worker when the component unmounts
      // We generally want to keep it alive to preserve memory, but if we unmount the whole app we can terminate it.
    };
  }, []);

  const generateEmbedding = useCallback(async (text: string): Promise<number[]> => {
    if (!workerRef.current) throw new Error("Worker not initialized");

    return new Promise((resolve, reject) => {
      const id = uuidv4();
      callbacks.current.set(id, { resolve, reject });
      
      workerRef.current!.postMessage({
        type: 'GENERATE_EMBEDDING',
        text,
        id
      });
    });
  }, []);

  const initModel = useCallback(async () => {
    if (!workerRef.current) throw new Error("Worker not initialized");
    workerRef.current.postMessage({ type: 'INIT_MODEL' });
  }, []);

  return {
    generateEmbedding,
    initModel,
    isReady,
    isDownloading,
    progressEvent
  };
}
