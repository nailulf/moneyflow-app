-- Migration: 041_add_target_net_worth_to_forecast
-- Purpose: Add target_net_worth column to wealth_forecast_scenarios for success rate computation.

ALTER TABLE public.wealth_forecast_scenarios
  ADD COLUMN IF NOT EXISTS target_net_worth DECIMAL(15, 2) NOT NULL DEFAULT 0;
