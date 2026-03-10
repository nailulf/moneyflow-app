-- Add new asset account types: PROPERTY, VEHICLE, MORTGAGE
-- Drop the existing check constraint and replace with expanded one
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('BANK', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER', 'PROPERTY', 'VEHICLE', 'MORTGAGE'));

-- Add asset-specific columns (wide table, per DB design principles)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('HOUSE', 'APARTMENT', 'LAND')),
  ADD COLUMN IF NOT EXISTS asset_location TEXT,
  ADD COLUMN IF NOT EXISTS depreciation_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS monthly_payment DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS mortgage_end_date DATE;

COMMENT ON COLUMN accounts.property_type IS 'For PROPERTY accounts: HOUSE, APARTMENT, or LAND';
COMMENT ON COLUMN accounts.asset_location IS 'For PROPERTY accounts: optional location/address';
COMMENT ON COLUMN accounts.depreciation_rate IS 'For VEHICLE accounts: annual depreciation rate as a percentage (e.g. 15.00 = 15%)';
COMMENT ON COLUMN accounts.monthly_payment IS 'For MORTGAGE accounts: monthly payment amount';
COMMENT ON COLUMN accounts.mortgage_end_date IS 'For MORTGAGE accounts: final payment date (end of mortgage term)';
