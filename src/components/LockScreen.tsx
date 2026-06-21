"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

export default function LockScreen() {
  const { unlockVault, isFirstSetup, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const success = await unlockVault(password);
    
    if (!success) {
      setError('Incorrect password. Vault remains locked.');
      setPassword('');
    }
    
    setIsSubmitting(false);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure? This will permanently delete all your encrypted data and reset the vault.")) {
      localStorage.removeItem('vault_salt');
      localStorage.removeItem('vault_validator');
      localStorage.removeItem('vault_iv');
      
      const req = window.indexedDB.deleteDatabase("ZenVault");
      req.onsuccess = () => window.location.reload();
      req.onerror = () => window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="flex flex-col items-center"
        >
          <Shield className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-500 font-medium tracking-widest text-sm uppercase">Initializing Vault</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 selection:bg-violet-500/30 overflow-hidden relative">
      
      {/* Background ambient mesh glow - Cyberpunk Animated */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-violet-600/20 blur-[150px] rounded-full pointer-events-none" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md glass-panel p-8 sm:p-10 rounded-[2rem]"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-zinc-950/80 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
          >
            {isFirstSetup ? (
              <ShieldCheck className="w-8 h-8 text-violet-400" />
            ) : (
              <Lock className="w-8 h-8 text-violet-400" />
            )}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white tracking-tight mb-3 text-glow-violet"
          >
            ZenVault AI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 text-sm leading-relaxed max-w-xs"
          >
            {isFirstSetup 
              ? 'Create a Master Password. This password will never leave your device and is the only way to decrypt your data.'
              : 'Your localized zero-knowledge knowledge base. Fully encrypted. 100% offline.'}
          </motion.p>
        </div>

        <motion.form 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit} 
          className="space-y-4"
        >
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isFirstSetup ? "Create Master Password..." : "Enter Master Password to unlock vault..."}
              className="w-full bg-zinc-950/60 border border-white/10 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
              autoFocus
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-400/10 border border-rose-400/20 px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting || !password}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 animate-bounce" />
                {isFirstSetup ? 'Encrypting...' : 'Decrypting...'}
              </span>
            ) : (
              <>
                {isFirstSetup ? 'Initialize Vault' : 'Unlock Vault'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </motion.form>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col items-center justify-center gap-6"
        >
          <div className="flex gap-2 text-xs text-zinc-500 bg-zinc-950/50 p-3 rounded-lg border border-white/5 leading-relaxed text-center">
            <Shield className="w-4 h-4 shrink-0 text-amber-500/80" />
            <span>
              ⚠️ Security Notice: Passwords are never sent to a server. Losing this password means losing access to your encrypted local assets permanently.
            </span>
          </div>
          
          {!isFirstSetup && (
            <button 
              onClick={handleReset}
              type="button"
              className="text-xs text-zinc-600 hover:text-rose-400 transition-colors underline underline-offset-4"
            >
              Forgot Password? Hard Reset Vault
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
