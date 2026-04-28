import type { Category } from '@/data/models';
import { supabase } from '@/lib/supabaseClient';

const TABLE = 'categories';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
}

function toModel(row: CategoryRow): Category {
  return { id: row.id, name: row.name, icon: row.icon };
}

/**
 * CategoryRepository — Supabase-backed persistence for categories.
 *
 * RLS on the `categories` table (enforced at the database level):
 *   - SELECT: everyone
 *   - INSERT / UPDATE / DELETE: only UID b789ec30-16a8-471e-b5a1-6b973f4eb0d3
 */
export class CategoryRepository {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return (data as CategoryRow[]).map(toModel);
  }

  async getById(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toModel(data as CategoryRow) : null;
  }

  async getByName(name: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .ilike('name', name.trim())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toModel(data as CategoryRow) : null;
  }

  async create(input: Omit<Category, 'id'>): Promise<Category> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ id: crypto.randomUUID(), name: input.name, icon: input.icon ?? '' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as CategoryRow);
  }

  async update(id: string, patch: Partial<Omit<Category, 'id'>>): Promise<Category | null> {
    const updates: Partial<CategoryRow> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.icon !== undefined) updates.icon = patch.icon;

    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data ? toModel(data as CategoryRow) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from(TABLE)
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }
}
