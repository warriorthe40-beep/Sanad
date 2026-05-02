import type { StoreAlias } from '@/data/models';
import { supabase } from '@/lib/supabaseClient';

const TABLE = 'store_aliases';

interface StoreAliasRow {
  id: string;
  user_id: string;
  raw_name: string;
  clean_name: string;
}

function toModel(row: StoreAliasRow): StoreAlias {
  return {
    id: row.id,
    userId: row.user_id,
    rawName: row.raw_name,
    cleanName: row.clean_name,
  };
}

export class StoreAliasRepository {
  async getByUserId(userId: string): Promise<StoreAlias[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data as StoreAliasRow[]).map(toModel);
  }

  /** Insert or update the clean_name for a (user, raw_name) pair. */
  async upsert(userId: string, rawName: string, cleanName: string): Promise<void> {
    const { data: existing, error: selectError } = await supabase
      .from(TABLE)
      .select('id')
      .eq('user_id', userId)
      .eq('raw_name', rawName)
      .maybeSingle();
    if (selectError) throw new Error(selectError.message);

    if (existing) {
      const { error } = await supabase
        .from(TABLE)
        .update({ clean_name: cleanName })
        .eq('id', (existing as { id: string }).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from(TABLE).insert({
        id: crypto.randomUUID(),
        user_id: userId,
        raw_name: rawName,
        clean_name: cleanName,
      });
      if (error) throw new Error(error.message);
    }
  }
}
