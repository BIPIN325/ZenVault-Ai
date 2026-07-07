import { VaultDB } from './db';

export interface VaultMetrics {
  totalDocuments: number;
  totalChunks: number;
  storageSizeBytes: number;
  storageSizeFormatted: string;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function createEmptyMetrics(): VaultMetrics {
  return {
    totalDocuments: 0,
    totalChunks: 0,
    storageSizeBytes: 0,
    storageSizeFormatted: '0 Bytes'
  };
}

export async function getVaultStats(vaultDb?: VaultDB): Promise<VaultMetrics> {
  if (typeof window === 'undefined') {
    return { ...createEmptyMetrics() };
  }

  try {
    const documents = vaultDb ? await vaultDb.getAllDocuments() : [];
    const chunks = vaultDb ? await vaultDb.getAllChunks() : [];
    
    // In localforage, measuring exact byte size requires estimating based on JSON stringification
    let storageSizeBytes = 0;
    
    if (documents.length > 0) {
      const docsStr = JSON.stringify(documents);
      storageSizeBytes += new Blob([docsStr]).size;
    }
    
    if (chunks.length > 0) {
      const chunksStr = JSON.stringify(chunks);
      storageSizeBytes += new Blob([chunksStr]).size;
    }
    
    return {
      totalDocuments: documents.length,
      totalChunks: chunks.length,
      storageSizeBytes,
      storageSizeFormatted: formatBytes(storageSizeBytes)
    };
  } catch (error) {
    console.error("Failed to get vault stats", error);
    return { ...createEmptyMetrics() };
  }
}
