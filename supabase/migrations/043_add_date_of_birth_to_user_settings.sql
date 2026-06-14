-- Migration: 043_add_date_of_birth_to_user_settings
-- Purpose: Store user's date of birth for age-based forecast X-axis labels.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;
