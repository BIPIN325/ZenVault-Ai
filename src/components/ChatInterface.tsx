"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileText, Database, Shield, TerminalSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAllChunks, getDocumentMetadata } from '@/utils/db';
import { decryptData } from '@/utils/crypto';
import { cosineSimilarity } from '@/utils/similarity';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { title: string; chunkIndex: number; score: number }[];
}

interface ChatInterfaceProps {
  isAiReady: boolean;
  generateEmbedding: (text: string) => Promise<number[]>;
  hasDocuments: boolean;
}

export default function ChatInterface({ isAiReady, generateEmbedding, hasDocuments }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { cryptoKey } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !cryptoKey || !isAiReady || isLoading) return;

    const query = input.trim();
    setInput('');
    setIsLoading(true);
    setStatusText('Generating query embedding...');

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);

    try {
      const queryVector = await generateEmbedding(query);

      setStatusText('Searching secure vault...');
      const allChunks = await getAllChunks();
      
      const scoredChunks: { score: number; text: string; documentId: string; chunkIndex: number }[] = [];

      for (const chunk of allChunks) {
        try {
          const decryptedPayload = await decryptData(chunk.ciphertext, chunk.iv, cryptoKey);
          const payload = JSON.parse(decryptedPayload);
          
          if (payload.vector && payload.text) {
            const score = cosineSimilarity(queryVector, payload.vector);
            scoredChunks.push({
              score,
              text: payload.text,
              documentId: chunk.documentId,
              chunkIndex: chunk.chunkIndex
            });
          }
        } catch (err) {
          console.error("Failed to decrypt a chunk", err);
        }
      }

      scoredChunks.sort((a, b) => b.score - a.score);
      const topChunks = scoredChunks.slice(0, 3);

      setStatusText('Preparing prompt context...');
      const citations: { title: string; chunkIndex: number; score: number }[] = [];
      const contextBlocks: string[] = [];
      const seenText = new Set<string>();

      for (const chunk of topChunks) {
        if (chunk.score > 0.2 && !seenText.has(chunk.text)) {
          seenText.add(chunk.text);
          const meta = await getDocumentMetadata(chunk.documentId);
          const title = meta?.title || 'Unknown Document';
          citations.push({ title, chunkIndex: chunk.chunkIndex, score: chunk.score });
          contextBlocks.push(`[Source: ${title}]\n${chunk.text}`);
        }
      }

      const contextText = contextBlocks.join('\n\n');
      
      const prompt = `You are ZenVault AI, a highly secure, privacy-focused assistant. 
Answer the user's question using ONLY the provided context. If the answer is not contained in the context, say "I cannot answer this based on the provided documents."

Context:
${contextText}

Question: ${query}`;

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev, 
        { id: assistantMessageId, role: 'assistant', content: '', citations }
      ]);
      setStatusText('Generating response...');

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: prompt,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to local Ollama instance.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        setStatusText('');
        let done = false;
        let buffer = '';
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: msg.content + parsed.response }
                      : msg
                  ));
                }
              } catch (e) {
                console.error("Failed to parse JSON stream chunk:", line, e);
              }
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: 'An error occurred while generating the response. Please ensure Ollama is running locally on port 11434 with the llama3 model.' 
        }
      ]);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="flex flex-col h-full glass-card rounded-3xl overflow-hidden relative border border-white/5 bg-zinc-950/60 shadow-2xl">
      
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-950/80 p-4 flex items-center gap-3 backdrop-blur-xl relative z-10 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)]">
          <TerminalSquare className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h2 className="text-zinc-100 font-medium leading-none tracking-tight">Secure AI Sandbox</h2>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500/70" /> 100% Offline Processing
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 relative z-10 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-zinc-500 max-w-md mx-auto text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">Chat with your Secure Vault</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Ask questions regarding your local indexed corpus. AI processing runs completely on-device inside a secure sandboxed environment.
              </p>
            </motion.div>
          ) : (
            messages.map((msg, index) => (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}
              >
                
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg border",
                  msg.role === 'user' ? "bg-zinc-800 border-white/10" : "bg-violet-500/10 border-violet-500/20 text-violet-400"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={cn("max-w-[85%] flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "p-4 rounded-2xl shadow-md text-sm",
                    msg.role === 'user' 
                      ? "bg-violet-600 text-white rounded-tr-sm" 
                      : "bg-zinc-900/60 border border-white/5 text-zinc-200 rounded-tl-sm leading-relaxed"
                  )}>
                    {msg.content || <span className="animate-pulse">...</span>}
                  </div>
                  
                  {/* Citations */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: 0.2 }}
                      className="mt-3 space-y-2 w-full"
                    >
                      {msg.citations.map((cite, idx) => (
                        <motion.div 
                          key={idx}
                          whileHover={{ scale: 1.01, backgroundColor: "rgba(39,39,42,0.6)" }}
                          className="bg-zinc-950/80 border border-white/5 rounded-lg p-2.5 flex items-center gap-3 text-xs group transition-colors shadow-sm cursor-default"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-600 shrink-0 group-hover:text-violet-400 transition-colors" />
                          <div className="flex-1 font-mono text-zinc-400 truncate">
                            <span className="text-zinc-300">📄 {cite.title}</span> - Chunk #{cite.chunkIndex} <span className="text-zinc-600 mx-1">|</span> <span className="text-emerald-500/70">Similarity: {(cite.score * 100).toFixed(1)}%</span>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-zinc-950/80 backdrop-blur-xl relative z-10 shrink-0">
        <AnimatePresence>
          {statusText && (
            <motion.div 
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-xs text-violet-400 mb-3 px-2 font-medium"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              {statusText}
            </motion.div>
          )}
        </AnimatePresence>
        
        <form onSubmit={handleSubmit} className="relative flex items-center group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/50 to-emerald-500/50 rounded-xl blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || !isAiReady || !hasDocuments}
            placeholder={!hasDocuments ? "Upload a document to activate Secure AI Sandbox..." : isAiReady ? "Query your data repository locally..." : "Initializing AI Engine..."}
            className="w-full relative bg-zinc-900 border border-white/10 text-white rounded-xl py-4 pl-4 pr-14 focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !isAiReady || !hasDocuments}
            className="absolute right-2 w-10 h-10 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </button>
        </form>
      </div>

    </div>
  );
}
