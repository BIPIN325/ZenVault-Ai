import React, { useState, useEffect } from 'react';

export const CyberCard = ({ children, title, className = "", noPad = false }: { children: React.ReactNode, title?: string, className?: string, noPad?: boolean }) => (
  <div className={`relative bg-[#0c0c0e]/60 backdrop-blur-xl border border-zinc-800/60 rounded-xl hover:border-[#48A111]/80 hover:shadow-[0_0_30px_rgba(72,161,17,0.15)] hover:bg-[#0c0c0e]/80 transition-all duration-500 overflow-hidden flex flex-col group ${className}`}>
    
    {/* Animated Gradient Top Border */}
    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#48A111]/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
    
    {/* Sci-Fi Corner Brackets */}
    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#48A111]/30 group-hover:border-[#48A111] transition-colors" />
    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#48A111]/30 group-hover:border-[#48A111] transition-colors" />
    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#48A111]/30 group-hover:border-[#48A111] transition-colors" />
    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#48A111]/30 group-hover:border-[#48A111] transition-colors" />

    {title && (
      <div className="px-5 py-4 border-b border-zinc-800/40 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-sm bg-[#48A111] animate-pulse shadow-[0_0_8px_#48A111]" />
          <h3 className="text-zinc-200 text-sm font-semibold tracking-widest uppercase">{title}</h3>
        </div>
        <div className="text-[9px] text-[#48A111]/50 font-mono tracking-widest hidden sm:block">SYS.NODE_ACTIVE</div>
      </div>
    )}
    <div className={`flex-1 flex flex-col relative z-10 ${noPad ? '' : 'p-6'}`}>
      {children}
    </div>
  </div>
);

export const StatReadout = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
  <div className="flex items-center gap-4">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#48A111]/20 to-transparent border border-[#48A111]/40 flex items-center justify-center text-[#5cd61e] shadow-[inset_0_0_15px_rgba(72,161,17,0.1)] group-hover:shadow-[inset_0_0_25px_rgba(72,161,17,0.3)] transition-all">
      {icon}
    </div>
    <div>
      <div className="text-[9px] text-[#48A111] font-mono tracking-[0.2em] uppercase mb-0.5 opacity-80">{title}</div>
      <div className="text-2xl text-white font-bold tracking-tight">{value}</div>
    </div>
  </div>
);

// Animated Random Data Ticker
export const DataTicker = () => {
  const [data, setData] = useState("0x00000000");
  useEffect(() => {
    const interval = setInterval(() => {
      setData("0x" + Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(8, '0'));
    }, 150);
    return () => clearInterval(interval);
  }, []);
  return <span className="font-mono text-[#48A111]">{data}</span>;
};

// --- Icons (Minimal Inline SVGs) ---
export const Icons = {
  Shield: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Chat: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Repo: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>,
  Graph: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98m-.01-10.98l-6.82 3.98"/></svg>,
  Key: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  Upload: () => <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7l-5-5-5 5m5-5v12"/></svg>,
  Database: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  HardDrive: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 12H2m20 0a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2m20 0a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2m4-8h.01M6 16h.01"/></svg>,
  Lock: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  User: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
};
