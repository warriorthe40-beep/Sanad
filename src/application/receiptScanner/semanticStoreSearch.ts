import { createAnthropicClient } from '@/services/anthropic/anthropicClient';

export { MissingApiKeyError } from '@/services/anthropic/anthropicClient';

/**
 * Asks Claude to find which stores in the user's purchase history are
 * semantically related to the typed query — handles Arabic, English, and
 * category-based matches (e.g. "بوفية" → buffet-style restaurants).
 *
 * Only called when simple substring matching produces no results.
 */
export async function semanticStoreSearch(
  query: string,
  storeHistory: string[]
): Promise<string[]> {
  if (!storeHistory.length || !query.trim()) return [];

  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content:
          `You are helping a shopping expense tracker suggest store names.\n` +
          `The user typed: "${query}"\n` +
          `Their purchase history stores: ${JSON.stringify(storeHistory)}\n\n` +
          `Which of those stores are semantically related to the query? ` +
          `Consider Arabic words, English translations, and category types ` +
          `(e.g. "بوفية" means buffet, so match buffet or restaurant stores; ` +
          `"بقالة" means grocery, so match grocery stores).\n` +
          `Return ONLY a JSON array of matching store names from the list, ordered by relevance. ` +
          `Return [] if none match. No explanation, just the JSON array.`,
      },
    ],
  });

  const text =
    response.content.find((b) => b.type === 'text')?.text?.trim() ?? '[]';
  try {
    const result = JSON.parse(text) as unknown;
    if (!Array.isArray(result)) return [];
    return result.filter(
      (s): s is string => typeof s === 'string' && storeHistory.includes(s)
    );
  } catch {
    return [];
  }
}
