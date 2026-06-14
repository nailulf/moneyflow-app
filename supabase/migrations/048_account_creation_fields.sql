-- Account-creation fields for the mobile per-type creation flow (spec: wallets-accounts-revamp).
-- 1. New account type: DIGITAL_WALLET (GoPay/OVO-style wallets, grouped separately from BANK/CASH).
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('BANK', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER', 'PROPERTY', 'VEHICLE', 'MORTGAGE', 'DIGITAL_WALLET'));

-- 2. Per-type creation fields (wide table, per DB design principles; all nullable).
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(14,2) CHECK (credit_limit >= 0),
  ADD COLUMN IF NOT EXISTS statement_day SMALLINT CHECK (statement_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('CAR', 'MOTORCYCLE', 'TRUCK')),
  ADD COLUMN IF NOT EXISTS broker TEXT,
  ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) CHECK (interest_rate >= 0),
  ADD COLUMN IF NOT EXISTS loan_term_months SMALLINT CHECK (loan_term_months > 0),
  ADD COLUMN IF NOT EXISTS down_payment DECIMAL(14,2) CHECK (down_payment >= 0),
  ADD COLUMN IF NOT EXISTS investment_goal TEXT;

COMMENT ON COLUMN accounts.purchase_date IS 'For PROPERTY/VEHICLE accounts: acquisition date';
COMMENT ON COLUMN accounts.credit_limit IS 'For CREDIT_CARD accounts: credit limit';
COMMENT ON COLUMN accounts.statement_day IS 'For CREDIT_CARD accounts: statement day of month (1-31)';
COMMENT ON COLUMN accounts.due_day IS 'For CREDIT_CARD accounts: payment due day of month (1-31)';
COMMENT ON COLUMN accounts.vehicle_type IS 'For VEHICLE accounts: CAR, MOTORCYCLE, or TRUCK';
COMMENT ON COLUMN accounts.broker IS 'For INVESTMENT accounts: broker/platform name';
COMMENT ON COLUMN accounts.interest_rate IS 'For MORTGAGE accounts: annual interest rate percentage';
COMMENT ON COLUMN accounts.loan_term_months IS 'For MORTGAGE accounts: loan term in months';
COMMENT ON COLUMN accounts.down_payment IS 'For PROPERTY accounts: down payment amount';
COMMENT ON COLUMN accounts.investment_goal IS 'For INVESTMENT accounts: display-only goal label (not a financial_goals row)';
