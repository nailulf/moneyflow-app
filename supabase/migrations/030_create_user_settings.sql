-- Migration: Replace user_preferences (EAV) with user_settings (wide table)
-- Each preference becomes a typed column, one row per user.

-- 1. Create the wide table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id                UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  language               TEXT NOT NULL DEFAULT 'en'
                           CHECK (language IN ('en', 'id')),
  default_currency       TEXT NOT NULL DEFAULT 'IDR',
  country                TEXT,
  user_goal              TEXT,
  theme                  TEXT NOT NULL DEFAULT 'system'
                           CHECK (theme IN ('light', 'dark', 'system')),
  notification_settings  JSONB NOT NULL DEFAULT '{"email":true,"push":true,"budget_alerts":true,"transaction_alerts":false}',
  budget_alert_threshold INTEGER NOT NULL DEFAULT 80,
  extras                 JSONB NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Migrate existing rows from user_preferences (EAV pivot → single row per user)
-- preference_value #>> '{}' extracts a JSONB scalar as text (handles values stored as JSON strings like '"en"')
INSERT INTO user_settings (user_id, language, default_currency, country, user_goal, created_at)
SELECT
  user_id,
  COALESCE(MAX(CASE WHEN preference_key = 'language'         THEN preference_value #>> '{}' END), 'en'),
  COALESCE(MAX(CASE WHEN preference_key = 'default_currency' THEN preference_value #>> '{}' END), 'IDR'),
  MAX(CASE WHEN preference_key = 'country'                   THEN preference_value #>> '{}' END),
  MAX(CASE WHEN preference_key = 'user_goal'                 THEN preference_value #>> '{}' END),
  MIN(created_at)
FROM user_preferences
GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;

-- 3. Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Drop the old EAV table (data fully migrated above)
DROP TABLE IF EXISTS user_preferences;
