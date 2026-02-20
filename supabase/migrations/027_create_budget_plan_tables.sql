-- Budget Redesign: Create budget_plans, budget_plan_categories, budget_snapshots, budget_snapshot_categories
-- See docs/features/budget-redesign-prd.md for full context

-- ============================================================
-- 1. budget_plans — one monthly + one yearly plan per user
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period VARCHAR(10) NOT NULL CHECK (period IN ('monthly', 'yearly')),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT budget_plans_user_period_unique UNIQUE (user_id, period)
);

-- ============================================================
-- 2. budget_plan_categories — categories allocated in a plan
--    UNIQUE(category_id) enforces cross-plan exclusivity:
--    a category can only appear in ONE plan (monthly OR yearly)
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_plan_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES budget_plans(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),

  CONSTRAINT budget_plan_categories_plan_cat UNIQUE (plan_id, category_id),
  CONSTRAINT budget_plan_categories_exclusivity UNIQUE (category_id)
);

-- ============================================================
-- 3. budget_snapshots — immutable record per period
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period VARCHAR(10) NOT NULL CHECK (period IN ('monthly', 'yearly')),
  year INTEGER NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT budget_snapshots_unique UNIQUE (user_id, period, year, month),
  CONSTRAINT budget_snapshots_period_month_check CHECK (
    (period = 'monthly' AND month IS NOT NULL) OR
    (period = 'yearly' AND month IS NULL)
  )
);

-- ============================================================
-- 4. budget_snapshot_categories — frozen category allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_snapshot_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES budget_snapshots(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount >= 0),

  CONSTRAINT budget_snapshot_categories_unique UNIQUE (snapshot_id, category_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_budget_plans_user_period ON budget_plans(user_id, period);
CREATE INDEX IF NOT EXISTS idx_budget_plan_categories_plan_id ON budget_plan_categories(plan_id);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_user_period_year_month ON budget_snapshots(user_id, period, year, month);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_status ON budget_snapshots(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_budget_snapshot_categories_snapshot_id ON budget_snapshot_categories(snapshot_id);

-- ============================================================
-- Triggers (reuse existing update_updated_at_column function)
-- ============================================================
CREATE TRIGGER update_budget_plans_updated_at
  BEFORE UPDATE ON budget_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_plan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_snapshot_categories ENABLE ROW LEVEL SECURITY;

-- budget_plans policies
CREATE POLICY "Users can view their own budget plans" ON budget_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget plans" ON budget_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget plans" ON budget_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget plans" ON budget_plans
  FOR DELETE USING (auth.uid() = user_id);

-- budget_plan_categories policies (via parent plan ownership)
CREATE POLICY "Users can view their own budget plan categories" ON budget_plan_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budget_plans
      WHERE budget_plans.id = budget_plan_categories.plan_id
      AND budget_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own budget plan categories" ON budget_plan_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_plans
      WHERE budget_plans.id = budget_plan_categories.plan_id
      AND budget_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own budget plan categories" ON budget_plan_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM budget_plans
      WHERE budget_plans.id = budget_plan_categories.plan_id
      AND budget_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own budget plan categories" ON budget_plan_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM budget_plans
      WHERE budget_plans.id = budget_plan_categories.plan_id
      AND budget_plans.user_id = auth.uid()
    )
  );

-- budget_snapshots policies
CREATE POLICY "Users can view their own budget snapshots" ON budget_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget snapshots" ON budget_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policies for snapshots — they are immutable for end users.
-- The service role key (used by cron) bypasses RLS to update status.

-- budget_snapshot_categories policies (via parent snapshot ownership)
CREATE POLICY "Users can view their own budget snapshot categories" ON budget_snapshot_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budget_snapshots
      WHERE budget_snapshots.id = budget_snapshot_categories.snapshot_id
      AND budget_snapshots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own budget snapshot categories" ON budget_snapshot_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_snapshots
      WHERE budget_snapshots.id = budget_snapshot_categories.snapshot_id
      AND budget_snapshots.user_id = auth.uid()
    )
  );

-- ============================================================
-- Permissions
-- ============================================================
GRANT ALL ON budget_plans TO authenticated;
GRANT ALL ON budget_plan_categories TO authenticated;
GRANT ALL ON budget_snapshots TO authenticated;
GRANT ALL ON budget_snapshot_categories TO authenticated;
