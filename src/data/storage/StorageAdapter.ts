/**
 * StorageAdapter — the persistence boundary for the Data Storage Layer.
 *
 * Repositories talk only to this interface, never directly to localStorage or
 * any other backend. Swapping the prototype to a cloud database (Firebase,
 * MongoDB, …) is a matter of providing a new implementation that satisfies
 * this contract — call sites do not change.
 *
 * All methods are async so the contract is the same for synchronous
 * (localStorage) and asynchronous (remote HTTP/Firestore) backends.
 *
 * A `collection` is a logical table name (e.g. `"purchases"`); the adapter
 * maps it to whatever the backend uses (a keyed localStorage entry, a
 * Firestore collection, a REST resource, …).
 */
export interface StorageAdapter {
  /** Read every item in the collection. Returns `[]` if the collection is empty or missing. */
  read<T>(collection: string): Promise<T[]>;

  /** Overwrite the collection with `items`. */
  write<T>(collection: string, items: T[]): Promise<void>;

  /** Remove the collection entirely. */
  clear(collection: string): Promise<void>;
}
