-- Migration: 042_update_forecast_events_categories
-- Purpose: Replace generic event types with life-event categories per FRD spec.
--          All events are now costs subtracted from net worth.

-- Add name column (default to existing event_type for migration)
ALTER TABLE public.wealth_forecast_events
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Backfill name from event_type for existing rows
UPDATE public.wealth_forecast_events
  SET name = INITCAP(REPLACE(event_type, '_', ' '))
  WHERE name IS NULL;

ALTER TABLE public.wealth_forecast_events
  ALTER COLUMN name SET NOT NULL;

-- Drop old CHECK constraint
ALTER TABLE public.wealth_forecast_events
  DROP CONSTRAINT IF EXISTS wealth_forecast_events_event_type_check;

-- Migrate old event_type values to OTHER BEFORE adding the new constraint
UPDATE public.wealth_forecast_events
  SET event_type = 'OTHER'
  WHERE event_type NOT IN ('WEDDING', 'KIDS', 'EDUCATION', 'PROPERTY', 'HAJJ', 'VEHICLE', 'RETIREMENT', 'OTHER');

-- Now add the new constraint (all rows already comply)
ALTER TABLE public.wealth_forecast_events
  ADD CONSTRAINT wealth_forecast_events_event_type_check
  CHECK (event_type IN ('WEDDING', 'KIDS', 'EDUCATION', 'PROPERTY', 'HAJJ', 'VEHICLE', 'RETIREMENT', 'OTHER'));
