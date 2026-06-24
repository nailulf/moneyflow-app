-- 062_forecast_income_growth.sql
-- Forecast: separate annual income-growth (raise) assumption, distinct from inflation.
ALTER TABLE wealth_forecast_scenarios
  ADD COLUMN IF NOT EXISTS annual_income_growth DECIMAL(6,3) NOT NULL DEFAULT 0;

-- Preserve existing scenarios' behavior (income previously tracked inflation).
UPDATE wealth_forecast_scenarios SET annual_income_growth = inflation_rate;
