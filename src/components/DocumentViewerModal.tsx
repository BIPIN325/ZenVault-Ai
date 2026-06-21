"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, FileText, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/context/AuthContext';
import { getDocumentMetadata } from '@/utils/db';
import { decryptData } from '@/utils/crypto';
import { cn } from '@/utils/cn';

interface DocumentViewerModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
}

export default function DocumentViewerModal({ documentId, isOpen, onClose, fileName }: DocumentViewerModalProps) {
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [showClipboardWarning, setShowClipboardWarning] = useState(false);
  const { cryptoKey } = useAuth();

  useEffect(() => {
    if (isOpen && documentId && cryptoKey) {
      setIsLoading(true);
      setError(null);
      setDecryptedText(null);
      setShowClipboardWarning(false); // Reset warning on open

      const fetchAndDecrypt = async () => {
        try {
          const metadata = await getDocumentMetadata(documentId);
          if (!metadata || !metadata.encryptedRawBody || !metadata.rawIv) {
            throw new Error("Encrypted raw document text not found. This document may have been uploaded prior to the Dual-Save pipeline update.");
          }

          const rawText = await decryptData(metadata.encryptedRawBody, metadata.rawIv, cryptoKey);
          setDecryptedText(rawText);
        } catch (err) {
          console.error("Failed to decrypt document", err);
          setError(err instanceof Error ? err.message : "Failed to decrypt document.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchAndDecrypt();
    }
  }, [isOpen, documentId, cryptoKey]);

  const handleCopy = async () => {
    if (decryptedText) {
      await navigator.clipboard.writeText(decryptedText);
      setIsCopied(true);
      setShowClipboardWarning(true);
      
      setTimeout(() => setIsCopied(false), 2000);
      setTimeout(() => setShowClipboardWarning(false), 8000);
    }
  };

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-zinc-950 border border-white/10 w-full h-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex flex-col shrink-0 sticky top-0 z-20">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-100 truncate max-w-xs sm:max-w-sm md:max-w-md">{fileName}</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePrivacyMode}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    isPrivacyMode 
                      ? "bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30" 
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-white/5"
                  )}
                  title={isPrivacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
                >
                  {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="text-sm font-medium hidden sm:inline">Privacy Mode</span>
                </button>

                <div className="w-px h-6 bg-white/10 mx-1" />

                <button
                  onClick={handleCopy}
                  disabled={isLoading || !decryptedText}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm font-medium">Copy</span>
                    </>
                  )}
                </button>
                
                <div className="w-px h-6 bg-white/10 mx-1" />
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20"
                  aria-label="Close Viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Clipboard Warning Banner */}
            <AnimatePresence>
              {showClipboardWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 bg-amber-900/20 border-b border-amber-500/30 text-amber-200 text-sm py-2 px-4 text-center">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>⚠️ Confidential data copied to OS clipboard. Please clear your system clipboard history after use.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-400" />
                <p className="font-medium">Decrypting Document in Memory...</p>
                <p className="text-xs mt-2 text-zinc-600">Running AES-GCM decryption</p>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-400 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20">
                  <X className="w-6 h-6" />
                </div>
                <p className="font-medium">{error}</p>
              </div>
            ) : (
              <div 
                className={cn(
                  "prose prose-invert prose-violet max-w-none prose-headings:font-bold prose-a:text-violet-400 hover:prose-a:text-violet-300 prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10",
                  isPrivacyMode && "blur-md transition-all duration-300 hover:blur-none"
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {decryptedText || ""}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
