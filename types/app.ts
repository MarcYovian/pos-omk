// types/app.ts — Application types (distinct from DB row types)

// Product as seen by cashier role (harga_asli excluded)
export interface ProductCashierView {
  id:              string
  umkm_id:         string
  session_date:    string     // 'YYYY-MM-DD'
  nama_produk:     string
  harga_jual:      number
  stok_awal:       number
  stok_sekarang:   number
  is_active:       boolean
  created_at:      string
  umkm?: {
    nama_umkm: string
  }
}

// Full product (admin view, includes harga_asli)
export interface ProductAdmin extends ProductCashierView {
  harga_asli:      number
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
  session_date:  string
  status:        'open' | 'closed'
  opened_by:     string | null
  closed_by:     string | null
  opened_at:     string
  closed_at:     string | null
  notes:         string | null
  created_at:    string
}
