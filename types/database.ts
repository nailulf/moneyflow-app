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
          category: string
          merchant: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          description: string
          amount: number
          category?: string
          merchant?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          description?: string
          amount?: number
          category?: string
          merchant?: string | null
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
    }
  }
}

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type UploadedFile = Database['public']['Tables']['uploaded_files']['Row']
export type UploadedFileInsert = Database['public']['Tables']['uploaded_files']['Insert']
export type UploadedFileUpdate = Database['public']['Tables']['uploaded_files']['Update']