-- ============================================================
-- Migration: categories table
-- Run this once in your Supabase SQL editor.
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '',
  CONSTRAINT categories_name_unique UNIQUE (name)
);

-- 2. Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- All authenticated (and anon) users can read
CREATE POLICY "categories_select_all"
  ON public.categories
  FOR SELECT
  USING (true);

-- Only the designated admin UID can write
CREATE POLICY "categories_insert_admin"
  ON public.categories
  FOR INSERT
  WITH CHECK (auth.uid() = 'b789ec30-16a8-471e-b5a1-6b973f4eb0d3'::uuid);

CREATE POLICY "categories_update_admin"
  ON public.categories
  FOR UPDATE
  USING  (auth.uid() = 'b789ec30-16a8-471e-b5a1-6b973f4eb0d3'::uuid)
  WITH CHECK (auth.uid() = 'b789ec30-16a8-471e-b5a1-6b973f4eb0d3'::uuid);

CREATE POLICY "categories_delete_admin"
  ON public.categories
  FOR DELETE
  USING  (auth.uid() = 'b789ec30-16a8-471e-b5a1-6b973f4eb0d3'::uuid);

-- 3. Enable real-time replication so Supabase subscriptions work
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

-- 4. Seed initial categories
INSERT INTO public.categories (name, icon) VALUES
  ('Foods and Drinks',        '🍔'),
  ('Transportation',          '🚗'),
  ('Bills and Subscriptions', '📄'),
  ('Rent',                    '🏠'),
  ('Clothing',                '👕'),
  ('Cleaning',                '🧹'),
  ('Electronics',             '💻'),
  ('Health',                  '❤️'),
  ('Beauty',                  '💄'),
  ('Groceries',               '🛒'),
  ('Entertainment',           '🎬'),
  ('Education',               '📚'),
  ('Repairs',                 '🔧'),
  ('Other',                   '🏷️')
ON CONFLICT (name) DO NOTHING;
