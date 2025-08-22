-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_preferences_user_key_unique UNIQUE (user_id, preference_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_key ON user_preferences(user_id, preference_key);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with IF NOT EXISTS equivalent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can view their own preferences') THEN
    CREATE POLICY "Users can view their own preferences" ON user_preferences
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can insert their own preferences') THEN
    CREATE POLICY "Users can insert their own preferences" ON user_preferences
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can update their own preferences') THEN
    CREATE POLICY "Users can update their own preferences" ON user_preferences
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can delete their own preferences') THEN
    CREATE POLICY "Users can delete their own preferences" ON user_preferences
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create trigger for updated_at (reuse the function from categories)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert some common default preferences
CREATE OR REPLACE FUNCTION initialize_user_preferences(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES
    (user_uuid, 'default_currency', '"USD"'),
    (user_uuid, 'theme', '"system"'),
    (user_uuid, 'notification_settings', '{"email": true, "push": true, "budget_alerts": true, "transaction_alerts": false}'),
    (user_uuid, 'budget_alerts', '{"enabled": true, "threshold": 80}')
  ON CONFLICT (user_id, preference_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;