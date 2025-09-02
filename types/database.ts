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
          merchant: string | null
          notes: string | null
          tags: string[] | null
          is_recurring: boolean
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
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          is_recurring?: boolean
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
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          is_recurring?: boolean
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
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preference_key: string
          preference_value: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preference_key: string
          preference_value: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preference_key?: string
          preference_value?: any
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

export type UserPreference = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferenceInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferenceUpdate = Database['public']['Tables']['user_preferences']['Update']

export type BudgetDB = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

export type BudgetCategoryDB = Database['public']['Tables']['budget_categories']['Row']
export type BudgetCategoryInsert = Database['public']['Tables']['budget_categories']['Insert']
export type BudgetCategoryUpdate = Database['public']['Tables']['budget_categories']['Update']