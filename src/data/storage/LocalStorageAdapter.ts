import type { StorageAdapter } from './StorageAdapter';

/**
 * LocalStorageAdapter — the prototype's StorageAdapter implementation.
 *
 * Each logical collection is persisted as a single JSON-encoded array under
 * a prefixed key (default `"sanad:<collection>"`) to avoid colliding with
 * other apps on the same origin.
 *
 * Dates are NOT (de)serialized here — the adapter treats every value as
 * opaque JSON. Date handling lives in BaseRepository, which knows the
 * Date-typed fields of each entity.
 *
 * If no `Storage` is passed explicitly, the adapter resolves
 * `window.localStorage` lazily — so constructing the adapter in an
 * environment without `window` (e.g. a test runner) doesn't throw on
 * import; it only throws when a method is actually called.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly explicitStorage: Storage | undefined;

  constructor(
    private readonly prefix: string = 'sanad:',
    storage?: Storage
  ) {
    this.explicitStorage = storage;
  }

  private get storage(): Storage {
    if (this.explicitStorage) return this.explicitStorage;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    throw new Error(
      'LocalStorageAdapter requires window.localStorage or an explicit Storage argument.'
    );
  }

  private key(collection: string): string {
    return `${this.prefix}${collection}`;
  }

  async read<T>(collection: string): Promise<T[]> {
    const raw = this.storage.getItem(this.key(collection));
    if (raw === null) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  async write<T>(collection: string, items: T[]): Promise<void> {
    this.storage.setItem(this.key(collection), JSON.stringify(items));
  }

  async clear(collection: string): Promise<void> {
    this.storage.removeItem(this.key(collection));
  }
}

