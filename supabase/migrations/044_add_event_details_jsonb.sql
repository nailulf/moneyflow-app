-- Migration: 044_add_event_details_jsonb
-- Purpose: Add details JSONB column for category-specific event data (mortgage terms,
--          recurring costs, etc.) and is_enabled toggle for the event list UI.
-- Rationale: Event details are polymorphic per category — PROPERTY needs loan_term/interest_rate,
--          KIDS needs annual_cost/end_age, etc. A JSONB overflow column on the existing wide table
--          is the correct approach per CLAUDE.md ("prefer a single extras JSONB overflow column").

ALTER TABLE public.wealth_forecast_events
  ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE;
