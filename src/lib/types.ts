export type Database = {
  public: {
    Tables: {
      habits: {
        Row: {
          id: string
          user_id: string
          title: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          category?: string
          created_at?: string
        }
        Update: {
          title?: string
          category?: string
        }
        Relationships: [
          {
            foreignKeyName: 'habits_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
          },
        ]
      }
      daily_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          user_id?: string
          completed_at?: string
          created_at?: string
        }
        Update: {
          completed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_logs_habit_id_fkey'
            columns: ['habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'daily_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'auth_users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}