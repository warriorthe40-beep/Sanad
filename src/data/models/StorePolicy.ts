/**
 * StorePolicy — community-aggregated warranty and return-window data for a
 * (store, category) pair. Powers the "Community Suggestions" feature in §3.
 *
 * Relationships:
 *   Store     1 ──*  StorePolicy
 *   Category  1 ──*  StorePolicy
 *
 * UML operations (implemented in the suggestions application module):
 *   getSuggestion(), updateFromUser(), getMode()
 */
export interface StorePolicy {
  id: string;
  storeId: string;
  categoryId: string;
  /** Typical/modal warranty duration reported by the community. */
  typicalWarranty: string;
  /** Typical/modal return window reported by the community. */
  typicalReturnWindow: string;
  /** Number of community reports backing this policy. */
  reportCount: number;
}
