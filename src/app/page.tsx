"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import LockScreen from "@/components/LockScreen";
import { LogOut, ShieldAlert, Database, Key, HardDrive, Cpu, TerminalSquare, FileText, Network } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import ChatInterface from "@/components/ChatInterface";
import SettingsPanel from "@/components/SettingsPanel";
import VaultStats from "@/components/VaultStats";
import DocumentList from "@/components/DocumentList";
import MetadataDrawer from "@/components/MetadataDrawer";
import { v4 as uuidv4 } from "uuid";
import { chunkText } from "@/utils/chunker";
import { useVault } from "@/context/VaultContext";
import VaultSwitcher from "@/components/VaultSwitcher";
import KnowledgeGraph3D from "@/components/KnowledgeGraph3D";
import { generateTags } from "@/utils/autoTagger";
import { encryptData } from "@/utils/crypto";
import { useLocalAI } from "@/hooks/useLocalAI";
import { getVaultStats, VaultMetrics } from "@/utils/telemetry";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { getDecryptedProfile, UserProfile } from "@/utils/identity";
import { useInactivityLock } from "@/hooks/useInactivityLock";
import IdentitySetup from "@/components/IdentitySetup";
import UserProfileBadge from "@/components/UserProfileBadge";
import { extractTextFromFile } from "@/utils/omniParser";
import { CyberCard, StatReadout, Icons, DataTicker } from "@/components/TacticalUI";

export default function Home() {
  const { isLocked, lockVault, isLoading, cryptoKey } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'repository' | 'keys' | 'graph'>('repository');
  const { generateEmbedding, initModel, isDownloading, progressEvent, isReady } = useLocalAI();
  const [documents, setDocuments] = useState<any[]>([]);
  const [vaultStats, setVaultStats] = useState<VaultMetrics | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileChecking, setIsProfileChecking] = useState(true);
  const { timeLeftFormatted } = useInactivityLock();
  const { vaultDb, activeVault } = useVault();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isDownloading) {
      setDisplayProgress(prev => Math.max(prev, progressEvent?.progress || 0));
    } else if (isReady) {
      const interval = setInterval(() => {
        setDisplayProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + (100 / (4000 / 50)); // Takes 4s to go from 0 to 100
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setDisplayProgress(0);
    }
  }, [isDownloading, isReady, progressEvent?.progress]);

  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    const messages = [
      "[SYS] Memory optimized.",
      "[SEC] AES-256 Check OK.",
      "[NET] WebRTC Peer connected.",
      "[DATA] Block 4Ax9 processed.",
      "[SYS] Heartbeat signal sent.",
      "[SEC] Key rotation schedule: 14m."
    ];
    let i = 0;
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLogs = [...prev, messages[i % messages.length]];
        if (newLogs.length > 5) newLogs.shift();
        return newLogs;
      });
      i++;
    }, 2500);
    return () => clearInterval(interval);
  }, []);


  // Debug Helper and Initial Fetch
  useEffect(() => {
    if (cryptoKey) {
      const fetchDocs = async () => {
        const docs = await vaultDb.getAllDocuments();
        const chunks = await vaultDb.getAllChunks();
        const chunkCounts: Record<string, number> = {};
        
        chunks.forEach((chunk) => {
          if (chunk && chunk.documentId) {
            chunkCounts[chunk.documentId] = (chunkCounts[chunk.documentId] || 0) + 1;
          }
        });
        
        const enhancedDocs = docs.map(d => ({
          id: d.id,
          title: d.title,
          chunksCount: chunkCounts[d.id] || 0,
          createdAt: new Date(d.createdAt).toLocaleString()
        }));
        setDocuments(enhancedDocs);

        // Fetch Vault Stats
        const stats = await getVaultStats(vaultDb);
        setVaultStats(stats);

        // Fetch Profile
        const userProfile = await getDecryptedProfile(cryptoKey);
        setProfile(userProfile);
        setIsProfileChecking(false);
      };
      
      fetchDocs();
    }
  }, [cryptoKey, uploadSuccess, activeVault, vaultDb, refreshTrigger]);

  // Auto-initialize the model when there is at least one document
  useEffect(() => {
    if (documents.length > 0 && !isReady && !isDownloading) {
      initModel().catch(console.error);
    }
  }, [documents.length, isReady, isDownloading, initModel]);

  const handleFileProcessed = async (file: File) => {
    if (!cryptoKey) return;
    setIsProcessing(true);
    setUploadSuccess(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const text = await extractTextFromFile(file);

      const chunks = chunkText(text, 500, 100);
      const docId = uuidv4();
      
      const { ciphertext: encryptedRawBody, iv: rawIv } = await encryptData(text, cryptoKey);
      
      const tags = await generateTags(text);

      await vaultDb.saveDocumentMetadata({
        id: docId,
        title: file.name,
        createdAt: Date.now(),
        encryptedRawBody,
        rawIv,
        tags
      });

      for (let i = 0; i < chunks.length; i++) {
        const vector = await generateEmbedding(chunks[i]);
        const payload = JSON.stringify({ text: chunks[i], vector });
        const { ciphertext, iv } = await encryptData(payload, cryptoKey);
        
        await vaultDb.saveEncryptedChunk({
          id: uuidv4(),
          documentId: docId,
          ciphertext,
          iv,
          chunkIndex: i,
        });
      }
      setUploadSuccess(true);
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error processing file:", error);
      alert(`Failed to parse document: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getProgressString = (progress: number) => {
    const totalBlocks = 10;
    const filledBlocks = Math.round((progress / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${Math.round(progress)}%`;
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#09090b]" />;
  }

  return (
    <div className="flex h-screen bg-[#030304] text-zinc-300 font-sans overflow-hidden selection:bg-[#3A8C1F]/40 relative">
      
      {/* --- Ambient Background Effects --- */}
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(to right, #3A8C1F 1px, transparent 1px), linear-gradient(to bottom, #3A8C1F 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(circle at top right, black, transparent 70%)' }}
      />
      {/* CRT Vignette, Blur, & Scanline Overlay (Matching Login Page) */}
      <div className="absolute inset-0 z-0 pointer-events-none backdrop-blur-sm bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)] mix-blend-multiply" />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
      {/* Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#3A8C1F] blur-[150px] opacity-10 rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-emerald-700 blur-[150px] opacity-[0.08] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />

      <AnimatePresence mode="wait">
        {isLocked ? (
          <motion.div
            key="lock-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-[#09090b]"
          >
            <LockScreen />
          </motion.div>
        ) : (
          <>
            {!isProfileChecking && !profile && (
              <IdentitySetup onComplete={() => {
                getDecryptedProfile(cryptoKey!).then(p => setProfile(p));
              }} />
            )}
            
            {/* --- Sidebar --- */}
            <aside className="relative z-20 w-72 border-r border-zinc-800/60 bg-[#070709]/80 backdrop-blur-2xl flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] shrink-0">
              {/* Logo Area */}
              <div className="h-24 flex items-center px-8 gap-4 border-b border-zinc-800/60 shrink-0 group cursor-pointer">
                <div className="relative w-10 h-10 transition-transform group-hover:scale-105">
                  <Image 
                    src="/favicon-96x96.png" 
                    alt="ZenVault AI Logo" 
                    fill
                    className="object-contain drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" 
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-[0.15em] text-[#4AB022] group-hover:text-[#3A8C1F] transition-colors">ZENVAULT</span>
                  <span className="text-[9px] font-mono text-[#3A8C1F]/70 tracking-widest uppercase">Secure Enclave v3.1</span>
                </div>
              </div>

              {/* Nav Links */}
              <div className="flex-1 py-8 px-5 flex flex-col gap-3 overflow-y-auto">
                <div className="text-[10px] text-zinc-600 font-mono tracking-[0.2em] px-3 mb-3 uppercase">Workspace</div>
                {[
                  { id: 'chat', icon: <Icons.Chat />, label: 'Vault Chat' },
                  { id: 'repository', icon: <Icons.Repo />, label: 'Document Repository' },
                  { id: 'graph', icon: <Icons.Graph />, label: 'Knowledge Graph' },
                  { id: 'keys', icon: <Icons.Key />, label: 'Cryptographic Keys' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id as any)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl text-sm transition-all duration-300 relative overflow-hidden group
                      ${activeView === item.id ? 'bg-gradient-to-r from-[#3A8C1F]/20 to-transparent border border-[#3A8C1F]/30 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 border border-transparent'}
                    `}
                  >
                    {activeView === item.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3A8C1F] shadow-[0_0_15px_#3A8C1F]" />
                    )}
                    <span className={`transition-colors ${activeView === item.id ? 'text-[#4AB022]' : 'text-zinc-500 group-hover:text-[#3A8C1F]'}`}>
                      {item.icon}
                    </span>
                    <span className="font-medium tracking-wide">{item.label}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* --- Main Content Area --- */}
            <main className="flex-1 flex flex-col relative z-10 h-screen overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#3A8C1F]/30 scrollbar-track-transparent">
              
              {/* Top Navbar */}
              <header className="h-24 flex items-center justify-between px-10 border-b border-zinc-800/60 bg-[#070709]/60 backdrop-blur-xl sticky top-0 z-30 shrink-0">
                
                {/* Decorative Breadcrumb/Ticker */}
                <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 bg-black/40 px-4 py-2 rounded-lg border border-zinc-800/50">
                  <span className="animate-pulse w-2 h-2 bg-[#3A8C1F] rounded-full" />
                  <span>SESSION_HASH:</span>
                  <DataTicker />
                </div>
                
                <div className="flex items-center gap-6">
                  {/* Context Selector */}
                  <div className="flex items-center">
                    <VaultSwitcher />
                  </div>

                  <div className="w-px h-10 bg-zinc-800/80" />

                  {/* Profile */}
                  <UserProfileBadge profile={profile} timeLeftFormatted={timeLeftFormatted} />

                  {/* Auto Lock Timer */}
                  <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 px-4 py-2 rounded-lg">
                    <div className="text-red-500"><Icons.Lock /></div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-red-500/70 font-mono tracking-widest uppercase">Auto-Lock</span>
                      <span className="text-xs text-red-400 font-mono font-bold">{timeLeftFormatted}</span>
                    </div>
                  </div>

                  {/* Lock Button (Premium styling) */}
                  <button onClick={lockVault} className="flex items-center gap-3 text-sm text-red-400/90 border border-red-500/30 bg-red-500/5 px-6 py-3 rounded-xl hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300 transition-all font-medium tracking-wide ml-4">
                    <Icons.Lock /> Secure Lock
                  </button>
                </div>
              </header>

              {/* Dashboard Content */}
              <div className="p-10 max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
                <AnimatePresence mode="wait">
                  
                  {activeView === 'repository' && (
                    <motion.div 
                      key="repository"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="h-full flex flex-col min-h-0"
                    >
                      <div className="mb-10 flex justify-between items-end shrink-0">
                        <div>
                          <h1 className="text-3xl font-bold text-white tracking-tight">Document Repository</h1>
                          <p className="text-zinc-400 text-sm mt-2 font-medium">Manage and ingest encrypted knowledge assets locally.</p>
                        </div>
                      </div>

                      {/* Main Grid */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 min-h-0">
                        
                        {/* Left Column (Stats & Dropzone & DB) */}
                        <div className="xl:col-span-2 flex flex-col gap-8 h-full min-h-0">
                          
                          {/* Top Stats Row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 shrink-0">
                            <CyberCard noPad>
                              <div className="px-4 py-3">
                                <StatReadout title="Indexed Docs" value={vaultStats?.totalDocuments || 0} icon={<Icons.Database />} />
                              </div>
                            </CyberCard>
                            <CyberCard noPad>
                              <div className="px-4 py-3">
                                <StatReadout title="Secure Chunks" value={vaultStats?.totalChunks || 0} icon={<Icons.Shield />} />
                              </div>
                            </CyberCard>
                            <CyberCard noPad>
                              <div className="px-4 py-3">
                                <StatReadout title="Vault Size" value={vaultStats?.totalStorageSize ? (vaultStats.totalStorageSize / 1024 / 1024).toFixed(2) + ' MB' : '0 Bytes'} icon={<Icons.HardDrive />} />
                              </div>
                            </CyberCard>
                          </div>

                          {/* Premium Dropzone */}
                          <div className="shrink-0">
                            <FileUploader 
                              onFileProcessed={handleFileProcessed} 
                              isProcessing={isProcessing} 
                              isSuccess={uploadSuccess}
                            />
                          </div>

                          {/* Document Vectors */}
                          <CyberCard title="Indexed Vector DB" className="flex-1 min-h-[350px]" noPad>
                            <DocumentList 
                              documents={documents} 
                              onDocumentClick={setSelectedDoc} 
                              onDocumentDeleted={() => setRefreshTrigger(prev => prev + 1)}
                            />
                          </CyberCard>
                        </div>

                        {/* Right Column (Telemetry & Status) */}
                        <div className="xl:col-span-1 flex flex-col gap-8 h-full overflow-y-auto">
                          
                          {/* Engine Status */}
                          <CyberCard title="Local Engine Telemetry">
                            <div className="flex flex-col gap-5 font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                              <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                                <span>HW_Accel</span>
                                <span className="text-[#4AB022] flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#4AB022] rounded-full animate-pulse"/> WebGPU Active</span>
                              </div>
                              <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                                <span>Runtime</span>
                                <span className="text-white">Sandboxed</span>
                              </div>
                              <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                                <span>Telemetry</span>
                                <span className="text-red-400">Disabled (0B)</span>
                              </div>
                            </div>

                            <div className="mt-10">
                              <div className="flex justify-between items-center mb-3 uppercase tracking-widest font-mono text-[10px]">
                                <span className="text-[#3A8C1F]">Model Pipeline</span>
                                <span className={(isDownloading || displayProgress > 0) ? "text-[#3A8C1F]" : "text-zinc-500"}>
                                  {isDownloading || (isReady && displayProgress < 100) 
                                    ? `${Math.round(displayProgress)}% // PROCESSING` 
                                    : isReady ? '100% // ONLINE' : '0% // STANDBY'}
                                </span>
                              </div>
                              
                              {/* The Slicer Bar Container */}
                              <div className="flex gap-1 h-8 w-full items-center">
                                {[...Array(12)].map((_, i) => {
                                  const progress = displayProgress;
                                  const activeSlices = Math.floor((progress / 100) * 12);
                                  const isActive = i < activeSlices;
                                  return (
                                    <div 
                                      key={i} 
                                      className={`flex-1 h-full skew-x-[-20deg] transition-all duration-300 ease-in-out border border-[#3A8C1F]/20 ${
                                        isActive 
                                          ? 'bg-[#3A8C1F] shadow-[0_0_15px_#3A8C1F]' 
                                          : 'bg-[#1a2512]'
                                      }`}
                                    />
                                  );
                                })}
                              </div>
                              {(isDownloading || (!isReady && displayProgress > 0)) && (
                                <p className="text-[9px] font-mono text-zinc-600 truncate mt-2">{progressEvent?.file}</p>
                              )}
                            </div>
                          </CyberCard>

                          {/* Cryptographic Integrity */}
                          <CyberCard title="Crypto Security">
                            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg mb-5">
                               <p className="text-[11px] font-mono text-zinc-400 leading-relaxed text-justify">
                                 Local storage is encrypted via <span className="text-white font-bold">AES-GCM-256</span>. IV is randomly generated per chunk preventing statistical decryption attacks.
                               </p>
                            </div>
                            <button className="mt-auto w-full bg-[#0c0c0e] border border-zinc-700/80 hover:border-[#3A8C1F] hover:bg-[#3A8C1F]/10 text-zinc-300 hover:text-[#4AB022] text-xs font-semibold tracking-wide py-3.5 rounded-xl transition-all shadow-sm">
                              Access Security Logs
                            </button>
                          </CyberCard>

                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeView === 'chat' && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="h-full"
                    >
                      <ChatInterface 
                        isAiReady={isReady} 
                        generateEmbedding={generateEmbedding} 
                        hasDocuments={documents.length > 0} 
                      />
                    </motion.div>
                  )}

                  {activeView === 'keys' && (
                    <motion.div
                      key="keys"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="h-full pt-4"
                    >
                      <SettingsPanel />
                    </motion.div>
                  )}

                  {activeView === 'graph' && (
                    <motion.div
                      key="graph"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="h-full pt-4"
                    >
                      <KnowledgeGraph3D onNodeClick={(id) => {
                        const doc = documents.find(d => d.id === id);
                        if (doc) setSelectedDoc(doc);
                      }} />
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </main>
            
            {/* Slide-over Drawer */}
            <MetadataDrawer 
              isOpen={!!selectedDoc} 
              onClose={() => setSelectedDoc(null)} 
              document={selectedDoc} 
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
