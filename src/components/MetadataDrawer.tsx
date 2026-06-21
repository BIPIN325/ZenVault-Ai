import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Database, ShieldCheck, HardDrive, Terminal } from 'lucide-react';
import { getDocumentChunks } from '@/utils/db';

interface MetadataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: any | null; // using any for now, matches enhancedDoc in page.tsx
}

export default function MetadataDrawer({ isOpen, onClose, document }: MetadataDrawerProps) {
  const [sizeStr, setSizeStr] = useState<string>('Calculating...');

  useEffect(() => {
    if (document && isOpen) {
      getDocumentChunks(document.id).then(chunks => {
        const bytes = new Blob([JSON.stringify(chunks)]).size;
        const k = 1024;
        const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(k));
        const formatted = bytes === 0 ? '0 Bytes' : parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
        setSizeStr(formatted);
      }).catch(() => setSizeStr('Unknown'));
    }
  }, [document, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && document && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full max-w-md h-full bg-[#09090b] border-l border-white/10 z-50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-950/80">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-400" />
                Metadata Inspector
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Original File</p>
                    <p className="text-sm text-zinc-200 font-medium truncate" title={document.title}>{document.title}</p>
                    <p className="text-xs text-zinc-600 mt-1">Ingested: {document.createdAt}</p>
                  </div>
                </div>
              </div>

              {/* Security & Size Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Encryption</p>
                  <p className="text-xs text-emerald-500/80 font-medium">AES-GCM-256 Bit</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col items-center justify-center text-center">
                  <HardDrive className="w-6 h-6 text-amber-400 mb-2" />
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Footprint</p>
                  <p className="text-xs text-amber-500/80 font-medium">{sizeStr}</p>
                </div>
              </div>

              {/* Vector Processing Terminal Widget */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Vector Pipeline Status
                </h3>
                
                <div className="rounded-xl bg-zinc-950 border border-white/10 p-4 font-mono text-[11px] sm:text-xs leading-relaxed shadow-inner overflow-hidden relative">
                  {/* Decorative terminal header */}
                  <div className="flex gap-1.5 mb-3 border-b border-white/5 pb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex text-emerald-400">
                      <span className="mr-2 opacity-50">&gt;</span>
                      <span className="typing-effect">Vector Processing Complete</span>
                    </div>
                    <div className="flex text-violet-400">
                      <span className="mr-2 opacity-50">&gt;</span>
                      <span>Total Vectors: {document.chunksCount}</span>
                    </div>
                    <div className="flex text-zinc-400">
                      <span className="mr-2 opacity-50">&gt;</span>
                      <span>Dimensionality: 384</span>
                    </div>
                    <div className="flex text-zinc-400">
                      <span className="mr-2 opacity-50">&gt;</span>
                      <span>Data Type: Float32Array</span>
                    </div>
                    <div className="flex text-zinc-400">
                      <span className="mr-2 opacity-50">&gt;</span>
                      <span>Distance Metric: Cosine Similarity Optimized</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-zinc-950">
              <p className="text-[10px] text-zinc-600 text-center">
                Document ID: {document.id}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
