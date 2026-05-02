-- ============================================================
-- Migration: store_aliases table
-- Stores per-user mappings from normalized raw receipt store
-- names to user-preferred clean names, enabling fuzzy-match
-- auto-correction at extraction time.
-- Run once in your Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.store_aliases (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_name   text        NOT NULL, -- normalized: lowercase, no special chars
  clean_name text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_aliases_user_raw_unique UNIQUE (user_id, raw_name)
);

ALTER TABLE public.store_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_aliases_select_own"
  ON public.store_aliases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "store_aliases_insert_own"
  ON public.store_aliases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "store_aliases_update_own"
  ON public.store_aliases FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "store_aliases_delete_own"
  ON public.store_aliases FOR DELETE
  USING (auth.uid() = user_id);
