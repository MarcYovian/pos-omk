// types/pos.ts — POS-specific types

export interface CartItem {
  product_id:        string
  nama_produk:       string
  harga_jual:        number
  qty:               number
  subtotal:          number      // qty * harga_jual — always computed, never stored as-is
  stok_sekarang:     number      // Snapshot at time of add
  hasStockWarning:   boolean
}

export interface CheckoutPayload {
  session_id:        string
  cashier_id:        string
  nominal_diterima:  number
  cart_items: Array<{
    product_id:  string
    qty:         number
    harga_jual:  number         // Sent for validation; RPC re-reads from DB
  }>
}

export interface TransactionResult {
  transaction_id:    string
  total_harga_jual:  number
  kembalian:         number
}
