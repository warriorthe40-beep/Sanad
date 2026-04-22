import type { StorageAdapter } from '@/data/storage';
import type { Claim } from '@/data/models';
import { BaseRepository } from './BaseRepository';

const COLLECTION = 'claims';

const DATE_FIELDS: ReadonlyArray<keyof Claim> = ['dateReported'];

/**
 * ClaimRepository — persistence for Claim entities (issues reported by
 * users against their purchases). Queries are scoped by purchaseId
 * since Claim is owned by Purchase and ownership flows through the
 * Purchase.userId relationship rather than sitting on the Claim itself.
 */
export class ClaimRepository extends BaseRepository<Claim> {
  constructor(adapter: StorageAdapter) {
    super(adapter, COLLECTION, DATE_FIELDS);
  }

  /** Claims attached to a specific purchase. */
  async getByPurchaseId(purchaseId: string): Promise<Claim[]> {
    const claims = await this.loadAll();
    return claims
      .filter((claim) => claim.purchaseId === purchaseId)
      .sort((a, b) => b.dateReported.getTime() - a.dateReported.getTime());
  }

  /** Every claim in the store — used by the Claims page, filtered client-side. */
  async getAllSortedByDate(): Promise<Claim[]> {
    const claims = await this.loadAll();
    return claims.sort((a, b) => b.dateReported.getTime() - a.dateReported.getTime());
  }
}
