import type { StorageAdapter } from '@/data/storage';
import type { Purchase } from '@/data/models';
import { BaseRepository } from './BaseRepository';

const COLLECTION = 'purchases';

/**
 * Date-typed fields on Purchase that need ISO round-tripping.
 * `warrantyEndDate` and `returnEndDate` are optional per the blueprint but
 * still deserialize correctly when absent (undefined passes through).
 */
const DATE_FIELDS: ReadonlyArray<keyof Purchase> = [
  'purchaseDate',
  'warrantyEndDate',
  'returnEndDate',
];

/**
 * PurchaseRepository — persistence for Purchase entities.
 *
 * Adds `getByUserId` for the "list my purchases" flow, which is the primary
 * query the Purchase List page will issue.
 */
export class PurchaseRepository extends BaseRepository<Purchase> {
  constructor(adapter: StorageAdapter) {
    super(adapter, COLLECTION, DATE_FIELDS);
  }

  /** Every purchase belonging to a specific user. */
  async getByUserId(userId: string): Promise<Purchase[]> {
    const purchases = await this.loadAll();
    return purchases.filter((purchase) => purchase.userId === userId);
  }
}
