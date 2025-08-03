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
          type: 'INCOME' | 'EXPENSE'
          category_id: string | null
          merchant: string | null
          notes: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          description: string
          amount: number
          type: 'INCOME' | 'EXPENSE'
          category_id?: string | null
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          description?: string
          amount?: number
          type?: 'INCOME' | 'EXPENSE'
          category_id?: string | null
          merchant?: string | null
          notes?: string | null
          tags?: string[] | null
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
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          group_type: 'EXPENSE' | 'INCOME'
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
          group_type: 'EXPENSE' | 'INCOME'
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
          group_type?: 'EXPENSE' | 'INCOME'
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
    }
  }
}

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
export type UploadedFileInsert = Database['public']['Tables']['uploaded_files']['Insert']
export type UploadedFileUpdate = Database['public']['Tables']['uploaded_files']['Update']

export type CategoryDB = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type UserPreference = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferenceInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferenceUpdate = Database['public']['Tables']['user_preferences']['Update']