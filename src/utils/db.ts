import localforage from 'localforage';

export interface DocumentMetadata {
  id: string;
  title: string;
  createdAt: number;
  encryptedRawBody?: string;
  rawIv?: string;
  tags?: string[];
}

export interface EncryptedChunk {
  id: string;
  documentId: string;
  ciphertext: string;
  iv: string;
  chunkIndex: number;
}

export class VaultDB {
  private documentsStore: LocalForage;
  private chunksStore: LocalForage;

  constructor(public vaultName: string) {
    this.documentsStore = localforage.createInstance({
      name: `ZenVault_${vaultName}`,
      storeName: 'documents',
    });
    this.chunksStore = localforage.createInstance({
      name: `ZenVault_${vaultName}`,
      storeName: 'chunks',
    });
  }

  async saveDocumentMetadata(metadata: DocumentMetadata): Promise<void> {
    await this.documentsStore.setItem(metadata.id, metadata);
  }

  async saveEncryptedChunk(chunk: EncryptedChunk): Promise<void> {
    await this.chunksStore.setItem(chunk.id, chunk);
  }

  async getDocumentMetadata(id: string): Promise<DocumentMetadata | null> {
    return await this.documentsStore.getItem<DocumentMetadata>(id);
  }

  async getAllDocuments(): Promise<DocumentMetadata[]> {
    const docs: DocumentMetadata[] = [];
    await this.documentsStore.iterate((value: DocumentMetadata) => {
      docs.push(value);
    });
    return docs.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getDocumentChunks(documentId: string): Promise<EncryptedChunk[]> {
    const chunks: EncryptedChunk[] = [];
    await this.chunksStore.iterate((value: EncryptedChunk) => {
      if (value.documentId === documentId) {
        chunks.push(value);
      }
    });
    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async getAllChunks(): Promise<EncryptedChunk[]> {
    const chunks: EncryptedChunk[] = [];
    await this.chunksStore.iterate((value: EncryptedChunk) => {
      chunks.push(value);
    });
    return chunks;
  }

  async clearAllData(): Promise<void> {
    await this.documentsStore.clear();
    await this.chunksStore.clear();
  }

  async saveDocumentsBatch(documents: DocumentMetadata[]): Promise<void> {
    for (const doc of documents) {
      await this.documentsStore.setItem(doc.id, doc);
    }
  }

  async saveChunksBatch(chunks: EncryptedChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.chunksStore.setItem(chunk.id, chunk);
    }
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await this.documentsStore.removeItem(documentId);
      
      const chunksToDelete: string[] = [];
      await this.chunksStore.iterate((value: EncryptedChunk, key: string) => {
        if (value.documentId === documentId) {
          chunksToDelete.push(key);
        }
      });

      for (const key of chunksToDelete) {
        await this.chunksStore.removeItem(key);
      }
      
      return true;
    } catch (error) {
      console.error("Failed to delete document and chunks:", error);
      return false;
    }
  }
}

// Factory function
export function getVault(vaultName: string): VaultDB {
  return new VaultDB(vaultName);
}
