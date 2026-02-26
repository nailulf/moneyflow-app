-- Migration: 032_create_wealth_forecast_tables
-- Purpose: Create wealth forecast scenarios and events tables + settings defaults.

CREATE TABLE IF NOT EXISTS public.wealth_forecast_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  horizon_years INTEGER NOT NULL DEFAULT 10,
  expected_annual_return DECIMAL(6, 3) NOT NULL DEFAULT 0.07,
  annual_volatility DECIMAL(6, 3) NOT NULL DEFAULT 0.12,
  inflation_rate DECIMAL(6, 3) NOT NULL DEFAULT 0.03,
  monthly_contribution DECIMAL(15, 2) NOT NULL DEFAULT 0,
  monthly_withdrawal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  include_cashflow BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wealth_forecast_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.wealth_forecast_scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('CONTRIBUTION', 'WITHDRAWAL', 'INCOME', 'EXPENSE', 'ADJUSTMENT')),
  amount DECIMAL(15, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wealth_forecast_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wealth_forecast_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wealth forecast scenarios"
  ON public.wealth_forecast_scenarios FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own wealth forecast scenarios"
  ON public.wealth_forecast_scenarios FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own wealth forecast scenarios"
  ON public.wealth_forecast_scenarios FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own wealth forecast scenarios"
  ON public.wealth_forecast_scenarios FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own wealth forecast events"
  ON public.wealth_forecast_events FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own wealth forecast events"
  ON public.wealth_forecast_events FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own wealth forecast events"
  ON public.wealth_forecast_events FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own wealth forecast events"
  ON public.wealth_forecast_events FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_wealth_forecast_scenarios_user
  ON public.wealth_forecast_scenarios(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wealth_forecast_default_scenario
  ON public.wealth_forecast_scenarios(user_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_wealth_forecast_events_scenario
  ON public.wealth_forecast_events(scenario_id);

CREATE INDEX IF NOT EXISTS idx_wealth_forecast_events_user_date
  ON public.wealth_forecast_events(user_id, event_date DESC);

DROP TRIGGER IF EXISTS update_wealth_forecast_scenarios_updated_at ON public.wealth_forecast_scenarios;
CREATE TRIGGER update_wealth_forecast_scenarios_updated_at
  BEFORE UPDATE ON public.wealth_forecast_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wealth_forecast_events_updated_at ON public.wealth_forecast_events;
CREATE TRIGGER update_wealth_forecast_events_updated_at
  BEFORE UPDATE ON public.wealth_forecast_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS forecast_default_scenario_id UUID,
  ADD COLUMN IF NOT EXISTS forecast_default_horizon_years INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS forecast_default_return DECIMAL(6, 3) DEFAULT 0.07,
  ADD COLUMN IF NOT EXISTS forecast_default_volatility DECIMAL(6, 3) DEFAULT 0.12,
  ADD COLUMN IF NOT EXISTS forecast_default_inflation DECIMAL(6, 3) DEFAULT 0.03;
