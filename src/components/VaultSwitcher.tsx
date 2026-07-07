"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, Check } from 'lucide-react';
import { useVault, AVAILABLE_VAULTS } from '@/context/VaultContext';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';

export default function VaultSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeVault, switchVault } = useVault();
  const { hasBiometrics, unlockVaultBiometric } = useAuth();
  
  const handleSwitch = async (vaultName: string) => {
    setIsOpen(false);
    if (vaultName === activeVault) return;

    if (hasBiometrics) {
      // Prompt biometric verification before allowing a vault switch
      const success = await unlockVaultBiometric();
      if (success) {
        switchVault(vaultName);
      } else {
        alert("Biometric verification failed. Cannot switch vaults.");
      }
    } else {
      // Fallback switch without biometric if not setup
      switchVault(vaultName);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-white/5 hover:border-violet-500/30 transition-all shadow-sm"
      >
        <Lock className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-sm font-medium text-zinc-200">{activeVault}</span>
        <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-48 right-0 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50"
          >
            <div className="p-1">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-white/5 mb-1">
                Select Vault
              </div>
              {AVAILABLE_VAULTS.map(vault => (
                <button
                  key={vault}
                  onClick={() => handleSwitch(vault)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-zinc-800 transition-colors"
                >
                  <span className={cn("font-medium", activeVault === vault ? "text-violet-400" : "text-zinc-300")}>
                    {vault}
                  </span>
                  {activeVault === vault && <Check className="w-4 h-4 text-violet-400" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
