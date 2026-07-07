"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Network, RefreshCw, ZoomIn, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useVault } from '@/context/VaultContext';
import { buildGraphData, GraphData, GraphNode } from '@/utils/graphBuilder';
import { getColorForTag } from '@/utils/autoTagger';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamically import ForceGraph3D to avoid SSR issues with Three.js
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950/80">
      <div className="flex flex-col items-center gap-4 text-violet-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="text-sm font-medium">Initializing 3D Engine...</span>
      </div>
    </div>
  )
});

interface KnowledgeGraph3DProps {
  onNodeClick: (documentId: string) => void;
}

export default function KnowledgeGraph3D({ onNodeClick }: KnowledgeGraph3DProps) {
  const fgRef = useRef<any>();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { vaultDb } = useVault();
  const { cryptoKey } = useAuth();

  useEffect(() => {
    const fetchAndBuildGraph = async () => {
      if (!vaultDb || !cryptoKey) return;
      setIsLoading(true);
      
      try {
        const docs = await vaultDb.getAllDocuments();
        const chunks = await vaultDb.getAllChunks();
        const data = await buildGraphData(docs, chunks, cryptoKey);
        setGraphData(data);
      } catch (error) {
        console.error("Failed to build graph data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndBuildGraph();
  }, [vaultDb, cryptoKey]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    handleResize(); // Initial measurement
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResetCamera = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 250 }, { x: 0, y: 0, z: 0 }, 1000);
    }
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50, (node: any) => true);
    }
  }, []);

  const legendTags = useMemo(() => {
    const tags = new Set<string>();
    graphData.nodes.forEach(n => tags.add(n.group));
    return Array.from(tags);
  }, [graphData.nodes]);

  // If there are too few documents to form a meaningful graph
  if (!isLoading && graphData.nodes.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 border border-white/5 rounded-2xl bg-zinc-950/60 p-8 text-center">
        <Network className="w-12 h-12 mb-4 text-zinc-700" />
        <h3 className="text-xl font-semibold text-zinc-300 mb-2">Insufficient Data</h3>
        <p className="max-w-sm">The 3D Knowledge Graph requires at least 2 documents in your vault to visualize semantic connections.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
      
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start pointer-events-none">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 p-3 rounded-xl pointer-events-auto shadow-lg flex flex-col gap-1">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Graph Statistics</div>
          <div className="flex gap-4 text-sm font-medium text-zinc-300">
            <span><span className="text-violet-400">{graphData.nodes.length}</span> Nodes</span>
            <span className="text-zinc-600">|</span>
            <span><span className="text-emerald-400">{graphData.links.length}</span> Links</span>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button onClick={handleResetCamera} className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors shadow-lg" title="Reset Camera">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleZoomToFit} className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors shadow-lg" title="Zoom to Fit">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-lg pointer-events-auto max-w-xs">
        <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
          <Info className="w-3.5 h-3.5" /> Semantic Tags
        </div>
        <div className="flex flex-wrap gap-2">
          {legendTags.map(tag => (
            <div key={tag} className="flex items-center gap-2 text-xs text-zinc-300 bg-black/40 px-2 py-1 rounded-md border border-white/5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColorForTag(tag), boxShadow: `0 0 8px ${getColorForTag(tag)}` }} />
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Info Tooltip */}
      <AnimatePresence>
        {hoverNode && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 right-4 z-20 bg-zinc-900/95 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-2xl pointer-events-none max-w-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: hoverNode.color, boxShadow: `0 0 10px ${hoverNode.color}` }} />
              <span className="text-xs font-bold text-white uppercase tracking-wider">{hoverNode.group}</span>
            </div>
            <h4 className="text-sm font-medium text-zinc-200 truncate">{hoverNode.name}</h4>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Canvas */}
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-zinc-950/80 absolute inset-0 z-0">
          <div className="flex flex-col items-center gap-4 text-violet-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-sm font-medium">Computing Vector Topology...</span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 cursor-move">
          <ForceGraph3D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel=""
            nodeColor={(node: any) => node.color}
            nodeVal={(node: any) => Math.max(1, node.val) * 1.5}
            nodeResolution={32}
            linkColor={() => 'rgba(255,255,255,0.15)'}
            linkWidth={1}
            linkOpacity={0.3}
            onNodeClick={(node: any) => onNodeClick(node.id)}
            onNodeHover={(node: any) => setHoverNode(node || null)}
            enableNodeDrag={false}
            showNavInfo={false}
            backgroundColor="#09090b"
            nodeThreeObject={(node: any) => {
              // Custom Glowing Sphere
              const radius = Math.max(2, Math.sqrt(node.val) * 1.5);
              const geometry = new THREE.SphereGeometry(radius, 32, 32);
              const material = new THREE.MeshPhongMaterial({
                color: node.color,
                emissive: node.color,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.9,
              });
              return new THREE.Mesh(geometry, material);
            }}
          />
        </div>
      )}
    </div>
  );
}
