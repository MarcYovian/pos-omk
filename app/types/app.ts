// types/app.ts — Application types (distinct from DB row types)

// Master product catalog entry (persists across sessions)
export interface MasterProduct {
  id:              string
  umkm_id:         string
  nama_produk:     string
  harga_asli:      number
  is_active:       boolean
  created_at:      string
  updated_at:      string
}

// Flattened session_products + master_products (admin view)
export interface ProductAdmin {
  id:               string
  session_id:       string
  master_product_id: string
  nama_produk:      string
  harga_asli:       number
  harga_jual:       number
  stok_awal:        number
  stok_sekarang:    number
  is_active:        boolean
  umkm_id:          string
  created_at:       string
  umkm?: {
    nama_umkm:      string
  }
}

// Product as seen by cashier role (harga_asli excluded)
export interface ProductCashierView {
  id:              string
  session_id:      string
  umkm_id:         string
  nama_produk:     string
  harga_jual:      number
  stok_awal:       number
  stok_sekarang:   number
  is_active:       boolean
  created_at:      string
  umkm?: {
    nama_umkm:     string
  }
}

export interface UMKM {
  id:           string
  nama_umkm:    string
  kontak_wa:    string
  is_active:    boolean
  created_at:   string
}

export interface Session {
  id:            string
  company_id?:   string
  session_date:  string
  status:        'open' | 'closed'
  opened_by:     string | null
  closed_by:     string | null
  opened_at:     string
  closed_at:     string | null
  notes:         string | null
  created_at:    string
}

// Multi-Company Interfaces
export interface CompanySettings {
  report_signature?: string
  currency?: string
  timezone?: string
  qris_name?: string | null
  bank_info?: string | null
  receipt_footer?: string | null
}

export interface Company {
  id:          string
  name:        string
  slug:        string
  logo_url:    string | null
  address:     string | null
  phone:       string | null
  email:       string | null
  settings:    CompanySettings | Record<string, any>
  is_active:   boolean
  created_at:  string
  updated_at:  string
}

export interface CompanyUser {
  id:          string
  company_id:  string
  user_id:     string
  role_id:     string
  is_default:  boolean
  is_active:   boolean
  created_at:  string
  updated_at:  string
}

export interface UserCompanyMembership {
  company_id:   string
  company_name: string
  company_slug: string
  company_code?: string
  logo_url?:     string | null
  role:         string
  role_name?:   string
  is_default:   boolean
  is_active:    boolean
}

