import type { StoreAlias } from '@/data/models';
import { normalizeStoreName, stringSimilarity } from './fuzzyMatch';

const FUZZY_THRESHOLD = 0.85;

/**
 * Given an AI-extracted store name and the user's alias table, return the
 * canonical clean_name if a fuzzy match above the threshold is found,
 * otherwise return the original extracted name unchanged.
 */
export function resolveStoreName(
  extracted: string,
  aliases: StoreAlias[]
): string {
  if (!aliases.length || !extracted.trim()) return extracted;
  const normalized = normalizeStoreName(extracted);
  let best = { score: 0, cleanName: extracted };
  for (const alias of aliases) {
    const score = stringSimilarity(normalized, alias.rawName);
    if (score > best.score) best = { score, cleanName: alias.cleanName };
  }
  return best.score >= FUZZY_THRESHOLD ? best.cleanName : extracted;
}
