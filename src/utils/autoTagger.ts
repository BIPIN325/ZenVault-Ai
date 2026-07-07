export async function generateTags(text: string): Promise<string[]> {
  const normalizedText = text.toLowerCase();
  const tags = new Set<string>();

  const dictionary: Record<string, string[]> = {
    '#finance': ['financial', 'revenue', 'tax', 'invoice', 'bank', 'budget', 'salary', 'investment', 'receipt', 'crypto'],
    '#code': ['function', 'const', 'import', 'return', 'bug', 'github', 'server', 'database', 'api', 'react', 'typescript'],
    '#legal': ['contract', 'agreement', 'terms', 'privacy', 'nda', 'lawyer', 'court', 'compliance', 'liability', 'clause'],
    '#personal': ['journal', 'diary', 'health', 'workout', 'diet', 'family', 'vacation', 'recipe', 'hobby', 'goal'],
    '#research': ['study', 'experiment', 'hypothesis', 'conclusion', 'paper', 'university', 'abstract', 'methodology', 'results'],
    '#business': ['strategy', 'marketing', 'sales', 'partnership', 'roadmap', 'client', 'q1', 'q2', 'q3', 'q4', 'kpi'],
  };

  // Simple frequency/occurrence counting
  for (const [tag, keywords] of Object.entries(dictionary)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        matchCount++;
      }
    }
    // If multiple keywords from the same domain appear, it's highly likely to match
    if (matchCount >= 1) {
      tags.add(tag);
    }
  }

  // Fallback if no specific tags match
  if (tags.size === 0) {
    tags.add('#uncategorized');
  }

  // Return up to 3 tags
  return Array.from(tags).slice(0, 3);
}

export function getColorForTag(tag: string | undefined): string {
  switch (tag) {
    case '#finance': return '#10b981'; // Emerald
    case '#code': return '#3b82f6';    // Blue
    case '#legal': return '#f59e0b';   // Amber
    case '#personal': return '#ec4899';// Pink
    case '#research': return '#8b5cf6';// Violet
    case '#business': return '#0ea5e9';// Sky
    case '#uncategorized':
    default: return '#71717a';         // Zinc
  }
}
