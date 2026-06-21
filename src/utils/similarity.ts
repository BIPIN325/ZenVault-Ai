/**
 * Pure TypeScript implementation for vector mathematics and cosine similarity.
 */

/**
 * Calculates the dot product of two vectors.
 */
export function dotProduct(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must be of the same length to calculate dot product.");
  }
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

/**
 * Calculates the magnitude (length) of a vector.
 */
export function magnitude(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

/**
 * Calculates the cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means perfectly similar.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);
  
  if (magA === 0 || magB === 0) {
    return 0; // Prevent division by zero
  }
  
  return dotProduct(vecA, vecB) / (magA * magB);
}
