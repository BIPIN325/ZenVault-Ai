import React, { useState, useEffect } from 'react';
import { FileText, Database, Eye, Trash2, CheckCircle } from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';
import { deleteDocument } from '@/utils/db';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentListProps {
  documents: any[];
  onDocumentClick: (doc: any) => void;
}

export default function DocumentList({ documents, onDocumentClick }: DocumentListProps) {
  const [localDocs, setLocalDocs] = useState<any[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalDocs(documents);
  }, [documents]);

  const handleViewDocument = (e: React.MouseEvent, doc: any) => {
    e.stopPropagation(); // Prevent triggering onDocumentClick (Metadata Drawer)
    setSelectedDocumentId(doc.id);
    setSelectedFileName(doc.title);
    setIsViewerOpen(true);
  };

  const handleDeleteDocument = async (e: React.MouseEvent, doc: any) => {
    e.stopPropagation(); // Prevent triggering onDocumentClick
    const confirmed = window.confirm("Are you sure you want to permanently delete this document and its encrypted data? This action cannot be undone.");
    
    if (confirmed) {
      const success = await deleteDocument(doc.id);
      if (success) {
        setLocalDocs(prev => prev.filter(d => d.id !== doc.id));
        setToastMessage("Document and associated vectors permanently shredded.");
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert("Failed to delete document. Check console for details.");
      }
    }
  };

  if (localDocs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600 p-8 min-h-[200px]">
        <Database className="w-8 h-8 mb-3 opacity-20" />
        <p className="text-sm">No encrypted assets found.</p>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[100] flex items-center gap-3 bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-medium">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto custom-scrollbar h-full">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
          <thead className="text-xs text-zinc-500 bg-zinc-900/30 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 font-medium">Asset Name</th>
              <th className="px-6 py-3 font-medium">Token Chunks</th>
              <th className="px-6 py-3 font-medium">Encryption Tag</th>
              <th className="px-6 py-3 font-medium text-right">Date Ingested</th>
              <th className="px-6 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {localDocs.map((doc) => (
              <tr 
                key={doc.id} 
                onClick={() => onDocumentClick(doc)}
                className="hover:bg-zinc-800/50 transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4 font-medium text-zinc-300 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-violet-500/30 transition-colors">
                    <FileText className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">{doc.title}</span>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  <span className="bg-zinc-900 px-2.5 py-1 rounded-md text-xs border border-white/5 text-violet-300/80">
                    {doc.chunksCount} vectors
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-emerald-500/70">
                  {doc.id.split('-')[0]}...
                </td>
                <td className="px-6 py-4 text-right text-zinc-500 text-xs">
                  {doc.createdAt}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={(e) => handleViewDocument(e, doc)}
                      className="p-2 rounded-lg bg-zinc-800/80 hover:bg-violet-600/20 text-zinc-400 hover:text-violet-400 border border-transparent hover:border-violet-500/30 transition-all shadow-sm"
                      title="View Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteDocument(e, doc)}
                      className="p-2 rounded-lg bg-zinc-800/80 hover:bg-rose-600/20 text-zinc-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all shadow-sm"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentViewerModal
        documentId={selectedDocumentId || ''}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        fileName={selectedFileName}
      />
    </>
  );
}
