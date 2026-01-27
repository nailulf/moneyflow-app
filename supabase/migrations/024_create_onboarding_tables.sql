-- Migration: Create onboarding tables for user setup flow
-- This migration creates tables to track user onboarding state, events, and budget templates

-- ============================================================================
-- User Onboarding State Table
-- ============================================================================
-- Tracks the current onboarding state for each user

CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_phase TEXT NOT NULL DEFAULT 'welcome' CHECK (
    current_phase IN ('welcome', 'account_setup', 'categories', 'budget_setup', 'completed')
  ),
  current_step INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_skipped BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment on the table
COMMENT ON TABLE public.user_onboarding IS 'Tracks onboarding state and progress for each user';
COMMENT ON COLUMN public.user_onboarding.current_phase IS 'Current phase of onboarding: welcome, account_setup, categories, budget_setup, or completed';
COMMENT ON COLUMN public.user_onboarding.current_step IS 'Step number within the current phase (0-indexed)';

-- ============================================================================
-- Onboarding Events Table
-- ============================================================================
-- Logs analytics events during onboarding for tracking and metrics

CREATE TABLE IF NOT EXISTS public.onboarding_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('phase_started', 'phase_completed', 'step_completed', 'skipped', 'resumed', 'completed')
  ),
  phase TEXT,
  step INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment on the table
COMMENT ON TABLE public.onboarding_events IS 'Logs onboarding analytics events for tracking user progress and drop-off points';

-- ============================================================================
-- Budget Templates Table
-- ============================================================================
-- Predefined budget allocation templates users can choose during onboarding

CREATE TABLE IF NOT EXISTS public.budget_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  allocations JSONB NOT NULL,
  category_mappings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment on the table
COMMENT ON TABLE public.budget_templates IS 'Predefined budget templates for onboarding (e.g., 50/30/20 rule)';
COMMENT ON COLUMN public.budget_templates.allocations IS 'JSON object with allocation percentages, e.g., {"needs": 50, "wants": 30, "savings": 20}';
COMMENT ON COLUMN public.budget_templates.category_mappings IS 'JSON object mapping allocation keys to category names, e.g., {"needs": ["Food & Dining", "Bills & Utilities"]}';

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON public.user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_phase ON public.user_onboarding(current_phase);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_status ON public.user_onboarding(is_completed, is_skipped);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_user_id ON public.onboarding_events(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_type ON public.onboarding_events(event_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_created ON public.onboarding_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_templates_active ON public.budget_templates(is_active, sort_order);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;

-- User onboarding policies
CREATE POLICY "Users can view their own onboarding state" ON public.user_onboarding
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding state" ON public.user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding state" ON public.user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Onboarding events policies
CREATE POLICY "Users can view their own onboarding events" ON public.onboarding_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding events" ON public.onboarding_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Budget templates policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view active budget templates" ON public.budget_templates
  FOR SELECT TO authenticated USING (is_active = true);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Create or replace update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for user_onboarding
DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Seed Default Budget Templates
-- ============================================================================

INSERT INTO public.budget_templates (name, description, allocations, category_mappings, sort_order) VALUES
  (
    '50/30/20 Rule',
    'A popular budgeting method: 50% for needs, 30% for wants, 20% for savings and debt repayment',
    '{"needs": 50, "wants": 30, "savings": 20}',
    '{"needs": ["Food & Dining", "Transportation", "Bills & Utilities", "Healthcare"], "wants": ["Shopping", "Entertainment", "Travel"], "savings": ["Savings transfer"]}',
    1
  ),
  (
    'Conservative Saver',
    'Focus on saving more: 40% for needs, 20% for wants, 40% for savings',
    '{"needs": 40, "wants": 20, "savings": 40}',
    '{"needs": ["Food & Dining", "Transportation", "Bills & Utilities", "Healthcare"], "wants": ["Shopping", "Entertainment"], "savings": ["Savings transfer"]}',
    2
  ),
  (
    'Balanced Budget',
    'An even distribution: 45% for needs, 35% for wants, 20% for savings',
    '{"needs": 45, "wants": 35, "savings": 20}',
    '{"needs": ["Food & Dining", "Transportation", "Bills & Utilities", "Healthcare", "Education"], "wants": ["Shopping", "Entertainment", "Travel"], "savings": ["Savings transfer"]}',
    3
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Backfill function for existing users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_onboarding_for_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Check if user already has onboarding record
  IF EXISTS (SELECT 1 FROM public.user_onboarding WHERE user_id = target_user_id) THEN
    RETURN;
  END IF;

  -- Create onboarding record with completed status for existing users
  -- (they've already been using the app without onboarding)
  INSERT INTO public.user_onboarding (user_id, current_phase, is_completed, completed_at)
  VALUES (target_user_id, 'completed', true, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.backfill_onboarding_for_user(UUID) IS
  'Creates an onboarding record for existing users, marking them as completed';

-- Backfill all existing users
DO $$
DECLARE
  user_record RECORD;
  backfill_count INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.user_onboarding uo ON p.id = uo.user_id
    WHERE uo.id IS NULL
  LOOP
    PERFORM public.backfill_onboarding_for_user(user_record.user_id);
    backfill_count := backfill_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled onboarding records for % existing users', backfill_count;
END $$;
