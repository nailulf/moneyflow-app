-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  period VARCHAR(10) NOT NULL CHECK (period IN ('monthly', 'yearly')),
  year INTEGER NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT budgets_user_period_unique UNIQUE (user_id, period, year, month),
  CONSTRAINT budgets_monthly_month_required CHECK (
    (period = 'monthly' AND month IS NOT NULL) OR 
    (period = 'yearly' AND month IS NULL)
  )
);

-- Create budget_categories table
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category_id VARCHAR(255) NOT NULL,
  allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount >= 0),
  spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT budget_categories_unique UNIQUE (budget_id, category_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period_year_month ON budgets(period, year, month);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id ON budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_category_id ON budget_categories(category_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_budgets_updated_at 
  BEFORE UPDATE ON budgets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_categories_updated_at 
  BEFORE UPDATE ON budget_categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budgets
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for budget_categories
CREATE POLICY "Users can view their own budget categories" ON budget_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own budget categories" ON budget_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own budget categories" ON budget_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own budget categories" ON budget_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- Create function to calculate spent amounts
CREATE OR REPLACE FUNCTION calculate_budget_spent_amounts(budget_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE budget_categories 
  SET spent_amount = COALESCE((
    SELECT SUM(ABS(t.amount))
    FROM transactions t
    INNER JOIN budgets b ON b.id = budget_id_param
    WHERE t.category_id = budget_categories.category_id
      AND t.type = 'EXPENSE'
      AND t.user_id = b.user_id
      AND (
        (b.period = 'monthly' AND 
         EXTRACT(YEAR FROM t.date::date) = b.year AND 
         EXTRACT(MONTH FROM t.date::date) = b.month) OR
        (b.period = 'yearly' AND 
         EXTRACT(YEAR FROM t.date::date) = b.year)
      )
  ), 0)
  WHERE budget_categories.budget_id = budget_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON budgets TO authenticated;
GRANT ALL ON budget_categories TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_budget_spent_amounts(UUID) TO authenticated;