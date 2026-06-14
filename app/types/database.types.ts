export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      umkm: {
        Row: {
          id: string
          nama_umkm: string
          kontak_wa: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nama_umkm: string
          kontak_wa: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nama_umkm?: string
          kontak_wa?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          umkm_id: string
          session_date: string
          nama_produk: string
          harga_asli: number
          harga_jual: number
          stok_awal: number
          stok_sekarang: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          umkm_id: string
          session_date: string
          nama_produk: string
          harga_asli: number
          harga_jual: number
          stok_awal: number
          stok_sekarang?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          umkm_id?: string
          session_date?: string
          nama_produk?: string
          harga_asli?: number
          harga_jual?: number
          stok_awal?: number
          stok_sekarang?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_umkm_id_fkey"
            columns: ["umkm_id"]
            isOneToOne: false
            referencedRelation: "umkm"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          session_date: string
          status: 'open' | 'closed'
          opened_by: string | null
          closed_by: string | null
          opened_at: string
          closed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_date: string
          status?: 'open' | 'closed'
          opened_by?: string | null
          closed_by?: string | null
          opened_at?: string
          closed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_date?: string
          status?: 'open' | 'closed'
          opened_by?: string | null
          closed_by?: string | null
          opened_at?: string
          closed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          session_id: string
          cashier_id: string
          total_harga_jual: number
          nominal_diterima: number
          kembalian: number
          created_at: string
          metode_pembayaran: 'cash' | 'qris'
        }
        Insert: {
          id?: string
          session_id: string
          cashier_id: string
          total_harga_jual: number
          nominal_diterima: number
          created_at?: string
          metode_pembayaran?: 'cash' | 'qris'
        }
        Update: {
          id?: string
          session_id?: string
          cashier_id?: string
          total_harga_jual?: number
          nominal_diterima?: number
          created_at?: string
          metode_pembayaran?: 'cash' | 'qris'
        }
        Relationships: [
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      transaction_details: {
        Row: {
          id: string
          transaction_id: string
          product_id: string
          qty: number
          harga_jual_snapshot: number
          harga_asli_snapshot: number
          subtotal_harga_jual: number
          subtotal_harga_asli: number
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          product_id: string
          qty: number
          harga_jual_snapshot: number
          harga_asli_snapshot: number
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          product_id?: string
          qty?: number
          harga_jual_snapshot?: number
          harga_asli_snapshot?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_details_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          }
        ]
      }
      reconciliation: {
        Row: {
          id: string
          session_id: string
          product_id: string
          stok_fisik: number
          stok_sekarang_snap: number
          selisih: number
          recorded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          product_id: string
          stok_fisik: number
          stok_sekarang_snap: number
          recorded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          product_id?: string
          stok_fisik?: number
          stok_sekarang_snap?: number
          recorded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      products_cashier_view: {
        Row: {
          id: string
          umkm_id: string
          session_date: string
          nama_produk: string
          harga_jual: number
          stok_awal: number
          stok_sekarang: number
          is_active: boolean
          created_at: string
        }
        Relationships: [
          {
            foreignKeyName: "products_umkm_id_fkey"
            columns: ["umkm_id"]
            isOneToOne: false
            referencedRelation: "umkm"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      complete_transaction: {
        Args: {
          p_session_id: string
          p_cashier_id: string
          p_nominal_diterima: number
          p_cart_items: Json
          p_metode_pembayaran?: string
        }
        Returns: Json
      }
      close_session: {
        Args: {
          p_session_id: string
          p_admin_id: string
        }
        Returns: Json
      }
      reopen_session: {
        Args: {
          p_session_id: string
          p_admin_id: string
        }
        Returns: Json
      }
      get_session_financial_summary: {
        Args: {
          p_session_id: string
        }
        Returns: Json
      }
      get_umkm_product_breakdown: {
        Args: {
          p_session_id: string
          p_umkm_id: string
        }
        Returns: Json
      }
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_toggle_user_active: {
        Args: {
          p_user_id: string
          p_is_active: boolean
        }
        Returns: void
      }
      reset_session: {
        Args: {
          p_session_id: string
          p_admin_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
