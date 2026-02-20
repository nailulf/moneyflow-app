-- Budget Redesign: Migrate existing budgets → budget_plans + budget_snapshots
-- This migration is idempotent (uses ON CONFLICT DO NOTHING)

-- ============================================================
-- 1. Create budget_plans from the most recent active budget per user+period
-- ============================================================
INSERT INTO budget_plans (user_id, period, total_amount, currency, created_at, updated_at)
SELECT DISTINCT ON (b.user_id, b.period)
  b.user_id,
  b.period,
  b.total_amount,
  b.currency,
  b.created_at,
  b.updated_at
FROM budgets b
WHERE b.is_active = true
ORDER BY b.user_id, b.period, b.year DESC, b.month DESC NULLS LAST, b.updated_at DESC
ON CONFLICT (user_id, period) DO NOTHING;

-- ============================================================
-- 2. Copy budget_categories into budget_plan_categories
--    Skip 'others-category' pseudo entries (not a valid UUID FK)
-- ============================================================
INSERT INTO budget_plan_categories (plan_id, category_id, allocated_amount)
SELECT
  bp.id AS plan_id,
  bc.category_id,
  bc.allocated_amount
FROM budget_plans bp
INNER JOIN budgets b ON b.user_id = bp.user_id AND b.period = bp.period AND b.is_active = true
INNER JOIN budget_categories bc ON bc.budget_id = b.id
WHERE bc.category_id::text != 'others-category'
  AND bc.category_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  -- Pick categories from the same budget row that was used for the plan
  AND b.id = (
    SELECT b2.id FROM budgets b2
    WHERE b2.user_id = bp.user_id AND b2.period = bp.period AND b2.is_active = true
    ORDER BY b2.year DESC, b2.month DESC NULLS LAST, b2.updated_at DESC
    LIMIT 1
  )
ON CONFLICT (category_id) DO NOTHING;

-- ============================================================
-- 3. Create budget_snapshots from ALL existing budget rows
-- ============================================================
INSERT INTO budget_snapshots (user_id, period, year, month, total_amount, currency, status, created_at)
SELECT
  b.user_id,
  b.period,
  b.year,
  b.month,
  b.total_amount,
  b.currency,
  CASE
    WHEN b.period = 'monthly'
      AND b.year = EXTRACT(YEAR FROM NOW())::INTEGER
      AND b.month = EXTRACT(MONTH FROM NOW())::INTEGER
    THEN 'active'
    WHEN b.period = 'yearly'
      AND b.year = EXTRACT(YEAR FROM NOW())::INTEGER
      AND b.month IS NULL
    THEN 'active'
    ELSE 'closed'
  END AS status,
  b.created_at
FROM budgets b
WHERE b.is_active = true
ON CONFLICT (user_id, period, year, month) DO NOTHING;

-- ============================================================
-- 4. Copy budget_categories into budget_snapshot_categories
--    Skip 'others-category' pseudo entries
-- ============================================================
INSERT INTO budget_snapshot_categories (snapshot_id, category_id, allocated_amount)
SELECT
  bs.id AS snapshot_id,
  bc.category_id,
  bc.allocated_amount
FROM budget_snapshots bs
INNER JOIN budgets b ON b.user_id = bs.user_id
  AND b.period = bs.period
  AND b.year = bs.year
  AND ((b.month IS NULL AND bs.month IS NULL) OR b.month = bs.month)
  AND b.is_active = true
INNER JOIN budget_categories bc ON bc.budget_id = b.id
WHERE bc.category_id::text != 'others-category'
  AND bc.category_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (snapshot_id, category_id) DO NOTHING;
