import type { StorageAdapter } from '@/data/storage';
import type { Category } from '@/data/models';
import { BaseRepository } from './BaseRepository';

const COLLECTION = 'categories';

/**
 * CategoryRepository — persistence for product categories managed by the
 * admin (system_blueprint.md §3, "Manage Categories").
 *
 * Adds `getByName` for the auto-suggest flow where a category is looked up
 * from a store's typical category.
 */
export class CategoryRepository extends BaseRepository<Category> {
  constructor(adapter: StorageAdapter) {
    super(adapter, COLLECTION);
  }

  /** Find a category by its (case-insensitive) name. */
  async getByName(name: string): Promise<Category | null> {
    const needle = name.trim().toLowerCase();
    const categories = await this.loadAll();
    return (
      categories.find((category) => category.name.toLowerCase() === needle) ?? null
    );
  }
}
