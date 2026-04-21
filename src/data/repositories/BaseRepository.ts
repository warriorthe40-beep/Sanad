import type { StorageAdapter } from '@/data/storage';
import type { Entity, Repository } from './Repository';

/**
 * BaseRepository — generic CRUD implementation powered by any StorageAdapter.
 *
 * Concrete repositories extend this class, pass a collection name + the list
 * of Date-typed fields on the entity (so JSON round-tripping preserves Dates),
 * and add any entity-specific query methods they need on top.
 *
 * The base itself is backend-agnostic; it only knows about its adapter.
 */
export abstract class BaseRepository<T extends Entity> implements Repository<T> {
  constructor(
    protected readonly adapter: StorageAdapter,
    protected readonly collection: string,
    /**
     * Fields on `T` that hold Date values. Listed here so round-tripping
     * through JSON (ISO string ↔ Date) stays lossless without reflection
     * tricks or a broad regex-based reviver.
     */
    protected readonly dateFields: ReadonlyArray<keyof T> = []
  ) {}

  async getAll(): Promise<T[]> {
    return this.loadAll();
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.loadAll();
    return items.find((item) => item.id === id) ?? null;
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const items = await this.loadAll();
    const entity = { ...(data as object), id: this.newId() } as T;
    items.push(entity);
    await this.saveAll(items);
    return entity;
  }

  async update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const items = await this.loadAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated = { ...items[index], ...patch, id } as T;
    items[index] = updated;
    await this.saveAll(items);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const items = await this.loadAll();
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await this.saveAll(next);
    return true;
  }

  /** Wipe the entire collection. Useful for tests and seed resets. */
  async clear(): Promise<void> {
    await this.adapter.clear(this.collection);
  }

  protected async loadAll(): Promise<T[]> {
    const raw = await this.adapter.read<Record<string, unknown>>(this.collection);
    return raw.map((item) => this.deserialize(item));
  }

  protected async saveAll(items: T[]): Promise<void> {
    await this.adapter.write(
      this.collection,
      items.map((item) => this.serialize(item))
    );
  }

  protected serialize(item: T): Record<string, unknown> {
    const copy: Record<string, unknown> = { ...(item as object) };
    for (const field of this.dateFields) {
      const value = copy[field as string];
      if (value instanceof Date) {
        copy[field as string] = value.toISOString();
      }
    }
    return copy;
  }

  protected deserialize(raw: Record<string, unknown>): T {
    const copy: Record<string, unknown> = { ...raw };
    for (const field of this.dateFields) {
      const value = copy[field as string];
      if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          copy[field as string] = parsed;
        }
      }
    }
    return copy as T;
  }

  protected newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
