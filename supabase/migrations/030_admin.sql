-- ============================================================
-- Edugine — Admin: plan management columns on profiles
-- Run manually in Supabase SQL Editor.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;
