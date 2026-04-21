import { storePolicyRepository } from '@/data/repositories';

/**
 * Community warranty / return-window suggestion for a (store, category) pair.
 * Corresponds to step 7–8 of the sequence diagram.
 */
export interface Suggestion {
  warranty: string;
  returnWindow: string;
  source: 'community' | 'seed';
}

/**
 * A tiny seed dataset so the demo works before any real community data
 * has been collected. The blueprint (§6) calls for "a pre-loaded dataset
 * for community suggestions" in the prototype.
 */
const SEED_SUGGESTIONS: Array<{
  storeName: string;
  categoryName: string;
  warranty: string;
  returnWindow: string;
}> = [
  { storeName: 'Jarir', categoryName: 'Electronics', warranty: '1 year', returnWindow: '7 days' },
  { storeName: 'Extra', categoryName: 'Electronics', warranty: '1 year', returnWindow: '14 days' },
  { storeName: 'IKEA', categoryName: 'Furniture', warranty: '2 years', returnWindow: '180 days' },
  { storeName: 'Apple Store', categoryName: 'Electronics', warranty: '1 year', returnWindow: '14 days' },
  { storeName: 'Zara', categoryName: 'Clothing', warranty: '', returnWindow: '30 days' },
  { storeName: 'Carrefour', categoryName: 'Groceries', warranty: '', returnWindow: '7 days' },
];

/**
 * getSuggestion — returns the community (or seed) suggestion for a given
 * store / category pair, or null if nothing is known.
 *
 * The Class Diagram wires StorePolicy against storeId/categoryId. For the
 * current prototype the app doesn't yet maintain a separate Store/Category
 * id layer in the UI, so lookups key off names. When those repositories
 * are wired, this function is the single place to update.
 */
export async function getSuggestion(
  storeName: string,
  categoryName: string
): Promise<Suggestion | null> {
  if (!storeName || !categoryName) return null;

  const policy = await storePolicyRepository.getByStoreAndCategory(
    storeName,
    categoryName
  );
  if (policy) {
    return {
      warranty: policy.typicalWarranty,
      returnWindow: policy.typicalReturnWindow,
      source: 'community',
    };
  }

  const seed = SEED_SUGGESTIONS.find(
    (entry) =>
      entry.storeName.toLowerCase() === storeName.trim().toLowerCase() &&
      entry.categoryName.toLowerCase() === categoryName.trim().toLowerCase()
  );
  return seed
    ? { warranty: seed.warranty, returnWindow: seed.returnWindow, source: 'seed' }
    : null;
}

/**
 * updateFromUser — step 15 of the sequence diagram. Called after a purchase
 * is saved so community data reflects the user's contribution.
 *
 * For the prototype: ensure a StorePolicy exists for the pair and bump its
 * reportCount. A richer implementation would recompute the modal warranty.
 */
export async function updateFromUser(
  storeName: string,
  categoryName: string,
  warranty: string,
  returnWindow: string
): Promise<void> {
  if (!storeName || !categoryName) return;

  const existing = await storePolicyRepository.getByStoreAndCategory(
    storeName,
    categoryName
  );
  if (existing) {
    await storePolicyRepository.update(existing.id, {
      reportCount: existing.reportCount + 1,
    });
    return;
  }

  await storePolicyRepository.create({
    storeId: storeName,
    categoryId: categoryName,
    typicalWarranty: warranty,
    typicalReturnWindow: returnWindow,
    reportCount: 1,
  });
}
