"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Fingerprint, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Lightweight Matrix Rain Effect Component
const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const initCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    initCanvas();

    // Authentic Matrix characters: Hex + Katakana
    const chars = '0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    
    // Initialize with random negative values to create distinct, sparse streams
    let drops = Array(columns).fill(0).map(() => Math.random() * -150);

    const draw = () => {
      // Slower fade to create longer, more persistent trails
      ctx.fillStyle = 'rgba(9, 9, 11, 0.08)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Increased intensity (opacity: 60%) for the matrix text
      ctx.fillStyle = 'rgba(72, 161, 17, 0.6)'; 
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        // Only draw the character if the drop is actually on the screen (positive Y)
        if (drops[i] >= 0) {
          const text = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        }

        // Reset to a random negative position to create gaps and pauses between streams
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) {
          drops[i] = Math.random() * -150;
        } else {
          drops[i]++;
        }
      }
    };

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      initCanvas();
      columns = Math.floor(canvas.width / fontSize);
      drops = Array(columns).fill(0).map(() => Math.random() * -150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    // The mask-image creates a smooth radial fade so it doesn't touch the screen edges
    <div className="absolute inset-0 z-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_80%)]">
      <canvas ref={canvasRef} className="w-full h-full block opacity-60" />
    </div>
  );
};

export default function LockScreen() {
  const { unlockVault, unlockVaultBiometric, isFirstSetup, hasBiometrics, isLoading } = useAuth();
  
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'GRANTED'>('IDLE');
  const [error, setError] = useState('');
  
  const [time, setTime] = useState('0000-00-00 00:00:00 LOCAL');
  const [liveHash, setLiveHash] = useState('AWAITING_INPUT...');

  // Live Local Time & Location Clock
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'LOCAL';
    
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      setTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${timeZone.toUpperCase()}`);
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setError('');
    
    if (val.length === 0) {
      setLiveHash('AWAITING_INPUT...');
    } else {
      // Generate a fake hex hash that changes on every keystroke
      const hash = Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16).toUpperCase()).join('');
      setLiveHash(hash);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || status !== 'IDLE') return;
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setStatus('PROCESSING');
    setError('');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    const success = await unlockVault(password);
    
    if (!success) {
      setError('Incorrect password. Vault remains locked.');
      setPassword('');
      setLiveHash('AWAITING_INPUT...');
      setStatus('IDLE');
    } else {
      setStatus('GRANTED');
    }
  };

  const handleBiometricUnlock = async () => {
    setError('');
    setStatus('PROCESSING');
    const success = await unlockVaultBiometric();
    
    if (!success) {
      setError('Biometric unlock failed.');
      setStatus('IDLE');
    } else {
      setStatus('GRANTED');
    }
  };

  const handleReset = () => {
    if (window.confirm("WARNING: This will permanently delete all encrypted data and reset the vault.")) {
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
          <Shield className="w-12 h-12 text-[#48A111] mb-4 drop-shadow-[0_0_10px_rgba(72,161,17,0.5)]" />
          <p className="text-[#48A111] font-mono tracking-widest text-sm uppercase drop-shadow-[0_0_5px_rgba(72,161,17,0.8)]">Initializing Enclave...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#09090b] text-zinc-300 font-mono flex flex-col items-center justify-center selection:bg-amber-500/30 overflow-hidden">
      
      {/* Strict Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Matrix Rain Injection */}
      <MatrixBackground />

      {/* Military-Grade Tactical Scanning Animation */}
      <div className="absolute inset-0 z-0 pointer-events-none hidden sm:block">
        {/* Vertical Radar Scanline */}
        <motion.div
          animate={{ top: ['-20%', '120%'] }}
          transition={{ duration: 10, ease: 'linear', repeat: Infinity }}
          className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-[#48A111]/[0.1] to-transparent border-b border-[#48A111]/[0.4]"
        />
        
        {/* Horizontal Data Sweep */}
        <motion.div
          animate={{ left: ['-50%', '150%'] }}
          transition={{ duration: 15, ease: 'linear', repeat: Infinity }}
          className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#48A111]/[0.1] to-transparent border-r border-[#48A111]/[0.4]"
        />

        {/* Tactical Corner Brackets */}
        <div className="absolute top-8 left-8 w-16 h-16 border-t-[2px] border-l-[2px] border-zinc-700/50" />
        <div className="absolute top-8 right-8 w-16 h-16 border-t-[2px] border-r-[2px] border-zinc-700/50" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-[2px] border-l-[2px] border-zinc-700/50" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-b-[2px] border-r-[2px] border-zinc-700/50" />

        {/* Top-Right Status Cluster */}
        <div className="hidden md:flex absolute top-6 right-6 lg:top-12 lg:right-12 gap-2 z-[60] pointer-events-none">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} className="w-3 h-3 bg-[#48A111]/80" />
          <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} className="w-3 h-3 bg-[#48A111]/80" />
          <div className="w-3 h-3 bg-[#48A111]/20 border border-[#48A111]/60" />
          <motion.div animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }} className="w-3 h-3 bg-[#48A111]/90" />
        </div>

        {/* Bottom-Left Memory/Barcode Blocks */}
        <div className="hidden md:flex absolute bottom-6 left-6 lg:bottom-12 lg:left-12 items-end gap-2 z-[60] pointer-events-none">
          <motion.div animate={{ height: ['2.5rem', '1.5rem', '2.5rem'] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="w-2.5 bg-[#48A111]/50" />
          <motion.div animate={{ height: ['3.5rem', '2rem', '3.5rem'] }} transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }} className="w-2.5 bg-[#48A111]/70" />
          <div className="w-2.5 h-5 bg-[#48A111]/90" />
          <motion.div animate={{ height: ['3rem', '4rem', '3rem'] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} className="w-2.5 bg-[#48A111]/40" />
          <motion.div animate={{ height: ['2rem', '3rem', '2rem'] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} className="w-2.5 bg-[#48A111]/60" />
        </div>

        {/* Top-Left Alignment Lines & Live Telemetry */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 lg:top-12 lg:left-12 flex flex-col gap-2 z-[60] pointer-events-none">
          <motion.div animate={{ width: ['5rem', '6rem', '5rem'] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="h-1.5 bg-[#48A111] drop-shadow-[0_0_5px_rgba(72,161,17,0.8)]" />
          <div className="w-10 h-1.5 bg-[#48A111]/50" />
          <motion.div animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="w-6 h-1.5 bg-[#48A111]/80" />
          <div className="mt-2 text-xs text-[#48A111]/90 tracking-widest font-mono whitespace-nowrap">
            <div>SYS.OP: {status === 'GRANTED' ? 'ONLINE' : 'LOCKED'}</div>
            <div>{time}</div>
          </div>
        </div>

        {/* Bottom-Right Calibration Square */}
        <div className="hidden md:flex absolute bottom-6 right-6 lg:bottom-12 lg:right-12 items-center justify-center w-16 h-16 z-[60] pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 10, ease: "linear", repeat: Infinity }}
            className="absolute inset-0 border-[2px] border-[#48A111]/20"
          >
            <div className="absolute top-0 right-0 w-3 h-3 bg-[#48A111]/80" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-[#48A111]/60" />
          </motion.div>
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }} 
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-4 h-4 bg-[#48A111]/50" 
          />
        </div>
      </div>

      {/* Main Industrial Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 shadow-2xl mx-4"
      >
        {/* Panel Header */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex-1 flex items-center gap-3">
            {/* Mechanical Lock Icon */}
            <div className={`w-8 h-8 flex items-center justify-center border ${status === 'GRANTED' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/50'}`}>
              {status === 'GRANTED' ? (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 tracking-wider">ZENVAULT ENCLAVE</h1>
              <p className="text-[10px] text-zinc-500 tracking-widest mt-0.5">SECURE LOCAL STORAGE</p>
            </div>
          </div>
          <div className="text-[10px] text-zinc-600 border border-zinc-800 px-2 py-1 bg-black">
            AES-256
          </div>
        </div>

        {/* Panel Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Utilitarian Input Field */}
            <div className="relative">
              <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">
                {isFirstSetup ? 'Create Cryptographic Key' : 'Cryptographic Key'}
              </label>
              <div className="relative flex items-center group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-700 group-focus-within:bg-amber-500 transition-colors" />
                <input 
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={status !== 'IDLE'}
                  autoFocus
                  className="w-full bg-[#111114] border border-zinc-800 focus:border-amber-500/50 text-zinc-200 px-4 py-3 pl-5 font-mono text-sm tracking-widest outline-none disabled:opacity-50 transition-colors"
                />
              </div>
              {/* Real-time Hash Visualizer */}
              <div className="mt-2 flex justify-between items-center text-[8px] tracking-widest font-mono">
                <span className="text-zinc-600">BUFFER_HASH:</span>
                <span className={password ? 'text-amber-500/70' : 'text-zinc-700'}>{liveHash}</span>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-400/10 border border-rose-400/20 px-3 py-2">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={status !== 'IDLE' || !password}
                className={`relative w-full border p-3 text-xs uppercase tracking-widest transition-all duration-200 flex justify-center
                  ${status === 'IDLE' && password ? 'border-zinc-500 text-zinc-100 hover:bg-zinc-800' : ''}
                  ${status === 'IDLE' && !password ? 'border-zinc-800 text-zinc-600 cursor-not-allowed' : ''}
                  ${status === 'PROCESSING' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : ''}
                  ${status === 'GRANTED' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : ''}
                `}
              >
                {status === 'IDLE' && <span>{isFirstSetup ? '[ INITIALIZE VAULT ]' : '[ INITIATE DECRYPTION ]'}</span>}
                {status === 'PROCESSING' && <span className="animate-pulse">{isFirstSetup ? '[ ENCRYPTING... ]' : '[ VERIFYING HASH... ]'}</span>}
                {status === 'GRANTED' && <span>[ ACCESS GRANTED ]</span>}
              </button>

              {!isFirstSetup && hasBiometrics && (
                <button
                  type="button"
                  onClick={handleBiometricUnlock}
                  disabled={status !== 'IDLE'}
                  className="relative w-full border border-zinc-800 p-3 text-xs uppercase tracking-widest text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-all duration-200 flex justify-center items-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" /> [ BIOMETRIC BYPASS ]
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Panel Footer / Warning */}
        <div className="bg-[#050505] p-4 border-t border-zinc-800/80 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-[9px] leading-relaxed text-zinc-500 uppercase tracking-widest text-justify">
              <span className="text-amber-500/70 font-bold">WARNING:</span> Decryption occurs in volatile memory. Permanent loss of passphrase results in irretrievable data loss.
            </div>
          </div>
          
          {!isFirstSetup && (
            <button 
              onClick={handleReset}
              type="button"
              className="text-[9px] text-zinc-700 hover:text-rose-500 transition-colors uppercase tracking-widest text-left mt-2 underline decoration-zinc-800 underline-offset-4"
            >
              System Override: Hard Reset Enclave
            </button>
          )}
        </div>
      </motion.div>

      {/* CRT Vignette & Scanline Overlay */}
      <div className="absolute inset-0 z-50 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)] mix-blend-multiply" />
      <div className="absolute inset-0 z-50 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(255,255,255,1)_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
    </div>
  );
}
