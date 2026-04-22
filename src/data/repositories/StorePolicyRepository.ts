import type { StorePolicy } from '@/data/models';
import type { Entity, Repository } from './Repository';
import { supabase } from '@/lib/supabaseClient';

const TABLE = 'store_policies';

interface StorePolicyRow {
  id: string;
  store_id: string;
  category_id: string;
  typical_warranty: string;
  typical_return_window: string;
  report_count: number;
}

function toModel(row: StorePolicyRow): StorePolicy {
  return {
    id: row.id,
    storeId: row.store_id,
    categoryId: row.category_id,
    typicalWarranty: row.typical_warranty,
    typicalReturnWindow: row.typical_return_window,
    reportCount: row.report_count,
  };
}

function toRow(id: string, data: Omit<StorePolicy, 'id'>): StorePolicyRow {
  return {
    id,
    store_id: data.storeId,
    category_id: data.categoryId,
    typical_warranty: data.typicalWarranty,
    typical_return_window: data.typicalReturnWindow,
    report_count: data.reportCount,
  };
}

function patchToRow(patch: Partial<Omit<StorePolicy, 'id'>>): Partial<StorePolicyRow> {
  const row: Partial<StorePolicyRow> = {};
  if ('storeId' in patch) row.store_id = patch.storeId;
  if ('categoryId' in patch) row.category_id = patch.categoryId;
  if ('typicalWarranty' in patch) row.typical_warranty = patch.typicalWarranty;
  if ('typicalReturnWindow' in patch) row.typical_return_window = patch.typicalReturnWindow;
  if ('reportCount' in patch) row.report_count = patch.reportCount;
  return row;
}

export class StorePolicyRepository implements Repository<Entity & StorePolicy> {
  async getAll(): Promise<StorePolicy[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw new Error(error.message);
    return (data as StorePolicyRow[]).map(toModel);
  }

  async getById(id: string): Promise<StorePolicy | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toModel(data as StorePolicyRow) : null;
  }

  /** Community suggestion for a specific (store, category) pair. */
  async getByStoreAndCategory(
    storeId: string,
    categoryId: string
  ): Promise<StorePolicy | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('store_id', storeId)
      .eq('category_id', categoryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toModel(data as StorePolicyRow) : null;
  }

  /** All policies for a given store across categories. */
  async getByStore(storeId: string): Promise<StorePolicy[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('store_id', storeId);
    if (error) throw new Error(error.message);
    return (data as StorePolicyRow[]).map(toModel);
  }

  async create(input: Omit<StorePolicy, 'id'>): Promise<StorePolicy> {
    const id = crypto.randomUUID();
    const row = toRow(id, input);
    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as StorePolicyRow);
  }

  async update(
    id: string,
    patch: Partial<Omit<StorePolicy, 'id'>>
  ): Promise<StorePolicy | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patchToRow(patch))
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data ? toModel(data as StorePolicyRow) : null;
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
