"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface FileUploaderProps {
  onFileProcessed: (file: File) => void;
  isProcessing: boolean;
  isSuccess?: boolean;
}

export default function FileUploader({ onFileProcessed, isProcessing, isSuccess }: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null);
    if (fileRejections.length > 0) {
      setError(`Unsupported file format or file error: ${fileRejections[0]?.errors?.[0]?.message || 'Unknown error'}`);
      return;
    }
    
    if (acceptedFiles.length > 0) {
      onFileProcessed(acceptedFiles[0]);
    }
  }, [onFileProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/octet-stream': ['.txt', '.md', '.pdf', '.docx'], 
      '': ['.txt', '.md', '.pdf', '.docx', '.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  return (
    <div className="w-full h-full">
      <div 
        {...getRootProps()} 
        className={cn(
          "border-[1.5px] border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[12rem] transition-all relative overflow-hidden duration-300",
          !isProcessing && "cursor-pointer hover:bg-zinc-900/60 hover:border-violet-500/50 hover:scale-[1.01] active:scale-[0.99]",
          isDragActive ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-zinc-950/40",
          isProcessing && "opacity-80 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        
        {/* Animated Background Pulse on Drag Active */}
        {isDragActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 bg-violet-500"
          />
        )}

        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center z-10"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <UploadCloud className="w-5 h-5 text-violet-400 animate-pulse" />
              </div>
              <h3 className="text-zinc-200 font-medium mb-1 tracking-tight">Processing Buffer...</h3>
              <p className="text-xs text-zinc-500">Extracting, chunking, and encrypting locally</p>
            </motion.div>
          ) : isSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center z-10"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </motion.div>
              <h3 className="text-emerald-400 font-medium mb-1 tracking-tight">Vault Secured</h3>
              <p className="text-xs text-emerald-500/70">Knowledge asset encrypted offline.</p>
            </motion.div>
          ) : isDragActive ? (
            <motion.div 
              key="drag-active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center z-10"
            >
              <motion.div 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              >
                <FileText className="w-5 h-5 text-violet-400" />
              </motion.div>
              <h3 className="text-violet-400 font-medium mb-1 tracking-tight">Release to encrypt</h3>
              <p className="text-xs text-violet-400/70">Parsing runs locally via secure file buffers.</p>
            </motion.div>
          ) : (
            <motion.div 
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center group z-10"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <UploadCloud className="w-5 h-5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
              </div>
              <h3 className="text-zinc-200 font-medium mb-1 tracking-tight">Drop your knowledge assets here</h3>
              <p className="text-xs text-zinc-500 max-w-[250px] leading-relaxed">Supports .txt, .md, .pdf, .docx, images (Max 25MB).</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
