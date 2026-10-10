# API_CONTRACTS.md — Master API & Interface Contract Reference

> **Status:** LIVING DOCUMENT — Single Source of Truth for Server REST Endpoints & Database Stored Procedures (RPC)  
> **Audience:** Backend Engineers, Frontend Engineers, Integration Testers, AI Coding Agents  
> **Last Updated:** October 2026 (Unified Edition)

---

## 1. Protocol, Security Architecture & Standards

Sistem OMK POS menggunakan arsitektur hybrid:
1. **Nitro Server REST API (`/api/*`):** Digunakan untuk operasi administratif tingkat tinggi yang membutuhkan Supabase Service Role key (Manajemen Akun, Reset Password, Tenant Switcher, Dynamic Roles & Permission Overrides, serta Public Vendor Portal).
2. **Supabase Database RPC (`client.rpc(...)`):** Digunakan oleh client frontend untuk transaksi kasir atomik, agregasi finansial, rekonsiliasi stok, dan pelunasan utang yang memerlukan integritas data transaksional ACID di level PostgreSQL.

### 1.1. Base URL & Protocol
- **Local Dev:** `http://localhost:3000`
- **Protocol:** HTTPS (Production) / HTTP (Local)
- **Content-Type:** `application/json`

### 1.2. Standar Header Request
| Header | Tipe | Wajib? | Keterangan |
|---|---|:---:|---|
| `Authorization` | `string` | **Ya** (Auth endpoints) | Bearer token Supabase JWT (`Bearer <access_token>`). |
| `X-Company-Id` | `uuid` | **Ya** (Tenant endpoints) | UUID paroki/organisasi aktif pengguna. Dievaluasi oleh `tenantResolver.ts`. |
| `Content-Type` | `string` | **Ya** (POST/PUT/PATCH) | `application/json`. |

### 1.3. Struktur Format Respons Standar
#### Respons Sukses (200 / 201)
Respons mengembalikan payload objek DTO secara langsung atau berformat:
```json
{
  "success": true,
  "data": { ... }
}
```

#### Respons Kesalahan (4xx / 5xx)
Format error Nitro standar:
```json
{
  "statusCode": 403,
  "statusMessage": "Forbidden",
  "message": "Akses ditolak: Anda tidak memiliki izin 'users:manage'"
}
```

---

## 2. Multi-Company / Tenant Management APIs (`/api/companies/*`)

### 2.1. `GET /api/companies`
- **Deskripsi:** Mengambil seluruh daftar organisasi/paroki di sistem.
- **Wewenang:** `super_admin` only (atau user terdaftar).
- **Request Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
```json
[
  {
    "id": "b3c8f1a2-...",
    "name": "Paroki Santo Antonius Padua",
    "slug": "st-antonius-padua",
    "address": "Jl. Hayam Wuruk No. 1",
    "phone": "08123456789",
    "logo_url": null,
    "is_active": true,
    "created_at": "2026-06-01T08:00:00Z"
  }
]
```

### 2.2. `POST /api/companies`
- **Deskripsi:** Mendaftarkan paroki/perusahaan baru.
- **Wewenang:** `super_admin` only.
- **Request Body:**
```json
{
  "name": "Paroki Santa Maria Regina",
  "slug": "santa-maria-regina",
  "address": "Jl. Boulevard Barat",
  "phone": "081987654321",
  "settings": {
    "qris_name": "OMK SANMAR",
    "bank_name": "BCA",
    "bank_account_number": "1234567890",
    "bank_account_holder": "OMK Sanmar",
    "receipt_footer": "Terima kasih atas dukungannya!"
  }
}
```
- **Response (201 Created):** Objek `company` baru yang tersimpan di database.

### 2.3. `GET /api/companies/active`
- **Deskripsi:** Mengambil detail profil dan pengaturan paroki aktif berdasarkan header `X-Company-Id`.
- **Wewenang:** Authenticated user anggota paroki.
- **Request Headers:** `Authorization: Bearer <token>`, `X-Company-Id: <uuid>`
- **Response (200 OK):**
```json
{
  "id": "b3c8f1a2-...",
  "name": "Paroki Santo Antonius Padua",
  "slug": "st-antonius-padua",
  "address": "Jl. Hayam Wuruk No. 1",
  "phone": "08123456789",
  "logo_url": null,
  "is_active": true,
  "settings": {
    "qris_name": "OMK ANTONIUS",
    "bank_name": "BCA",
    "receipt_footer": "Tuhan Memberkati"
  },
  "role_code": "admin",
  "is_super_admin": false
}
```

### 2.4. `PATCH /api/companies/active`
- **Deskripsi:** Memperbarui profil dan pengaturan paroki aktif (termasuk setting struk kasir).
- **Wewenang:** `admin` atau `super_admin`.
- **Request Headers:** `Authorization: Bearer <token>`, `X-Company-Id: <uuid>`
- **Request Body:**
```json
{
  "name": "Paroki Santo Antonius Padua Kotabaru",
  "address": "Jl. Abu Bakar Ali No. 1",
  "phone": "08122334455",
  "settings": {
    "receipt_footer": "Berkah Dalem"
  }
}
```
- **Response (200 OK):** `{ "success": true, "company": { ... } }`

### 2.5. `PATCH /api/companies/[id]/toggle-active`
- **Deskripsi:** Mengaktifkan/menonaktifkan operasional paroki tertentu.
- **Wewenang:** `super_admin` only.
- **Request Body:** `{ "is_active": false }`
- **Response (200 OK):** `{ "success": true, "company": { "id": "...", "is_active": false } }`

### 2.6. `GET /api/companies/my-companies`
- **Deskripsi:** Mengambil daftar paroki yang dapat diakses oleh user saat ini (untuk komponen `CompanySwitcher`).
- **Wewenang:** Authenticated user.
- **Response (200 OK):**
```json
[
  {
    "id": "b3c8f1a2-...",
    "name": "Paroki Santo Antonius",
    "slug": "st-antonius",
    "role_code": "admin",
    "is_active": true
  }
]
```

---

## 3. Dynamic Roles Management APIs (`/api/roles/*`)

### 3.1. `GET /api/roles`
- **Deskripsi:** Mengambil seluruh daftar role (sistem & custom) beserta permissions yang dimilikinya.
- **Wewenang:** Memerlukan izin `roles:manage`.
- **Response (200 OK):**
```json
[
  {
    "id": "role-uuid-1",
    "code": "admin",
    "name": "Administrator",
    "description": "Administrator Paroki Penuh",
    "is_system": true,
    "permissions": ["pos:access", "catalog:manage", "finance:manage", "users:manage", "reports:view"]
  },
  {
    "id": "role-uuid-2",
    "code": "cashier",
    "name": "Kasir",
    "description": "Kasir Layar POS",
    "is_system": true,
    "permissions": ["pos:access"]
  }
]
```

### 3.2. `POST /api/roles`
- **Deskripsi:** Membuat role baru (non-system).
- **Wewenang:** Memerlukan izin `roles:manage`.
- **Request Body:**
```json
{
  "code": "inventory_officer",
  "name": "Petugas Rekonsiliasi",
  "description": "Bertanggung jawab atas input stok fisik dan setup sesi",
  "permissions": ["catalog:manage", "session:setup", "reconciliation:manage"]
}
```
- **Response (200 OK):** Objek `RoleRecord` yang baru dibuat. Otomatis meng-invalidate cache RBAC.

### 3.3. `PUT /api/roles/[id]`
- **Deskripsi:** Memperbarui nama, deskripsi, dan daftar permissions milik role.
- **Wewenang:** Memerlukan izin `roles:manage`.
- **Request Body:**
```json
{
  "name": "Petugas Rekonsiliasi & Setup",
  "description": "Deskripsi diperbarui",
  "permissions": ["catalog:manage", "session:setup", "reconciliation:manage", "reports:view"]
}
```
- **Response (200 OK):** Objek `RoleRecord` yang diperbarui.

### 3.4. `DELETE /api/roles/[id]`
- **Deskripsi:** Menghapus role custom. Role sistem (`is_system = true`) diproteksi dan tidak dapat dihapus.
- **Wewenang:** Memerlukan izin `roles:manage`.
- **Response (200 OK):** `{ "success": true, "message": "Peran berhasil dihapus" }`

---

## 4. Granular Permissions Catalog APIs (`/api/permissions/*`)

### 4.1. `GET /api/permissions`
- **Deskripsi:** Mengambil katalog seluruh permissions sistem, terkelompok berdasarkan modul.
- **Wewenang:** Memerlukan izin `roles:manage`.
- **Response (200 OK):**
```json
[
  {
    "id": "perm-1",
    "code": "pos:access",
    "name": "Akses Kasir POS",
    "module": "pos",
    "description": "Dapat membuka antarmuka kasir dan memproses penjualan"
  },
  {
    "id": "perm-2",
    "code": "finance:manage",
    "name": "Kelola Keuangan & Pelunasan",
    "module": "finance",
    "description": "Melihat dashboard laba, ledger kas, dan bayar utang UMKM"
  }
]
```

### 4.2. `POST /api/permissions`
- **Deskripsi:** Mendaftarkan permission code baru ke katalog.
- **Request Body:**
```json
{
  "code": "audit:export",
  "name": "Ekspor Data Audit",
  "module": "reports",
  "description": "Dapat mengunduh arsip transaksi dalam format spreadsheet"
}
```
- **Response (200 OK):** Objek permission yang baru dibuat.

### 4.3. `PUT /api/permissions/[id]` & `DELETE /api/permissions/[id]`
- **Deskripsi:** Pembaruan dan penghapusan item permission dari katalog sistem.

---

## 5. User Management & Permission Overrides APIs (`/api/users/*`)

### 5.1. `GET /api/users`
- **Deskripsi:** Mengambil seluruh user terdaftar untuk paroki aktif (`X-Company-Id`), beserta role dan hitungan permission override mereka.
- **Wewenang:** Memerlukan izin `users:manage`.
- **Response (200 OK):**
```json
[
  {
    "id": "auth-user-uuid",
    "email": "kasir1@paroki.org",
    "role": "cashier",
    "role_name": "Kasir",
    "is_active": true,
    "created_at": "2026-06-10T10:00:00Z",
    "last_sign_in_at": "2026-10-10T08:00:00Z",
    "email_confirmed_at": "2026-06-10T10:05:00Z",
    "custom_overrides_count": 1
  }
]
```

### 5.2. `POST /api/users`
- **Deskripsi:** Membuat akun kasir/admin baru di Supabase Auth dan menautkannya ke paroki aktif.
- **Wewenang:** Memerlukan izin `users:manage`.
- **Request Body:**
```json
{
  "email": "kasir2@paroki.org",
  "role": "cashier"
}
```
- **Response (201 Created):**
```json
{
  "id": "new-user-uuid",
  "email": "kasir2@paroki.org",
  "role": "cashier",
  "is_active": true,
  "password": "AutoGeneratedSecurePass123!"
}
```

### 5.3. `PATCH /api/users/[id]`
- **Deskripsi:** Mengubah email, role, atau menetapkan password baru untuk pengguna.
- **Request Body:**
```json
{
  "role": "admin",
  "password": "NewManualPassword456!"
}
```
- **Response (200 OK):** Objek `UserRecord` yang diperbarui.

### 5.4. `PATCH /api/users/[id]/toggle-active`
- **Deskripsi:** Mengaktifkan atau menonaktifkan akun kasir (blokir akses login).
- **Request Body:** `{ "is_active": false }`
- **Response (200 OK):** `{ "success": true, "user": { "id": "...", "is_active": false } }`

### 5.5. `POST /api/users/[id]/send-reset`
- **Deskripsi:** Memicu Supabase Auth untuk mengirimkan tautan reset kata sandi ke email pengguna.
- **Response (200 OK):** `{ "success": true, "message": "Email reset password telah dikirim" }`

### 5.6. `POST /api/users/[id]/password-changed`
- **Deskripsi:** Menghapus bendera `force_password_change` setelah pengguna berhasil memperbarui sandi sementaranya.
- **Response (200 OK):** `{ "success": true }`

### 5.7. `GET /api/users/[id]/permissions`
- **Deskripsi:** Mengambil detail seluruh permissions untuk pengguna tertentu, menampilkan status inherit dari role serta status override langsung (*Granted / Revoked / Inherited*).
- **Wewenang:** Memerlukan izin `users:manage`.
- **Response (200 OK):**
```json
{
  "user_id": "user-uuid",
  "email": "kasir1@paroki.org",
  "role_code": "cashier",
  "role_name": "Kasir",
  "effective_permissions": ["pos:access", "reports:view"],
  "permissions": [
    {
      "permission_id": "perm-1",
      "code": "pos:access",
      "name": "Akses Kasir POS",
      "module": "pos",
      "inherited_from_role": true,
      "is_granted": null
    },
    {
      "permission_id": "perm-2",
      "code": "reports:view",
      "name": "Lihat Laporan",
      "module": "reports",
      "inherited_from_role": false,
      "is_granted": true
    }
  ]
}
```

### 5.8. `PUT /api/users/[id]/permissions`
- **Deskripsi:** Memperbarui override hak akses langsung per pengguna untuk paroki aktif.
- **Wewenang:** Memerlukan izin `users:manage`.
- **Request Body:**
```json
{
  "role_code": "cashier",
  "overrides": [
    {
      "permission_id": "perm-2",
      "is_granted": true
    },
    {
      "permission_id": "perm-3",
      "is_granted": null
    }
  ]
}
```
- **Response (200 OK):** `{ "success": true, "message": "Hak akses pengguna berhasil diperbarui" }`

---

## 6. Public Vendor Portal API (`/api/public/*`)

### 6.1. `GET /api/public/umkm-performance/[id]`
- **Deskripsi:** Endpoint publik tanpa otentikasi untuk menampilkan dashboard performa mitra UMKM via tautan WhatsApp.
- **Parameter URL:** `id` (UUID Mitra UMKM).
- **Keamanan:** Membaca data menggunakan Service Role dan mengembalikan hanya data agregat vendor bersangkutan (tidak mengekspos data paroki lain atau harga jual retail OMK).
- **Response (200 OK):**
```json
{
  "umkm": {
    "id": "umkm-uuid",
    "nama_umkm": "Dapur Bu Agnes"
  },
  "products": [
    {
      "master_product_id": "prod-1",
      "nama_produk": "Risol Mayo",
      "harga_asli": 3000,
      "total_sold": 150,
      "total_setoran": 450000
    }
  ],
  "sessions": [
    {
      "session_id": "sess-1",
      "tanggal": "2026-10-04",
      "units_sold": 50,
      "total_payout": 150000
    }
  ],
  "sessionDetails": {
    "sess-1": [
      {
        "nama_produk": "Risol Mayo",
        "stok_awal": 50,
        "stok_sekarang": 0,
        "stok_fisik": 0,
        "sold": 50,
        "harga_asli": 3000,
        "total_setoran": 150000
      }
    ]
  }
}
```

---

## 7. Supabase Database Stored Procedures (RPC) Catalog

Katalog fungsi tersimpan PostgreSQL (*Stored Procedures*) yang dieksekusi melalui `supabase.rpc('function_name', { params })`:

### 7.1. `complete_transaction`
- **Fungsi:** Menyelesaikan transaksi kasir multi-item secara atomik (ACID).
- **Hak Akses:** Kasir & Admin (`SECURITY DEFINER`).
- **Signature:**
```sql
complete_transaction(
  p_session_id UUID,
  p_payment_method TEXT,        -- 'cash' | 'qris'
  p_items JSONB,                 -- [{"session_product_id": UUID, "quantity": INT, "subtotal": INT}]
  p_cashier_id UUID DEFAULT NULL,
  p_amount_paid INT DEFAULT 0,
  p_change_amount INT DEFAULT 0
) RETURNS UUID                   -- ID Transaksi yang baru dibuat
```
- **Jaminan Integritas:**
  1. Mengunci baris `session_products` dengan `FOR UPDATE`.
  2. Memvalidasi ketersediaan `stok_sekarang >= quantity`.
  3. Mengurangi stok secara atomik.
  4. Mencatat invoice ke tabel `transactions` dan item ke `transaction_items`.
  5. Men-trigger pencatatan uang masuk otomatis ke tabel `cash_flows`.

---

### 7.2. `get_session_financial_summary`
- **Fungsi:** Mengambil agregat ringkasan finansial resmi untuk satu sesi.
- **Signature:**
```sql
get_session_financial_summary(p_session_id UUID)
RETURNS TABLE (
  total_gross_revenue BIGINT,    -- Total Omzet Penjualan
  total_omk_profit BIGINT,       -- Total Laba Bersih OMK
  total_umkm_due BIGINT,         -- Total Hak Modal Mitra UMKM
  total_transactions INT         -- Total Jumlah Struk Kasir
)
```

---

### 7.3. `get_umkm_product_breakdown`
- **Fungsi:** Mengambil rincian per-produk untuk semua UMKM pada sesi tertentu (dipakai di accordion dashboard).
- **Signature:**
```sql
get_umkm_product_breakdown(p_session_id UUID)
RETURNS TABLE (
  umkm_id UUID,
  nama_umkm TEXT,
  session_product_id UUID,
  nama_produk TEXT,
  stok_awal INT,
  stok_sekarang INT,
  terjual INT,
  harga_asli INT,
  harga_jual INT,
  subtotal_penjualan BIGINT,
  subtotal_hak_umkm BIGINT,
  subtotal_profit_omk BIGINT
)
```

---

### 7.4. `close_session`
- **Fungsi:** Mengunci sesi mingguan dan mencatat hasil rekonsiliasi fisik akhir hari.
- **Signature:**
```sql
close_session(
  p_session_id UUID,
  p_reconciliations JSONB        -- [{"session_product_id": UUID, "stok_fisik": INT, "catatan": TEXT}]
) RETURNS BOOLEAN
```
- **Logika:** Mengubah status sesi menjadi `'closed'`, menyimpan stok fisik ke tabel `reconciliation`, dan memblokir checkout kasir selanjutnya.

---

### 7.5. `reopen_session` & `reset_session`
- **`reopen_session(p_session_id UUID) RETURNS BOOLEAN`:** Membuka kembali sesi yang terkunci untuk keperluan koreksi data oleh administrator.
- **`reset_session(p_session_id UUID) RETURNS BOOLEAN`:** Menghapus transaksi dan mengembalikan sisa stok ke stok awal (khusus mode pengujian/staging).

---

### 7.6. `get_product_stock_recommendation`
- **Fungsi:** Menghitung rekomendasi kuantitas stok awal berdasarkan rata-rata tertimbang penjualan 3 sesi terakhir.
- **Signature:**
```sql
get_product_stock_recommendation(
  p_master_product_id UUID,
  p_company_id UUID
) RETURNS INT
```
- **Formula:** $0.5 \times S_{-1} + 0.3 \times S_{-2} + 0.2 \times S_{-3}$ (dibulatkan ke atas).

---

### 7.7. `get_cash_flow_summary` & `get_cash_flow_list`
- **`get_cash_flow_summary(p_company_id UUID)`:** Mengembalikan total pemasukan kumulatif, total pengeluaran kumulatif, dan saldo kas berjalan (*running balance*).
- **`get_cash_flow_list(p_company_id UUID, p_limit INT, p_offset INT)`:** Mengambil daftar riwayat transaksi kas masuk/keluar terpaginasi.
- **`add_cash_flow(p_company_id UUID, p_type TEXT, p_category TEXT, p_amount INT, p_description TEXT)`:** Mencatat entri arus kas manual.

---

### 7.8. `get_umkm_payment_summary` & `mark_umkm_as_paid`
- **`get_umkm_payment_summary(p_company_id UUID)`:** Mengambil ringkasan utang konsinyasi per UMKM (total hak modal all-time, total telah ditransfer, sisa kewajiban yang belum dibayar).
- **`mark_umkm_as_paid(p_company_id UUID, p_umkm_id UUID, p_amount INT, p_payment_method TEXT, p_notes TEXT)`:** Mencatat pembayaran ke UMKM, mengurangi utang, dan otomatis membuat entri pengeluaran kas (`expense`, `umkm_payout`) di buku kas.
- **`get_umkm_payment_history_all(p_company_id UUID)`:** Mengambil log audit seluruh transfer pelunasan modal UMKM.

---

### 7.9. `get_weekly_trends`
- **Fungsi:** Mengambil deret waktu penjualan 10 sesi tertutup terakhir untuk visualisasi Chart.js.
- **Signature:**
```sql
get_weekly_trends(p_company_id UUID)
RETURNS TABLE (
  session_id UUID,
  tanggal DATE,
  gross_revenue BIGINT,
  umkm_remittance BIGINT,
  omk_profit BIGINT
)
```
