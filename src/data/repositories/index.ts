import { defaultStorageAdapter } from '@/data/storage';
import { UserRepository } from './UserRepository';
import { PurchaseRepository } from './PurchaseRepository';
import { StorePolicyRepository } from './StorePolicyRepository';
import { StoreAliasRepository } from './StoreAliasRepository';
import { CategoryRepository } from './CategoryRepository';
import { AlertRepository } from './AlertRepository';
import { ClaimRepository } from './ClaimRepository';
import { DocumentRepository } from './DocumentRepository';

// PurchaseRepository and StorePolicyRepository are backed by Supabase.
// All other repositories still use the local StorageAdapter.

export type { Entity, Repository } from './Repository';
export { BaseRepository } from './BaseRepository';
export { UserRepository } from './UserRepository';
export { PurchaseRepository } from './PurchaseRepository';
export { StorePolicyRepository } from './StorePolicyRepository';
export { StoreAliasRepository } from './StoreAliasRepository';
export { CategoryRepository } from './CategoryRepository';
export { AlertRepository } from './AlertRepository';
export { ClaimRepository } from './ClaimRepository';
export { DocumentRepository } from './DocumentRepository';

export const userRepository = new UserRepository(defaultStorageAdapter);
export const purchaseRepository = new PurchaseRepository();
export const storePolicyRepository = new StorePolicyRepository();
export const storeAliasRepository = new StoreAliasRepository();
export const categoryRepository = new CategoryRepository();
export const alertRepository = new AlertRepository();
export const claimRepository = new ClaimRepository(defaultStorageAdapter);
export const documentRepository = new DocumentRepository(defaultStorageAdapter);
