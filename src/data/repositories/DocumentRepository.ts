import type { StorageAdapter } from '@/data/storage';
import type { Document } from '@/data/models';
import { BaseRepository } from './BaseRepository';

const COLLECTION = 'documents';

const DATE_FIELDS: ReadonlyArray<keyof Document> = ['uploadDate'];

/**
 * DocumentRepository — persistence for Document entities (receipt,
 * warranty card, invoice, other). Owned by a Purchase via `purchaseId`,
 * mirroring the repository pattern used for Claim and Alert.
 */
export class DocumentRepository extends BaseRepository<Document> {
  constructor(adapter: StorageAdapter) {
    super(adapter, COLLECTION, DATE_FIELDS);
  }

  /** Every document attached to a specific purchase, newest upload first. */
  async getByPurchaseId(purchaseId: string): Promise<Document[]> {
    const docs = await this.loadAll();
    return docs
      .filter((doc) => doc.purchaseId === purchaseId)
      .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  }
}
