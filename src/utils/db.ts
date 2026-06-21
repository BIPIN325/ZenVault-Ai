import localforage from 'localforage';

export interface DocumentMetadata {
  id: string;
  title: string;
  createdAt: number;
  encryptedRawBody?: string;
  rawIv?: string;
}

export interface EncryptedChunk {
  id: string;
  documentId: string;
  ciphertext: string;
  iv: string;
  chunkIndex: number;
}

const documentsStore = localforage.createInstance({
  name: 'ZenVault',
  storeName: 'documents',
});

const chunksStore = localforage.createInstance({
  name: 'ZenVault',
  storeName: 'chunks',
});

export async function saveDocumentMetadata(metadata: DocumentMetadata): Promise<void> {
  await documentsStore.setItem(metadata.id, metadata);
}

export async function saveEncryptedChunk(chunk: EncryptedChunk): Promise<void> {
  await chunksStore.setItem(chunk.id, chunk);
}

export async function getDocumentMetadata(id: string): Promise<DocumentMetadata | null> {
  return await documentsStore.getItem<DocumentMetadata>(id);
}

export async function getAllDocuments(): Promise<DocumentMetadata[]> {
  const docs: DocumentMetadata[] = [];
  await documentsStore.iterate((value: DocumentMetadata) => {
    docs.push(value);
  });
  return docs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getDocumentChunks(documentId: string): Promise<EncryptedChunk[]> {
  const chunks: EncryptedChunk[] = [];
  await chunksStore.iterate((value: EncryptedChunk) => {
    if (value.documentId === documentId) {
      chunks.push(value);
    }
  });
  return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
}

export async function getAllChunks(): Promise<EncryptedChunk[]> {
  const chunks: EncryptedChunk[] = [];
  await chunksStore.iterate((value: EncryptedChunk) => {
    chunks.push(value);
  });
  return chunks;
}

export async function clearAllData(): Promise<void> {
  await documentsStore.clear();
  await chunksStore.clear();
}

export async function saveDocumentsBatch(documents: DocumentMetadata[]): Promise<void> {
  for (const doc of documents) {
    await documentsStore.setItem(doc.id, doc);
  }
}

export async function saveChunksBatch(chunks: EncryptedChunk[]): Promise<void> {
  for (const chunk of chunks) {
    await chunksStore.setItem(chunk.id, chunk);
  }
}

export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    await documentsStore.removeItem(documentId);
    
    const chunksToDelete: string[] = [];
    await chunksStore.iterate((value: EncryptedChunk, key: string) => {
      if (value.documentId === documentId) {
        chunksToDelete.push(key);
      }
    });

    for (const key of chunksToDelete) {
      await chunksStore.removeItem(key);
    }
    
    return true;
  } catch (error) {
    console.error("Failed to delete document and chunks:", error);
    return false;
  }
}
