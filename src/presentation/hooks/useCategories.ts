import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Returns the list of category names (sorted A-Z) from Supabase, and
 * keeps them live via a postgres_changes real-time subscription.
 * Any category add/rename/delete by the admin is reflected immediately
 * in every open dropdown without a page reload.
 */
export function useCategories(): string[] {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('name')
        .order('name');
      setCategories((data ?? []).map((r: { name: string }) => r.name));
    }

    void fetchCategories();

    const channel = supabase
      .channel('categories-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => void fetchCategories()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return categories;
}
