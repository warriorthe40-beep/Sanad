import type { Purchase } from '@/data/models';
import type { Entity, Repository } from './Repository';
import { supabase } from '@/lib/supabaseClient';

const TABLE = 'purchases';

// Snake_case shape that Supabase returns / expects
interface PurchaseRow {
  id: string;
  product_name: string | null;
  store_name: string;
  category_name: string;
  price: number;
  purchase_date: string;
  user_id: string;
  warranty_duration: string | null;
  warranty_end_date: string | null;
  return_window: string | null;
  return_end_date: string | null;
  notes: string | null;
}

function toModel(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    productName: row.product_name ?? undefined,
    storeName: row.store_name,
    categoryName: row.category_name,
    price: row.price,
    purchaseDate: new Date(row.purchase_date),
    userId: row.user_id,
    warrantyDuration: row.warranty_duration ?? undefined,
    warrantyEndDate: row.warranty_end_date ? new Date(row.warranty_end_date) : undefined,
    returnWindow: row.return_window ?? undefined,
    returnEndDate: row.return_end_date ? new Date(row.return_end_date) : undefined,
    notes: row.notes ?? undefined,
  };
}

function toRow(id: string, data: Omit<Purchase, 'id'>): PurchaseRow {
  return {
    id,
    product_name: data.productName ?? null,
    store_name: data.storeName,
    category_name: data.categoryName,
    price: data.price,
    purchase_date: data.purchaseDate.toISOString(),
    user_id: data.userId,
    warranty_duration: data.warrantyDuration ?? null,
    warranty_end_date: data.warrantyEndDate?.toISOString() ?? null,
    return_window: data.returnWindow ?? null,
    return_end_date: data.returnEndDate?.toISOString() ?? null,
    notes: data.notes ?? null,
  };
}

// Only map fields that are present in the patch to avoid overwriting with null
function patchToRow(patch: Partial<Omit<Purchase, 'id'>>): Partial<PurchaseRow> {
  const row: Partial<PurchaseRow> = {};
  if ('productName' in patch) row.product_name = patch.productName ?? null;
  if ('storeName' in patch) row.store_name = patch.storeName;
  if ('categoryName' in patch) row.category_name = patch.categoryName;
  if ('price' in patch) row.price = patch.price;
  if ('purchaseDate' in patch) row.purchase_date = patch.purchaseDate?.toISOString();
  if ('userId' in patch) row.user_id = patch.userId;
  if ('warrantyDuration' in patch) row.warranty_duration = patch.warrantyDuration ?? null;
  if ('warrantyEndDate' in patch) row.warranty_end_date = patch.warrantyEndDate?.toISOString() ?? null;
  if ('returnWindow' in patch) row.return_window = patch.returnWindow ?? null;
  if ('returnEndDate' in patch) row.return_end_date = patch.returnEndDate?.toISOString() ?? null;
  if ('notes' in patch) row.notes = patch.notes ?? null;
  return row;
}

export class PurchaseRepository implements Repository<Entity & Purchase> {
  async getAll(): Promise<Purchase[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw new Error(error.message);
    return (data as PurchaseRow[]).map(toModel);
  }

  async getById(id: string): Promise<Purchase | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toModel(data as PurchaseRow) : null;
  }

  async getByUserId(userId: string): Promise<Purchase[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data as PurchaseRow[]).map(toModel);
  }

  async create(input: Omit<Purchase, 'id'>): Promise<Purchase> {
    const id = crypto.randomUUID();
    const row = toRow(id, input);
    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as PurchaseRow);
  }

  async update(id: string, patch: Partial<Omit<Purchase, 'id'>>): Promise<Purchase | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patchToRow(patch))
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data ? toModel(data as PurchaseRow) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from(TABLE)
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async countByStoreName(userId: string, storeName: string): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('store_name', storeName);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async renameStore(userId: string, oldName: string, newName: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ store_name: newName })
      .eq('user_id', userId)
      .eq('store_name', oldName);
    if (error) throw new Error(error.message);
  }
}
