"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Upload, User, ArrowRight, Loader2 } from 'lucide-react';
import { saveEncryptedProfile } from '@/utils/identity';
import { useAuth } from '@/context/AuthContext';

interface IdentitySetupProps {
  onComplete: () => void;
}

export default function IdentitySetup({ onComplete }: IdentitySetupProps) {
  const [name, setName] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { cryptoKey } = useAuth();

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cryptoKey) return;

    setIsSubmitting(true);
    try {
      await saveEncryptedProfile(name.trim(), avatarBase64, cryptoKey);
      onComplete();
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[40px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="relative z-10 text-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Shield className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Identity Initialization</h2>
          <p className="text-zinc-500 text-sm mt-2">
            Establish your offline alias. This profile is AES-encrypted and never leaves your device.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden transition-all hover:border-violet-500/50"
            >
              {avatarBase64 ? (
                <img src={avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-zinc-600 group-hover:text-violet-400 transition-colors" />
              )}
              
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-5 h-5 text-white" />
              </div>
            </button>
            <span className="text-xs text-zinc-500 mt-2 font-medium uppercase tracking-wider">
              {avatarBase64 ? 'Change Avatar' : 'Upload Avatar (Optional)'}
            </span>
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor="alias" className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Secure Alias
            </label>
            <input
              id="alias"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Satoshi Nakamoto"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Initialize Vault Profile
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
