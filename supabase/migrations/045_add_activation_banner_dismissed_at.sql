-- Add activation_banner_dismissed_at to user_settings so the
-- post-onboarding activation checklist dismiss state persists
-- across devices (moving away from localStorage).

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS activation_banner_dismissed_at TIMESTAMPTZ;
