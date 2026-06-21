/**
 * Splits a long text string into smaller chunks for AI processing.
 *
 * @param text The input text to chunk.
 * @param chunkSize The approximate maximum size of each chunk (in characters).
 * @param overlap The number of characters from the end of the previous chunk to include in the next.
 * @returns An array of text chunks.
 */
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  if (!text.trim()) return [];
  
  const chunks: string[] = [];
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    let endIndex = currentIndex + chunkSize;
    
    // If we've reached the end of the text, just add the rest and break
    if (endIndex >= text.length) {
      chunks.push(text.substring(currentIndex));
      break;
    }
    
    // Find the last whitespace character to avoid splitting words in half
    let breakIndex = text.lastIndexOf(' ', endIndex);
    
    // If we found a space within this chunk range (after current index)
    if (breakIndex > currentIndex) {
      endIndex = breakIndex;
    }
    
    chunks.push(text.substring(currentIndex, endIndex));
    
    // Determine the start index for the next chunk
    let nextIndex = endIndex - overlap;
    
    // Failsafe: Ensure we are always moving forward to prevent infinite loops
    if (nextIndex <= currentIndex) {
      nextIndex = currentIndex + 1; 
    }
    
    currentIndex = nextIndex;
  }
  
  return chunks;
}
