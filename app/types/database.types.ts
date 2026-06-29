export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      master_products: {
        Row: {
          created_at: string
          harga_asli: number
          id: string
          is_active: boolean
          nama_produk: string
          umkm_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          harga_asli: number
          id?: string
          is_active?: boolean
          nama_produk: string
          umkm_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          harga_asli?: number
          id?: string
          is_active?: boolean
          nama_produk?: string
          umkm_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_products_umkm_id_fkey"
            columns: ["umkm_id"]
            isOneToOne: false
            referencedRelation: "umkm"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation: {
        Row: {
          created_at: string
          id: string
          recorded_by: string
          selisih: number
          session_id: string
          session_product_id: string
          stok_fisik: number
          stok_sekarang_snap: number
        }
        Insert: {
          created_at?: string
          id?: string
          recorded_by: string
          selisih?: number
          session_id: string
          session_product_id: string
          stok_fisik: number
          stok_sekarang_snap: number
        }
        Update: {
          created_at?: string
          id?: string
          recorded_by?: string
          selisih?: number
          session_id?: string
          session_product_id?: string
          stok_fisik?: number
          stok_sekarang_snap?: number
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_product_id_fkey"
            columns: ["session_product_id"]
            isOneToOne: false
            referencedRelation: "products_cashier_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_product_id_fkey"
            columns: ["session_product_id"]
            isOneToOne: false
            referencedRelation: "session_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_history_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reconciliation_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_products: {
        Row: {
          created_at: string
          harga_asli: number
          harga_jual: number
          id: string
          is_active: boolean
          master_product_id: string
          session_id: string
          stok_awal: number
          stok_sekarang: number
        }
        Insert: {
          created_at?: string
          harga_asli: number
          harga_jual: number
          id?: string
          is_active?: boolean
          master_product_id: string
          session_id: string
          stok_awal: number
          stok_sekarang: number
        }
        Update: {
          created_at?: string
          harga_asli?: number
          harga_jual?: number
          id?: string
          is_active?: boolean
          master_product_id?: string
          session_id?: string
          stok_awal?: number
          stok_sekarang?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_products_master_product_id_fkey"
            columns: ["master_product_id"]
            isOneToOne: false
            referencedRelation: "master_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_products_master_product_id_fkey"
            columns: ["master_product_id"]
            isOneToOne: false
            referencedRelation: "top_products_sales"
            referencedColumns: ["master_product_id"]
          },
          {
            foreignKeyName: "session_products_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_history_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_products_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          session_date: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          session_date: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          session_date?: string
          status?: string
        }
        Relationships: []
      }
      transaction_details: {
        Row: {
          created_at: string
          harga_asli_snapshot: number
          harga_jual_snapshot: number
          id: string
          qty: number
          session_product_id: string
          subtotal_harga_asli: number
          subtotal_harga_jual: number
          transaction_id: string
        }
        Insert: {
          created_at?: string
          harga_asli_snapshot: number
          harga_jual_snapshot: number
          id?: string
          qty: number
          session_product_id: string
          subtotal_harga_asli?: number
          subtotal_harga_jual?: number
          transaction_id: string
        }
        Update: {
          created_at?: string
          harga_asli_snapshot?: number
          harga_jual_snapshot?: number
          id?: string
          qty?: number
          session_product_id?: string
          subtotal_harga_asli?: number
          subtotal_harga_jual?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_details_product_id_fkey"
            columns: ["session_product_id"]
            isOneToOne: false
            referencedRelation: "products_cashier_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_details_product_id_fkey"
            columns: ["session_product_id"]
            isOneToOne: false
            referencedRelation: "session_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_details_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          cashier_id: string
          created_at: string
          id: string
          kembalian: number
          metode_pembayaran: string | null
          nominal_diterima: number
          session_id: string
          total_harga_jual: number
        }
        Insert: {
          cashier_id: string
          created_at?: string
          id?: string
          kembalian?: number
          metode_pembayaran?: string | null
          nominal_diterima: number
          session_id: string
          total_harga_jual: number
        }
        Update: {
          cashier_id?: string
          created_at?: string
          id?: string
          kembalian?: number
          metode_pembayaran?: string | null
          nominal_diterima?: number
          session_id?: string
          total_harga_jual?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_history_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      umkm: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kontak_wa: string
          nama_umkm: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kontak_wa: string
          nama_umkm: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kontak_wa?: string
          nama_umkm?: string
        }
        Relationships: []
      }
    }
    Views: {
      products_cashier_view: {
        Row: {
          created_at: string | null
          harga_jual: number | null
          id: string | null
          is_active: boolean | null
          nama_produk: string | null
          session_id: string | null
          stok_awal: number | null
          stok_sekarang: number | null
          umkm_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_products_umkm_id_fkey"
            columns: ["umkm_id"]
            isOneToOne: false
            referencedRelation: "umkm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_products_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_history_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_products_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_history_summary: {
        Row: {
          closed_at: string | null
          gross_revenue: number | null
          omk_net_profit: number | null
          session_date: string | null
          session_id: string | null
          status: string | null
          total_remittance: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      top_products_sales: {
        Row: {
          master_product_id: string | null
          nama_produk: string | null
          sell_through_rate: number | null
          total_sold: number | null
          total_stok_awal: number | null
        }
        Relationships: []
      }
      umkm_profit_contribution: {
        Row: {
          nama_umkm: string | null
          omk_profit: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_create_user: {
        Args: { p_email: string; p_password: string; p_role: string }
        Returns: string
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_toggle_user_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_update_user: {
        Args: {
          p_email: string
          p_password: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      close_session: {
        Args: { p_admin_id: string; p_session_id: string }
        Returns: Json
      }
      complete_transaction:
        | {
            Args: {
              p_cart_items: Json
              p_cashier_id: string
              p_nominal_diterima: number
              p_session_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cart_items: Json
              p_cashier_id: string
              p_metode_pembayaran?: string
              p_nominal_diterima: number
              p_session_id: string
            }
            Returns: Json
          }
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          is_active: boolean
          last_sign_in_at: string
          role: string
        }[]
      }
      get_product_stock_recommendation:
        | {
            Args: { p_master_product_id: string }
            Returns: {
              recommendation: number
              s1_sold: number
              s2_sold: number
              s3_sold: number
            }[]
          }
        | {
            Args: { p_nama_produk: string; p_umkm_id: string }
            Returns: {
              recommendation: number
              s1_sold: number
              s2_sold: number
              s3_sold: number
            }[]
          }
      get_session_financial_summary: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_umkm_product_breakdown: {
        Args: { p_session_id: string; p_umkm_id: string }
        Returns: Json
      }
      get_user_role: { Args: never; Returns: string }
      get_weekly_trends: {
        Args: { p_limit?: number }
        Returns: {
          gross_revenue: number
          omk_net_profit: number
          session_date: string
          session_id: string
          total_remittance: number
        }[]
      }
      reopen_session: {
        Args: { p_admin_id: string; p_session_id: string }
        Returns: Json
      }
      reset_session: {
        Args: { p_admin_id: string; p_session_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
