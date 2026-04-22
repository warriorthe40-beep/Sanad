import { defaultStorageAdapter } from '@/data/storage';
import { UserRepository } from './UserRepository';
import { PurchaseRepository } from './PurchaseRepository';
import { StorePolicyRepository } from './StorePolicyRepository';
import { CategoryRepository } from './CategoryRepository';
import { AlertRepository } from './AlertRepository';
import { ClaimRepository } from './ClaimRepository';
import { DocumentRepository } from './DocumentRepository';

export type { Entity, Repository } from './Repository';
export { BaseRepository } from './BaseRepository';
export { UserRepository } from './UserRepository';
export { PurchaseRepository } from './PurchaseRepository';
export { StorePolicyRepository } from './StorePolicyRepository';
export { CategoryRepository } from './CategoryRepository';
export { AlertRepository } from './AlertRepository';
export { ClaimRepository } from './ClaimRepository';
export { DocumentRepository } from './DocumentRepository';

/**
 * Default repository singletons wired to `defaultStorageAdapter`.
 *
 * Consumers normally import these. Tests or alternative backends can import
 * the classes above and instantiate them with a different StorageAdapter.
 */
export const userRepository = new UserRepository(defaultStorageAdapter);
export const purchaseRepository = new PurchaseRepository(defaultStorageAdapter);
export const storePolicyRepository = new StorePolicyRepository(defaultStorageAdapter);
export const categoryRepository = new CategoryRepository(defaultStorageAdapter);
export const alertRepository = new AlertRepository(defaultStorageAdapter);
export const claimRepository = new ClaimRepository(defaultStorageAdapter);
export const documentRepository = new DocumentRepository(defaultStorageAdapter);
