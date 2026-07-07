"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Laptop, Loader2, Copy, CheckCircle2, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { PeerSyncManager } from '@/utils/webrtcSync';
import { cn } from '@/utils/cn';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeviceSyncModal({ isOpen, onClose }: DeviceSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'host' | 'client'>('host');
  const [syncManager, setSyncManager] = useState<PeerSyncManager | null>(null);
  
  const [status, setStatus] = useState<string>('Disconnected');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  const [syncToken, setSyncToken] = useState<string>('');
  const [connectionToken, setConnectionToken] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<'sync' | 'conn' | null>(null);
  
  const [inputToken, setInputToken] = useState('');

  const { vaultDb } = useVault();

  useEffect(() => {
    if (isOpen) {
      const manager = new PeerSyncManager(vaultDb);
      
      manager.onStatusChange = (s) => setStatus(s);
      manager.onError = (e) => setError(e);
      manager.onSyncProgress = (p) => setProgress(p);
      manager.onSyncComplete = () => {
        setStatus('Sync Complete');
        setTimeout(() => onClose(), 2000); // Close automatically after success
      };
      
      setSyncManager(manager);
    } else {
      if (syncManager) {
        syncManager.disconnect();
      }
      // Reset state
      setSyncManager(null);
      setStatus('Disconnected');
      setError(null);
      setProgress(0);
      setSyncToken('');
      setConnectionToken('');
      setInputToken('');
    }
    
    return () => {
      if (syncManager) syncManager.disconnect();
    };
  }, [isOpen, vaultDb]);

  const handleCopy = (text: string, type: 'sync' | 'conn') => {
    navigator.clipboard.writeText(text);
    setCopiedToken(type);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // HOST ACTIONS
  const generateSyncToken = async () => {
    if (!syncManager) return;
    setError(null);
    try {
      const token = await syncManager.createOffer();
      setSyncToken(token);
    } catch (e) {
      setError('Failed to generate Sync Token.');
    }
  };

  const finalizeConnection = async () => {
    if (!syncManager || !inputToken.trim()) return;
    try {
      await syncManager.finalizeConnection(inputToken.trim());
      // Connection should establish shortly, after which we can push data
      setTimeout(() => {
        syncManager.sendVaultData();
      }, 1000);
    } catch (e) {
      setError('Failed to finalize connection.');
    }
  };

  // CLIENT ACTIONS
  const acceptSyncToken = async () => {
    if (!syncManager || !inputToken.trim()) return;
    setError(null);
    try {
      const token = await syncManager.acceptOffer(inputToken.trim());
      setConnectionToken(token);
    } catch (e) {
      setError('Failed to parse Sync Token.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Header */}
        <div className="border-b border-white/5 p-6 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-violet-400" />
              P2P Device Sync
            </h2>
            <p className="text-zinc-500 text-xs mt-1">100% Serverless WebRTC Transfer</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-zinc-900/50 relative z-10">
          <button
            onClick={() => { setActiveTab('host'); setInputToken(''); }}
            className={cn(
              "flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative",
              activeTab === 'host' ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Laptop className="w-4 h-4" />
            Host Device (Send)
            {activeTab === 'host' && (
              <motion.div layoutId="sync-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
            )}
          </button>
          <button
            onClick={() => { setActiveTab('client'); setInputToken(''); }}
            className={cn(
              "flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative",
              activeTab === 'client' ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Smartphone className="w-4 h-4" />
            Client Device (Receive)
            {activeTab === 'client' && (
              <motion.div layoutId="sync-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
            )}
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-zinc-900/80 border-b border-white/5 px-6 py-3 flex items-center justify-between text-xs font-mono relative z-10">
          <div className="flex items-center gap-2 text-zinc-400">
            {status === 'Disconnected' ? <div className="w-2 h-2 rounded-full bg-zinc-600" /> :
             status.includes('Connected') || status.includes('Complete') ? <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> :
             <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />}
            Status: <span className="text-zinc-200">{status}</span>
          </div>
          {progress > 0 && progress < 100 && (
            <div className="text-violet-400 font-bold">{progress}%</div>
          )}
        </div>

        {/* Progress Bar (Visual) */}
        {progress > 0 && progress < 100 && (
          <div className="h-1 w-full bg-zinc-900 relative z-10">
            <motion.div 
              className="h-full bg-violet-500" 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 relative z-10 custom-scrollbar overflow-y-auto max-h-[60vh]">
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-3 text-sm"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'host' && (
            <motion.div
              key="host-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-xs border border-white/10">1</div>
                  Generate Sync Token
                </h3>
                <p className="text-xs text-zinc-500">Create a WebRTC connection offer to share with your secondary device.</p>
                
                {!syncToken ? (
                  <button 
                    onClick={generateSyncToken}
                    className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  >
                    Generate Token
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 relative group">
                      <div className="text-xs font-mono text-zinc-400 break-all max-h-24 overflow-y-auto custom-scrollbar pr-8 select-all">
                        {syncToken}
                      </div>
                      <button 
                        onClick={() => handleCopy(syncToken, 'sync')}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                      >
                        {copiedToken === 'sync' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    <div className="flex justify-center bg-white p-4 rounded-xl w-max mx-auto">
                      <QRCodeSVG value={syncToken} size={150} level="L" />
                    </div>
                  </div>
                )}
              </div>

              {syncToken && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 p-5 rounded-xl border border-white/5 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-xs border border-white/10">2</div>
                    Finalize Connection
                  </h3>
                  <p className="text-xs text-zinc-500">Paste the "Connection Token" generated by the client device to establish the tunnel and begin the sync.</p>
                  
                  <textarea 
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    placeholder="Paste Connection Token here..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-violet-500/50 min-h-[80px]"
                  />
                  <button 
                    onClick={finalizeConnection}
                    disabled={!inputToken.trim() || status === 'Connected'}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Send className="w-4 h-4" /> Finalize & Push Data
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'client' && (
            <motion.div
              key="client-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
               <div className="bg-zinc-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-xs border border-white/10">1</div>
                  Accept Sync Token
                </h3>
                <p className="text-xs text-zinc-500">Paste the "Sync Token" generated by the Host device (or scan their QR code if using a mobile browser).</p>
                
                <textarea 
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  disabled={!!connectionToken}
                  placeholder="Paste Sync Token here..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-violet-500/50 min-h-[120px]"
                />
                
                {!connectionToken && (
                  <button 
                    onClick={acceptSyncToken}
                    disabled={!inputToken.trim()}
                    className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  >
                    Accept Token
                  </button>
                )}
              </div>

              {connectionToken && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 p-5 rounded-xl border border-white/5 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs border border-emerald-500/30">2</div>
                    Share Connection Token
                  </h3>
                  <p className="text-xs text-zinc-500">Copy this Connection Token and paste it back into the Host device to establish the tunnel.</p>
                  
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 relative group">
                    <div className="text-xs font-mono text-zinc-400 break-all max-h-24 overflow-y-auto custom-scrollbar pr-8 select-all">
                      {connectionToken}
                    </div>
                    <button 
                      onClick={() => handleCopy(connectionToken, 'conn')}
                      className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                    >
                      {copiedToken === 'conn' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <div className="flex justify-center bg-white p-4 rounded-xl w-max mx-auto">
                    <QRCodeSVG value={connectionToken} size={150} level="L" />
                  </div>
                  
                  <div className="mt-4 text-center text-xs text-emerald-400/80 animate-pulse flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Waiting for Host to finalize...
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
