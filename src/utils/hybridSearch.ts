export interface ScoredChunk {
  text: string;
  documentId: string;
  chunkIndex: number;
  vectorScore: number;
  keywordScore?: number;
  finalScore?: number;
}

/**
 * Tokenizes a string by lowercasing, removing punctuation, and splitting by whitespace.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]|_/g, "")
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Calculates a basic Term Frequency (TF) and Inverse Document Frequency (IDF) 
 * approximation over the active pool of chunks.
 */
export function calculateKeywordScores(query: string, chunks: ScoredChunk[]): ScoredChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return chunks.map(c => ({ ...c, keywordScore: 0 }));
  }

  const N = chunks.length;
  // Calculate document frequency for each query token
  const df: Record<string, number> = {};
  queryTokens.forEach(token => df[token] = 0);

  const chunkTokensList = chunks.map(chunk => {
    const tokens = tokenize(chunk.text);
    const uniqueTokens = new Set(tokens);
    queryTokens.forEach(token => {
      if (uniqueTokens.has(token)) {
        df[token]++;
      }
    });
    return tokens;
  });

  // Calculate IDF for each token: ln( (N - df + 0.5) / (df + 0.5) + 1 )
  const idf: Record<string, number> = {};
  queryTokens.forEach(token => {
    const dft = df[token];
    idf[token] = Math.log(((N - dft + 0.5) / (dft + 0.5)) + 1);
  });

  // Basic BM25 constants
  const k1 = 1.2;
  const b = 0.75;
  
  // Calculate average chunk length
  const avgdl = chunkTokensList.reduce((acc, tokens) => acc + tokens.length, 0) / (N || 1);

  // Score each chunk
  return chunks.map((chunk, i) => {
    const tokens = chunkTokensList[i];
    const dl = tokens.length;
    let score = 0;

    // Count term frequencies in this chunk
    const tf: Record<string, number> = {};
    tokens.forEach(token => {
      tf[token] = (tf[token] || 0) + 1;
    });

    queryTokens.forEach(token => {
      const termFreq = tf[token] || 0;
      if (termFreq > 0) {
        const numerator = termFreq * (k1 + 1);
        const denominator = termFreq + k1 * (1 - b + b * (dl / avgdl));
        score += idf[token] * (numerator / denominator);
      }
    });

    return { ...chunk, keywordScore: score };
  });
}

/**
 * Normalizes scores and blends them using a convex combination (alpha).
 * alpha = 1.0 means pure vector search, alpha = 0.0 means pure keyword search.
 */
export function rerankResults(query: string, chunks: ScoredChunk[], alpha: number = 0.5): ScoredChunk[] {
  // 1. Calculate keyword scores (BM25 variant)
  let scoredChunks = calculateKeywordScores(query, chunks);

  // 2. Normalize Vector Scores (Min-Max)
  const vectorScores = scoredChunks.map(c => c.vectorScore);
  const minVector = Math.min(...vectorScores);
  const maxVector = Math.max(...vectorScores);
  
  // 3. Normalize Keyword Scores (Min-Max)
  const keywordScores = scoredChunks.map(c => c.keywordScore || 0);
  const minKeyword = Math.min(...keywordScores);
  const maxKeyword = Math.max(...keywordScores);

  // Helper to normalize
  const normalize = (val: number, min: number, max: number) => {
    if (max === min) return val > 0 ? 1 : 0;
    return (val - min) / (max - min);
  };

  // 4. Calculate Final Hybrid Score
  scoredChunks = scoredChunks.map(chunk => {
    const normVector = normalize(chunk.vectorScore, minVector, maxVector);
    const normKeyword = normalize(chunk.keywordScore || 0, minKeyword, maxKeyword);
    
    // Convex Combination Fusion
    const finalScore = (alpha * normVector) + ((1 - alpha) * normKeyword);
    
    return {
      ...chunk,
      finalScore
    };
  });

  // 5. Sort descending by final score
  scoredChunks.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  return scoredChunks;
}
