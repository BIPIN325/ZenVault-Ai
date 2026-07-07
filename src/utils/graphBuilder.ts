import { DocumentMetadata, EncryptedChunk } from './db';
import { decryptData } from './crypto';
import { cosineSimilarity } from './similarity';
import { getColorForTag } from './autoTagger';

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  group: string;
  color: string;
}

export interface GraphLink {
  source: string;
  target: string;
  similarity: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Averages an array of vectors.
 */
function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += vec[i];
    }
  }
  
  for (let i = 0; i < dim; i++) {
    avg[i] /= vectors.length;
  }
  
  return avg;
}

export async function buildGraphData(
  documents: DocumentMetadata[], 
  chunks: EncryptedChunk[], 
  cryptoKey: CryptoKey
): Promise<GraphData> {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  
  const docVectors = new Map<string, number[]>();

  // Group chunks by document ID
  const chunksByDoc = new Map<string, EncryptedChunk[]>();
  for (const chunk of chunks) {
    const arr = chunksByDoc.get(chunk.documentId) || [];
    arr.push(chunk);
    chunksByDoc.set(chunk.documentId, arr);
  }

  // 1. Build Nodes and calculate average document vectors
  for (const doc of documents) {
    const primaryTag = (doc.tags && doc.tags.length > 0) ? doc.tags[0] : '#uncategorized';
    
    // Estimate size/val based on chunk count
    const docChunks = chunksByDoc.get(doc.id) || [];
    const val = Math.max(1, docChunks.length);
    
    nodes.push({
      id: doc.id,
      name: doc.title,
      val: val,
      group: primaryTag,
      color: getColorForTag(primaryTag)
    });

    // Decrypt chunks to get vectors
    const vectors: number[][] = [];
    for (const chunk of docChunks) {
      try {
        const decryptedPayload = await decryptData(chunk.ciphertext, chunk.iv, cryptoKey);
        const payload = JSON.parse(decryptedPayload);
        if (payload.vector) {
          vectors.push(payload.vector);
        }
      } catch (e) {
        console.error("Failed to decrypt chunk for graph building", e);
      }
    }

    if (vectors.length > 0) {
      const avgVec = averageVectors(vectors);
      docVectors.set(doc.id, avgVec);
    }
  }

  // 2. Build Links using Cosine Similarity
  const docIds = Array.from(docVectors.keys());
  
  for (let i = 0; i < docIds.length; i++) {
    for (let j = i + 1; j < docIds.length; j++) {
      const idA = docIds[i];
      const idB = docIds[j];
      
      const vecA = docVectors.get(idA);
      const vecB = docVectors.get(idB);
      
      if (vecA && vecB) {
        const sim = cosineSimilarity(vecA, vecB);
        if (sim > 0.72) {
          links.push({
            source: idA,
            target: idB,
            similarity: sim
          });
        }
      }
    }
  }

  return { nodes, links };
}
