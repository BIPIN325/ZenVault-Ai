"use client";

import React, { useState, useRef } from 'react';
import { DownloadCloud, UploadCloud, AlertTriangle, Key, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { exportVault, importVault } from '@/utils/backup';
import DeviceSyncModal from './DeviceSyncModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

export default function SettingsPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setToastMessage(null);
    try {
      // Small artificial delay for UX
      await new Promise(res => setTimeout(res, 500));
      await exportVault();
      setToastMessage({ type: 'success', text: 'Vault exported successfully.' });
    } catch (err) {
      console.error(err);
      setToastMessage({ type: 'error', text: 'Failed to export vault.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    if (window.confirm("WARNING: Restoring a backup will completely overwrite all current local data. Ensure you have the correct Master Password for this backup file. Do you want to proceed?")) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setToastMessage(null);
    try {
      await importVault(file);
      // importVault will trigger window.location.reload() on success
    } catch (err) {
      console.error(err);
      setToastMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to restore backup.' });
      setIsImporting(false);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Key className="w-6 h-6 text-violet-400" />
          Cryptographic Keys & Portability
        </h2>
        <p className="text-zinc-500 text-sm mt-2 max-w-lg leading-relaxed">
          Manage your master key derivatives and your encrypted knowledge base. 
          Use the Escape Hatch to export your local database and restore it securely on any other device.
        </p>
      </div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-xl border flex items-center gap-3 text-sm",
              toastMessage.type === 'success' 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            )}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <p>{toastMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Card */}
        <div className="glass-card p-6 flex flex-col relative overflow-hidden group border border-white/5 bg-zinc-950/60 hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DownloadCloud className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">Export Encrypted Vault</h3>
          </div>
          
          <p className="text-xs text-zinc-500 mb-6 flex-1 leading-relaxed relative z-10">
            Downloads a `.vault` file containing all your heavily encrypted document chunks and initialization vectors. Safe to store anywhere.
          </p>

          <button
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 font-medium rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm relative z-10"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
            {isExporting ? 'Exporting...' : 'Export Backup'}
          </button>
        </div>

        {/* Restore Card */}
        <div className="glass-card p-6 flex flex-col relative overflow-hidden group border border-white/5 bg-zinc-950/60 hover:border-rose-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
          
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">Restore from Backup</h3>
          </div>
          
          <p className="text-xs text-zinc-500 mb-6 flex-1 leading-relaxed relative z-10">
            Overwrites your current local environment with a previously exported `.vault` backup. 
            <span className="text-rose-400/80 block mt-1">Requires the original Master Password.</span>
          </p>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".vault,.json" 
            className="hidden" 
          />

          <button
            onClick={handleImportClick}
            disabled={isExporting || isImporting}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-medium rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm relative z-10"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {isImporting ? 'Restoring...' : 'Restore Backup'}
          </button>
        </div>

        {/* Sync Card */}
        <div className="glass-card p-6 flex flex-col relative overflow-hidden group border border-white/5 bg-zinc-950/60 hover:border-violet-500/30 transition-colors md:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-violet-500/10 transition-colors" />
          
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">P2P Device Sync</h3>
          </div>
          
          <p className="text-xs text-zinc-500 mb-6 flex-1 leading-relaxed relative z-10 max-w-lg">
            Synchronize your encrypted vault directly with another device on the same local network using a 100% serverless WebRTC tunnel.
          </p>

          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="w-full sm:w-auto self-start flex items-center justify-center gap-2 bg-zinc-900 hover:bg-violet-600/20 text-violet-400 hover:text-violet-300 border border-violet-500/30 font-medium rounded-xl px-6 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all shadow-sm relative z-10"
          >
            <RefreshCw className="w-4 h-4" /> Open Sync Manager
          </button>
        </div>

      </div>

      <DeviceSyncModal 
        isOpen={isSyncModalOpen} 
        onClose={() => setIsSyncModalOpen(false)} 
      />
    </div>
  );
}
