/**
 * Normalize a store name for fuzzy comparison.
 * Keeps Latin letters, Arabic letters (U+0600-U+06FF), digits, and spaces.
 */
export function normalizeStoreName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const val =
        a[i] === b[j]
          ? dp[j]
          : Math.min(dp[j] + 1, prev + 1, dp[j + 1] + 1);
      dp[j] = prev;
      prev = val;
    }
    dp[b.length] = prev;
  }
  return dp[b.length];
}

/** Returns 0 (no match) to 1 (identical). */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Fraction of string `a`'s tokens that appear in string `b`.
 * Only meaningful (non-zero) when `a` has 2+ tokens, to avoid
 * single-word false positives.
 */
export function tokenOverlapScore(a: string, b: string): number {
  const aTokens = a.split(' ').filter(Boolean);
  if (aTokens.length < 2) return 0;
  const bSet = new Set(b.split(' ').filter(Boolean));
  const matches = aTokens.filter((t) => bSet.has(t)).length;
  return matches / aTokens.length;
}
