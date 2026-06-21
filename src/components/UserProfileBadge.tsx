import React from 'react';
import { User, ShieldCheck, Lock } from 'lucide-react';
import { UserProfile } from '@/utils/identity';
import { motion } from 'framer-motion';

interface UserProfileBadgeProps {
  profile: UserProfile | null;
  timeLeftFormatted: string;
}

export default function UserProfileBadge({ profile, timeLeftFormatted }: UserProfileBadgeProps) {
  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden md:flex items-center gap-4 bg-zinc-950/60 border border-white/5 rounded-2xl p-2 pr-4 shadow-sm backdrop-blur-md"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 flex items-center justify-center">
        {profile.avatarBase64 ? (
          <img src={profile.avatarBase64} alt={profile.name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-5 h-5 text-zinc-500" />
        )}
      </div>

      <div className="flex flex-col justify-center">
        {/* Name */}
        <p className="text-xs font-semibold text-zinc-200 truncate max-w-[150px]">
          {profile.name}
        </p>
        
        {/* Status */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium tracking-wide truncate max-w-[150px]" title="Encrypted Vault Session Verified">
            Session Verified
          </span>
        </div>
      </div>

      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Auto-lock countdown */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Auto-Lock</span>
          <span className="text-xs font-mono text-zinc-300">{timeLeftFormatted}</span>
        </div>
      </div>
    </motion.div>
  );
}
