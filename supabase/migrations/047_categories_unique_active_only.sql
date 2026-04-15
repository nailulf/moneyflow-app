-- Migration: relax the categories uniqueness rule so it only applies to
-- ACTIVE rows. The original constraint (migration 001) enforces
-- UNIQUE (user_id, name, group_type) across the whole table — which means
-- a soft-deleted category permanently squats on its (name, group) slot,
-- causing collisions when a user tries to recreate or rename a category
-- to an old value.
--
-- We replace the table-level constraint with a partial unique index that
-- only enforces uniqueness when `is_active = true`, matching how the rest
-- of the app already filters categories.

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_user_name_group_unique;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_group_active_unique
  ON categories (user_id, name, group_type)
  WHERE is_active = true;
