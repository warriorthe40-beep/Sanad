export type { StorageAdapter } from './StorageAdapter';
export { LocalStorageAdapter } from './LocalStorageAdapter';

import { LocalStorageAdapter } from './LocalStorageAdapter';

/**
 * The default adapter wired into repository singletons. Swap this one line
 * (for example, to a FirebaseAdapter) to change the app's storage backend.
 */
export const defaultStorageAdapter = new LocalStorageAdapter();
