export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          user_id: string
          date: string
          description: string
          amount: number
          type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
          category_id: string
          account_id: string | null
          to_account_id: string | null
          currency: string
          merchant: string | null
          notes: string | null
          tags: string[] | null
          is_recurring: boolean
          recurring_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_end_date: string | null
          last_processed_date: string | null
          statement_id: string | null
          raw_data: string | null
          posting_date: string | null
          is_duplicate: boolean
          duplicate_of: string | null
          is_balance_adjustment: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          description: string
          amount: number
          type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
          category_id?: string
          account_id?: string | null
          to_account_id?: string | null
          currency?: string
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          is_recurring?: boolean
          recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_end_date?: string | null
          last_processed_date?: string | null
          statement_id?: string | null
          raw_data?: string | null
          posting_date?: string | null
          is_duplicate?: boolean
          duplicate_of?: string | null
          is_balance_adjustment?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          description?: string
          amount?: number
          type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
          category_id?: string
          account_id?: string | null
          to_account_id?: string | null
          currency?: string
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          is_recurring?: boolean
          recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_end_date?: string | null
          last_processed_date?: string | null
          statement_id?: string | null
          raw_data?: string | null
          posting_date?: string | null
          is_duplicate?: boolean
          duplicate_of?: string | null
          is_balance_adjustment?: boolean
          updated_at?: string
        }
      }
      statements: {
        Row: {
          id: string
          user_id: string
          account_id: string
          file_name: string
          file_size: number
          file_checksum: string
          bank_name: string
          statement_period_start: string | null
          statement_period_end: string | null
          total_transactions: number
          processing_status: 'processing' | 'completed' | 'failed'
          raw_metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          file_name: string
          file_size: number
          file_checksum: string
          bank_name: string
          statement_period_start?: string | null
          statement_period_end?: string | null
          total_transactions?: number
          processing_status?: 'processing' | 'completed' | 'failed'
          raw_metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          file_name?: string
          file_size?: number
          file_checksum?: string
          bank_name?: string
          statement_period_start?: string | null
          statement_period_end?: string | null
          total_transactions?: number
          processing_status?: 'processing' | 'completed' | 'failed'
          raw_metadata?: any | null
          updated_at?: string
        }
      }
      account_balance_adjustments: {
        Row: {
          id: string
          account_id: string
          user_id: string
          previous_balance: number
          new_balance: number
          adjustment_amount: number
          note: string | null
          adjustment_date: string
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          user_id: string
          previous_balance: number
          new_balance: number
          adjustment_amount: number
          note?: string | null
          adjustment_date?: string
          created_at?: string
        }
        Update: Record<string, never>
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER' | 'PROPERTY' | 'VEHICLE' | 'MORTGAGE' | 'DIGITAL_WALLET'
          balance: number
          currency: string
          is_default: boolean
          is_active: boolean
          description: string | null
          property_type: 'HOUSE' | 'APARTMENT' | 'LAND' | null
          asset_location: string | null
          depreciation_rate: number | null
          monthly_payment: number | null
          mortgage_end_date: string | null
          purchase_date: string | null
          credit_limit: number | null
          statement_day: number | null
          due_day: number | null
          vehicle_type: 'CAR' | 'MOTORCYCLE' | 'TRUCK' | null
          broker: string | null
          interest_rate: number | null
          loan_term_months: number | null
          down_payment: number | null
          investment_goal: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER' | 'PROPERTY' | 'VEHICLE' | 'MORTGAGE' | 'DIGITAL_WALLET'
          balance?: number
          currency?: string
          is_default?: boolean
          is_active?: boolean
          description?: string | null
          property_type?: 'HOUSE' | 'APARTMENT' | 'LAND' | null
          asset_location?: string | null
          depreciation_rate?: number | null
          monthly_payment?: number | null
          mortgage_end_date?: string | null
          purchase_date?: string | null
          credit_limit?: number | null
          statement_day?: number | null
          due_day?: number | null
          vehicle_type?: 'CAR' | 'MOTORCYCLE' | 'TRUCK' | null
          broker?: string | null
          interest_rate?: number | null
          loan_term_months?: number | null
          down_payment?: number | null
          investment_goal?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER' | 'PROPERTY' | 'VEHICLE' | 'MORTGAGE' | 'DIGITAL_WALLET'
          balance?: number
          currency?: string
          is_default?: boolean
          is_active?: boolean
          description?: string | null
          property_type?: 'HOUSE' | 'APARTMENT' | 'LAND' | null
          asset_location?: string | null
          depreciation_rate?: number | null
          monthly_payment?: number | null
          mortgage_end_date?: string | null
          purchase_date?: string | null
          credit_limit?: number | null
          statement_day?: number | null
          due_day?: number | null
          vehicle_type?: 'CAR' | 'MOTORCYCLE' | 'TRUCK' | null
          broker?: string | null
          interest_rate?: number | null
          loan_term_months?: number | null
          down_payment?: number | null
          investment_goal?: string | null
          updated_at?: string
        }
      }
      uploaded_files: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_path: string
          file_type: string
          status: 'pending' | 'processing' | 'completed' | 'error'
          processed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_path: string
          file_type: string
          status?: 'pending' | 'processing' | 'completed' | 'error'
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_path?: string
          file_type?: string
          status?: 'pending' | 'processing' | 'completed' | 'error'
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      category_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM'
          color: string
          icon: string | null
          is_default: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM'
          color?: string
          icon?: string | null
          is_default?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM'
          color?: string
          icon?: string | null
          is_default?: boolean
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          group_type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
          category_group_id: string
          is_custom: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          group_type?: 'EXPENSE' | 'INCOME' | 'TRANSFER'
          category_group_id?: string
          is_custom?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          group_type?: 'EXPENSE' | 'INCOME' | 'TRANSFER'
          category_group_id?: string | null
          is_custom?: boolean
          is_active?: boolean
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          language: string
          default_currency: string
          country: string | null
          user_goal: string | null
          theme: string
          notification_settings: Record<string, boolean>
          budget_alert_threshold: number
          forecast_default_scenario_id: string | null
          forecast_default_horizon_years: number
          forecast_default_return: number
          forecast_default_volatility: number
          forecast_default_inflation: number
          date_of_birth: string | null
          activation_banner_dismissed_at: string | null
          extras: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          language?: string
          default_currency?: string
          country?: string | null
          user_goal?: string | null
          theme?: string
          notification_settings?: Record<string, boolean>
          budget_alert_threshold?: number
          forecast_default_scenario_id?: string | null
          forecast_default_horizon_years?: number
          forecast_default_return?: number
          forecast_default_volatility?: number
          forecast_default_inflation?: number
          date_of_birth?: string | null
          activation_banner_dismissed_at?: string | null
          extras?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          language?: string
          default_currency?: string
          country?: string | null
          user_goal?: string | null
          theme?: string
          notification_settings?: Record<string, boolean>
          budget_alert_threshold?: number
          forecast_default_scenario_id?: string | null
          forecast_default_horizon_years?: number
          forecast_default_return?: number
          forecast_default_volatility?: number
          forecast_default_inflation?: number
          date_of_birth?: string | null
          activation_banner_dismissed_at?: string | null
          extras?: Record<string, unknown>
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          name: string
          total_amount: number
          period: 'monthly' | 'yearly'
          year: number
          month: number | null
          currency: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          total_amount: number
          period: 'monthly' | 'yearly'
          year: number
          month?: number | null
          currency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          total_amount?: number
          period?: 'monthly' | 'yearly'
          year?: number
          month?: number | null
          currency?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      budget_categories: {
        Row: {
          id: string
          budget_id: string
          category_id: string
          allocated_amount: number
          spent_amount: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          budget_id: string
          category_id: string
          allocated_amount: number
          spent_amount?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          budget_id?: string
          category_id?: string
          allocated_amount?: number
          spent_amount?: number
          currency?: string
          updated_at?: string
        }
      }
      user_onboarding: {
        Row: {
          id: string
          user_id: string
          current_phase: 'welcome' | 'account_setup' | 'categories' | 'budget_setup' | 'completed'
          current_step: number
          is_completed: boolean
          is_skipped: boolean
          completed_at: string | null
          skipped_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          current_phase?: 'welcome' | 'account_setup' | 'categories' | 'budget_setup' | 'completed'
          current_step?: number
          is_completed?: boolean
          is_skipped?: boolean
          completed_at?: string | null
          skipped_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          current_phase?: 'welcome' | 'account_setup' | 'categories' | 'budget_setup' | 'completed'
          current_step?: number
          is_completed?: boolean
          is_skipped?: boolean
          completed_at?: string | null
          skipped_at?: string | null
          updated_at?: string
        }
      }
      onboarding_events: {
        Row: {
          id: string
          user_id: string
          event_type: 'phase_started' | 'phase_completed' | 'step_completed' | 'skipped' | 'resumed' | 'completed'
          phase: string | null
          step: number | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: 'phase_started' | 'phase_completed' | 'step_completed' | 'skipped' | 'resumed' | 'completed'
          phase?: string | null
          step?: number | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: 'phase_started' | 'phase_completed' | 'step_completed' | 'skipped' | 'resumed' | 'completed'
          phase?: string | null
          step?: number | null
          metadata?: Record<string, unknown>
        }
      }
      budget_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          allocations: {
            needs: number
            wants: number
            savings: number
          }
          category_mappings: Record<string, string[]>
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          allocations: {
            needs: number
            wants: number
            savings: number
          }
          category_mappings?: Record<string, string[]>
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          allocations?: {
            needs: number
            wants: number
            savings: number
          }
          category_mappings?: Record<string, string[]>
          is_active?: boolean
          sort_order?: number
        }
      }
      budget_plans: {
        Row: {
          id: string
          user_id: string
          period: 'monthly' | 'yearly'
          total_amount: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period: 'monthly' | 'yearly'
          total_amount?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period?: 'monthly' | 'yearly'
          total_amount?: number
          currency?: string
          updated_at?: string
        }
      }
      budget_plan_categories: {
        Row: {
          id: string
          plan_id: string
          category_id: string
          allocated_amount: number
        }
        Insert: {
          id?: string
          plan_id: string
          category_id: string
          allocated_amount: number
        }
        Update: {
          id?: string
          plan_id?: string
          category_id?: string
          allocated_amount?: number
        }
      }
      budget_snapshots: {
        Row: {
          id: string
          user_id: string
          period: 'monthly' | 'yearly'
          year: number
          month: number | null
          total_amount: number
          currency: string
          status: 'active' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period: 'monthly' | 'yearly'
          year: number
          month?: number | null
          total_amount: number
          currency?: string
          status?: 'active' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period?: 'monthly' | 'yearly'
          year?: number
          month?: number | null
          total_amount?: number
          currency?: string
          status?: 'active' | 'closed'
        }
      }
      budget_snapshot_categories: {
        Row: {
          id: string
          snapshot_id: string
          category_id: string
          allocated_amount: number
        }
        Insert: {
          id?: string
          snapshot_id: string
          category_id: string
          allocated_amount: number
        }
        Update: {
          id?: string
          snapshot_id?: string
          category_id?: string
          allocated_amount?: number
        }
      }
      financial_goals: {
        Row: {
          id: string
          account_id: string
          name: string
          goal_type: 'emergency_fund' | 'vacation' | 'house_down_payment' | 'car_purchase' | 'education' | 'wedding' | 'investment' | 'other'
          target_amount: number
          target_date: string
          status: 'active' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          goal_type: 'emergency_fund' | 'vacation' | 'house_down_payment' | 'car_purchase' | 'education' | 'wedding' | 'investment' | 'other'
          target_amount: number
          target_date: string
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          goal_type?: 'emergency_fund' | 'vacation' | 'house_down_payment' | 'car_purchase' | 'education' | 'wedding' | 'investment' | 'other'
          target_amount?: number
          target_date?: string
          status?: 'active' | 'completed' | 'cancelled'
          updated_at?: string
        }
      }
      portfolio_holdings: {
        Row: {
          id: string
          account_id: string
          user_id: string
          asset_class: 'IDX_STOCK' | 'US_STOCK' | 'MUTUAL_FUND' | 'ETF' | 'BOND' | 'OTHER'
          symbol: string | null
          name: string
          quantity: number
          purchase_price: number
          current_value: number
          purchase_date: string | null
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          user_id: string
          asset_class: 'IDX_STOCK' | 'US_STOCK' | 'MUTUAL_FUND' | 'ETF' | 'BOND' | 'OTHER'
          symbol?: string | null
          name: string
          quantity: number
          purchase_price: number
          current_value: number
          purchase_date?: string | null
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          user_id?: string
          asset_class?: 'IDX_STOCK' | 'US_STOCK' | 'MUTUAL_FUND' | 'ETF' | 'BOND' | 'OTHER'
          symbol?: string | null
          name?: string
          quantity?: number
          purchase_price?: number
          current_value?: number
          purchase_date?: string | null
          currency?: string
          updated_at?: string
        }
      }
      wealth_forecast_scenarios: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          start_date: string
          horizon_years: number
          expected_annual_return: number
          annual_volatility: number
          inflation_rate: number
          monthly_contribution: number
          monthly_withdrawal: number
          include_cashflow: boolean
          is_default: boolean
          target_net_worth: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          start_date?: string
          horizon_years?: number
          expected_annual_return?: number
          annual_volatility?: number
          inflation_rate?: number
          monthly_contribution?: number
          monthly_withdrawal?: number
          include_cashflow?: boolean
          is_default?: boolean
          target_net_worth?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          start_date?: string
          horizon_years?: number
          expected_annual_return?: number
          annual_volatility?: number
          inflation_rate?: number
          monthly_contribution?: number
          monthly_withdrawal?: number
          include_cashflow?: boolean
          is_default?: boolean
          target_net_worth?: number
          updated_at?: string
        }
      }
      wealth_forecast_events: {
        Row: {
          id: string
          scenario_id: string
          user_id: string
          name: string
          event_date: string
          event_type: 'WEDDING' | 'KIDS' | 'EDUCATION' | 'PROPERTY' | 'HAJJ' | 'VEHICLE' | 'RETIREMENT' | 'OTHER'
          amount: number
          note: string | null
          details: Record<string, unknown>
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scenario_id: string
          user_id: string
          name: string
          event_date: string
          event_type: 'WEDDING' | 'KIDS' | 'EDUCATION' | 'PROPERTY' | 'HAJJ' | 'VEHICLE' | 'RETIREMENT' | 'OTHER'
          amount: number
          note?: string | null
          details?: Record<string, unknown>
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scenario_id?: string
          user_id?: string
          name?: string
          event_date?: string
          event_type?: 'WEDDING' | 'KIDS' | 'EDUCATION' | 'PROPERTY' | 'HAJJ' | 'VEHICLE' | 'RETIREMENT' | 'OTHER'
          amount?: number
          note?: string | null
          details?: Record<string, unknown>
          is_enabled?: boolean
          updated_at?: string
        }
      }
    }
  }
}

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
export type UploadedFileInsert = Database['public']['Tables']['uploaded_files']['Insert']
export type UploadedFileUpdate = Database['public']['Tables']['uploaded_files']['Update']

export type CategoryGroupDB = Database['public']['Tables']['category_groups']['Row']
export type CategoryGroupInsert = Database['public']['Tables']['category_groups']['Insert']
export type CategoryGroupUpdate = Database['public']['Tables']['category_groups']['Update']

export type CategoryDB = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert']
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update']

export type BudgetDB = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type BudgetCategoryDB = Database['public']['Tables']['budget_categories']['Row']
export type BudgetCategoryInsert = Database['public']['Tables']['budget_categories']['Insert']
export type BudgetCategoryUpdate = Database['public']['Tables']['budget_categories']['Update']

export type AccountDB = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

export type BalanceAdjustment = Database['public']['Tables']['account_balance_adjustments']['Row']
export type BalanceAdjustmentInsert = Database['public']['Tables']['account_balance_adjustments']['Insert']

export type StatementDB = Database['public']['Tables']['statements']['Row']
export type StatementInsert = Database['public']['Tables']['statements']['Insert']
export type StatementUpdate = Database['public']['Tables']['statements']['Update']

export type UserOnboardingDB = Database['public']['Tables']['user_onboarding']['Row']
export type UserOnboardingInsert = Database['public']['Tables']['user_onboarding']['Insert']
export type UserOnboardingUpdate = Database['public']['Tables']['user_onboarding']['Update']

export type OnboardingEventDB = Database['public']['Tables']['onboarding_events']['Row']
export type OnboardingEventInsert = Database['public']['Tables']['onboarding_events']['Insert']
export type OnboardingEventUpdate = Database['public']['Tables']['onboarding_events']['Update']

export type BudgetTemplateDB = Database['public']['Tables']['budget_templates']['Row']
export type BudgetTemplateInsert = Database['public']['Tables']['budget_templates']['Insert']
export type BudgetTemplateUpdate = Database['public']['Tables']['budget_templates']['Update']

export type FinancialGoalDB = Database['public']['Tables']['financial_goals']['Row']
export type FinancialGoalInsert = Database['public']['Tables']['financial_goals']['Insert']
export type FinancialGoalUpdate = Database['public']['Tables']['financial_goals']['Update']

export type WealthForecastScenarioDB = Database['public']['Tables']['wealth_forecast_scenarios']['Row']
export type WealthForecastScenarioInsert = Database['public']['Tables']['wealth_forecast_scenarios']['Insert']
export type WealthForecastScenarioUpdate = Database['public']['Tables']['wealth_forecast_scenarios']['Update']

export type WealthForecastEventDB = Database['public']['Tables']['wealth_forecast_events']['Row']
export type WealthForecastEventInsert = Database['public']['Tables']['wealth_forecast_events']['Insert']
export type WealthForecastEventUpdate = Database['public']['Tables']['wealth_forecast_events']['Update']

// Goal type for convenience
export type GoalType = 'emergency_fund' | 'vacation' | 'house_down_payment' | 'car_purchase' | 'education' | 'wedding' | 'investment' | 'other'
export type GoalStatus = 'active' | 'completed' | 'cancelled'

export type BudgetPlanDB = Database['public']['Tables']['budget_plans']['Row']
export type BudgetPlanInsert = Database['public']['Tables']['budget_plans']['Insert']
export type BudgetPlanUpdate = Database['public']['Tables']['budget_plans']['Update']

export type BudgetPlanCategoryDB = Database['public']['Tables']['budget_plan_categories']['Row']
export type BudgetPlanCategoryInsert = Database['public']['Tables']['budget_plan_categories']['Insert']
export type BudgetPlanCategoryUpdate = Database['public']['Tables']['budget_plan_categories']['Update']

export type BudgetSnapshotDB = Database['public']['Tables']['budget_snapshots']['Row']
export type BudgetSnapshotInsert = Database['public']['Tables']['budget_snapshots']['Insert']
export type BudgetSnapshotUpdate = Database['public']['Tables']['budget_snapshots']['Update']

export type BudgetSnapshotCategoryDB = Database['public']['Tables']['budget_snapshot_categories']['Row']
export type BudgetSnapshotCategoryInsert = Database['public']['Tables']['budget_snapshot_categories']['Insert']
export type BudgetSnapshotCategoryUpdate = Database['public']['Tables']['budget_snapshot_categories']['Update']

// Onboarding phase type for convenience
export type OnboardingPhase = 'welcome' | 'account_setup' | 'categories' | 'budget_setup' | 'completed'
export type OnboardingEventType = 'phase_started' | 'phase_completed' | 'step_completed' | 'skipped' | 'resumed' | 'completed'
