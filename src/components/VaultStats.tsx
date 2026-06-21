import React from 'react';
import { Database, Shield, HardDrive } from 'lucide-react';
import { VaultMetrics } from '@/utils/telemetry';
import { motion } from 'framer-motion';

export default function VaultStats({ metrics }: { metrics: VaultMetrics | null }) {
  const stats = [
    {
      title: "Total Documents",
      value: metrics ? metrics.totalDocuments : "-",
      icon: Database,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20"
    },
    {
      title: "Total Secure Chunks",
      value: metrics ? metrics.totalChunks : "-",
      icon: Shield,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "Local Storage Size",
      value: metrics ? metrics.storageSizeFormatted : "-",
      icon: HardDrive,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="glass-card p-4 flex items-center gap-4 bg-zinc-950/60 border-white/5"
          >
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${stat.bg}`}>
              <Icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">
                {stat.title}
              </p>
              <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">
                {stat.value}
              </h3>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
