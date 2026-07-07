"use client";

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
        const stats = await getVaultStats();
        setVaultStats(stats);

        // Fetch Profile
        const userProfile = await getDecryptedProfile(cryptoKey);
        setProfile(userProfile);
        setIsProfileChecking(false);
      };
      
      fetchDocs();
    }
  }, [cryptoKey, uploadSuccess, activeVault, vaultDb]);

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
    <div className="min-h-screen bg-[#09090b] flex flex-col selection:bg-violet-500/30 font-sans text-zinc-300">
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
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col h-screen"
          >
            {!isProfileChecking && !profile && (
              <IdentitySetup onComplete={() => {
                getDecryptedProfile(cryptoKey!).then(p => setProfile(p));
              }} />
            )}

            {/* Top Navigation */}
            <header className="border-b border-white/5 bg-[#09090b]/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-2xl">
              <div className="flex items-center gap-3 group cursor-pointer">
                <motion.div 
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="w-9 h-9 bg-zinc-950 border border-white/10 text-violet-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-shadow"
                >
                  <ShieldAlert className="w-4 h-4" />
                </motion.div>
                <h1 className="text-xl font-bold text-white tracking-tight text-glow-violet">
                  ZenVault AI
                </h1>
              </div>
              
              <div className="flex items-center gap-4 z-50 relative">
                <VaultSwitcher />
                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
                <UserProfileBadge profile={profile} timeLeftFormatted={timeLeftFormatted} />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={lockVault}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-950/80 hover:bg-zinc-900 px-4 py-2 rounded-lg transition-colors border border-white/5 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Lock Vault</span>
                </motion.button>
              </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden relative">
              {/* Background abstract mesh */}
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
              <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

              {/* Sidebar */}
              <aside className="w-64 border-r border-white/5 bg-zinc-950/30 p-4 hidden md:flex flex-col gap-2 z-10">
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-3 mt-4">Workspace</div>
                
                {[
                  { id: 'chat', icon: TerminalSquare, label: 'Vault Chat' },
                  { id: 'repository', icon: Database, label: 'Document Repository' },
                  { id: 'graph', icon: Network, label: 'Knowledge Graph' },
                  { id: 'keys', icon: Key, label: 'Cryptographic Keys' }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => setActiveView(item.id as any)}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all relative overflow-hidden group",
                        isActive 
                          ? "text-violet-300" 
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabBackground"
                          className="absolute inset-0 bg-violet-500/10 border border-violet-500/20 rounded-xl"
                          initial={false}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <Icon className={cn("w-4 h-4 relative z-10", isActive && "text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]")} />
                      <span className="text-sm font-medium relative z-10">{item.label}</span>
                    </motion.button>
                  );
                })}
              </aside>

              {/* Main Content Area */}
              <main className="flex-1 p-6 md:p-8 h-full overflow-hidden">
                <div className="max-w-6xl mx-auto h-full">
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
                        <div className="flex items-center justify-between mb-6 shrink-0">
                          <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Document Repository</h2>
                            <p className="text-zinc-500 text-sm mt-1">Manage and ingest offline knowledge assets.</p>
                          </div>
                        </div>

                        {/* Top Level Vault Stats */}
                        <div className="shrink-0">
                          <VaultStats metrics={vaultStats} />
                        </div>

                        {/* Bento Grid Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                          
                          {/* Left Column: Data Table & Uploader */}
                          <div className="lg:col-span-2 flex flex-col gap-6 h-full min-h-0">
                            
                            {/* File Uploader Zone */}
                            <div className="glass-card flex-shrink-0 h-48">
                              <FileUploader 
                                onFileProcessed={handleFileProcessed} 
                                isProcessing={isProcessing} 
                                isSuccess={uploadSuccess}
                              />
                            </div>

                            {/* Indexed Documents Table Component */}
                            <div className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden relative">
                              <div className="border-b border-white/5 bg-zinc-950/60 p-4 sticky top-0 z-10">
                                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                  <HardDrive className="w-4 h-4 text-violet-400" />
                                  Indexed Document Vectors
                                </h3>
                              </div>
                              <DocumentList documents={documents} onDocumentClick={setSelectedDoc} />
                            </div>

                          </div>

                          {/* Right Column: AI Engine Monitor */}
                          <div className="lg:col-span-1 flex flex-col h-full gap-6">
                            <div className="glass-card p-6 flex flex-col relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                              
                              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-6">
                                <Cpu className="w-4 h-4 text-emerald-400" />
                                Local Engine Status
                              </h3>
                              
                              <div className="space-y-6">
                                <div>
                                  <div className="flex justify-between text-xs mb-2">
                                    <span className="text-zinc-500">Hardware Acceleration</span>
                                    <span className="text-emerald-400 font-medium">WebGPU: Active</span>
                                  </div>
                                  <div className="flex justify-between text-xs mb-2">
                                    <span className="text-zinc-500">Runtime Environment</span>
                                    <span className="text-zinc-300">Sandboxed Worker</span>
                                  </div>
                                  <div className="flex justify-between text-xs mb-4">
                                    <span className="text-zinc-500">Telemetry</span>
                                    <span className="text-zinc-300">Disabled (0 bytes sent)</span>
                                  </div>
                                </div>

                                <div className="border-t border-white/5 pt-6">
                                  <span className="text-xs text-zinc-500 block mb-3 uppercase tracking-wider font-semibold">Model Pipeline</span>
                                  
                                  {isDownloading ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs text-violet-400">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                        Fetching Transformers...
                                      </div>
                                      <div className="font-mono text-xs text-zinc-400 bg-zinc-950 p-2 rounded-md border border-white/5">
                                        {getProgressString(progressEvent?.progress || 0)}
                                      </div>
                                      <p className="text-[10px] text-zinc-600 truncate">{progressEvent?.file}</p>
                                    </div>
                                  ) : isReady ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        Engine Online & Ready
                                      </div>
                                      <div className="font-mono text-xs text-emerald-500/70 bg-emerald-500/5 p-2 rounded-md border border-emerald-500/10">
                                        [██████████] 100%
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                                        Engine Standby
                                      </div>
                                      <div className="font-mono text-xs text-zinc-600 bg-zinc-950 p-2 rounded-md border border-white/5">
                                        [░░░░░░░░░░] 0%
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Additional Security Card */}
                            <div className="glass-card p-6 flex flex-col relative overflow-hidden flex-1">
                              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-4">
                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                Cryptographic Integrity
                              </h3>
                              <p className="text-xs text-zinc-500 leading-relaxed">
                                All local storage is encrypted using AES-GCM-256. The initialization vector (IV) is randomly generated per document chunk, ensuring semantic security against chosen-plaintext attacks.
                              </p>
                            </div>
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
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
