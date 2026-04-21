import type { StorageAdapter } from '@/data/storage';
import type { StorePolicy } from '@/data/models';
import { BaseRepository } from './BaseRepository';

const COLLECTION = 'storePolicies';

/**
 * StorePolicyRepository — persistence for community-aggregated warranty
 * and return-window suggestions (system_blueprint.md §3).
 *
 * Adds lookup helpers for the (store, category) suggestion flow.
 */
export class StorePolicyRepository extends BaseRepository<StorePolicy> {
  constructor(adapter: StorageAdapter) {
    super(adapter, COLLECTION);
  }

  /**
   * The policy for a specific (store, category) pair, if one exists.
   * Used when the user picks a store and category in Add Purchase and we
   * need to surface a single community suggestion.
   */
  async getByStoreAndCategory(
    storeId: string,
    categoryId: string
  ): Promise<StorePolicy | null> {
    const policies = await this.loadAll();
    return (
      policies.find(
        (policy) => policy.storeId === storeId && policy.categoryId === categoryId
      ) ?? null
    );
  }

  /** Every policy for a given store, across all categories. */
  async getByStore(storeId: string): Promise<StorePolicy[]> {
    const policies = await this.loadAll();
    return policies.filter((policy) => policy.storeId === storeId);
  }
}
