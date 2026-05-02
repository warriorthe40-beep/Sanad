import { createAnthropicClient } from '@/services/anthropic/anthropicClient';

export { MissingApiKeyError } from '@/services/anthropic/anthropicClient';

export interface StoreCluster {
  canonical: string;
  variants: string[];
}

/**
 * Sends all distinct store names to Claude in ONE call and returns clusters
 * of names that likely refer to the same store (e.g. "Starbuck" / "Starbucks",
 * Arabic and English variants). Only clusters with 2+ members are returned.
 */
export async function clusterStoreNames(
  storeNames: string[]
): Promise<StoreCluster[]> {
  if (storeNames.length < 2) return [];

  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content:
          `You are analyzing store names from a purchase history to find likely duplicates.\n\n` +
          `Store names (${storeNames.length} total):\n${JSON.stringify(storeNames)}\n\n` +
          `Group names that likely refer to the same real-world store ` +
          `(e.g. "Starbuck" vs "Starbucks", same store in Arabic and English, ` +
          `names with/without suffixes like "Store" or "Bookstore").\n\n` +
          `Rules:\n` +
          `- Only group 2 or more names together\n` +
          `- Suggest the most correct and complete canonical name for each group\n` +
          `- Arabic and English variants of the same store belong in one group\n` +
          `- Clearly different stores must NOT be grouped\n\n` +
          `Return ONLY a valid JSON array with no explanation:\n` +
          `[{"canonical":"<best name>","variants":["<name1>","<name2>",...]}]\n\n` +
          `If no duplicate groups are found, return: []`,
      },
    ],
  });

  const text =
    response.content.find((b) => b.type === 'text')?.text?.trim() ?? '[]';
  try {
    const raw = JSON.parse(text) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is StoreCluster =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as StoreCluster).canonical === 'string' &&
        Array.isArray((item as StoreCluster).variants) &&
        (item as StoreCluster).variants.length >= 2
    );
  } catch {
    return [];
  }
}
