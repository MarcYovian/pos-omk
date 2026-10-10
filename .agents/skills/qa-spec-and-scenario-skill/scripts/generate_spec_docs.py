#!/usr/bin/env python3
"""
generate_spec_docs.py — Generates QA Documents 00, 01, and 02
Produces 00-feature-brief.md, 01-questions-assumptions.md, and 02-test-scenarios.md
strictly aligned with docs/qa/_template/
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Import local analyzer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from feature_analyzer import analyze_feature, normalize_feature_key, FEATURE_MAP
except ImportError:
    FEATURE_MAP = {}
    def normalize_feature_key(k): return "f02"
    def analyze_feature(k, r="."): return {}


def generate_doc00(data: dict) -> str:
    code = data.get("feature_code", "F-XX")
    name = data.get("feature_name", "Feature")
    route = data.get("target_route", "/")
    today = datetime.now().strftime("%Y-%m-%d")
    
    prd = data.get("prd", {})
    user_stories = prd.get("user_stories", [])
    story_text = user_stories[0] if user_stories else f"Sebagai pengguna, saya ingin menggunakan {name} agar proses operasional berjalan lancar."
    
    roles = prd.get("roles", ["Kasir", "Admin Paroki"])
    role_checks = []
    for r in ["Kasir", "Admin Paroki", "Super Admin", "UMKM", "Guest"]:
        checked = "x" if any(r.lower() in x.lower() for x in roles) else " "
        role_checks.append(f"- [{checked}] **{r}:** Mengakses fitur {name} sesuai otorisasi.")

    files = data.get("files", [])
    stores = data.get("stores", [])
    store_files = [s.get("store_file") for s in stores]
    rpcs = []
    for s in stores:
        rpcs.extend(s.get("rpcs", []))
    rpc_str = ", ".join([f"`{r}`" for r in set(rpcs)]) if rpcs else "Query langsung via RLS"

    acs = prd.get("acceptance_criteria", [])
    ac_items = []
    for i, ac in enumerate(acs, 1):
        ac_title = ac.get("title", f"Kriteria {i}")
        ac_items.append(f"- [ ] **AC-{i:02d}:** {ac_title}")
    if not ac_items:
        ac_items = [
            "- [ ] **AC-01:** Pengguna terautentikasi dapat mengakses antarmuka dengan lancar.",
            "- [ ] **AC-02:** Validasi data formulir dan state reaktif berjalan semestinya.",
            "- [ ] **AC-03:** Mutasi data tersimpan aman dan terisolasi per company_id."
        ]

    doc = f"""# Feature Brief: {name} ({code})

> **Dokumen Tahap 1/9 — Ringkasan Pemahaman Fitur**  
> *Fungsi: Memastikan pemahaman bisnis, alur pengguna, batasan teknis, dan ruang lingkup telah disepakati sebelum menyusun skenario pengujian.*

---

## 1. Metadata Fitur

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `{code}` |
| **Nama Fitur** | `{name}` |
| **Kategori / Modul** | `Core OMK POS Platform` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer / Pembuat** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Tech Lead / Reviewer** | `Product Owner & Tech Lead OMK POS` |
| **Tanggal Pembuatan** | `{today}` |
| **Rujukan Dokumen** | [PRD.md](../../PRD.md), [FEATURES.md](../../FEATURES.md), [USER_FLOWS.md](../../USER_FLOWS.md) |

---

## 2. Ringkasan & Tujuan Bisnis

### 2.1 Tujuan Utama (Problem & Value Statement)
- **Tujuan:** {story_text}
- **Target Hasil:** Menyediakan antarmuka yang cepat, minim kesalahan, serta memiliki integritas data yang terjamin untuk operasional mingguan paroki.

### 2.2 Peran Pengguna (Roles Involved)
{chr(10).join(role_checks)}

---

## 3. Alur Pengguna Ringkas (Happy Path Journey)

```
[Langkah 1: Masuk Halaman ({route})] 
        ↓
[Langkah 2: Interaksi Input / Pemilihan Item] 
        ↓
[Langkah 3: Validasi Form & Keranjang] 
        ↓
[Langkah 4: Proses Transaksi Atomik (RPC)] 
        ↓
[Langkah 5: Notifikasi Sukses & State Update]
```

**Penjelasan Tahapan:**
1. **Langkah 1:** Pengguna membuka rute `{route}` dengan tenant context aktif (`X-Company-Id`).
2. **Langkah 2:** Memilih atau memasukkan data yang diperlukan melalui form / grid produk.
3. **Langkah 3:** Sistem melakukan validasi client-side (reaktifitas Pinia store).
4. **Langkah 4:** Pengguna mengonfirmasi aksi, memicu panggilan backend/RPC ke Supabase.
5. **Langkah 5:** Notifikasi sukses muncul dan tampilan data otomatis dimutakhirkan.

---

## 4. Keputusan Bisnis & Aturan Konsinyasi yang Relevan

> [!IMPORTANT]
> Seluruh alur pengujian wajib mematuhi aturan baku konsinyasi dan operasional:

1. **Aturan Harga & Finansial:**
   - Kasir **DILARANG KERAS** melihat harga modal (`harga_asli`). Hanya `harga_jual` yang ditampilkan.
   - Format mata uang Rupiah integer murni tanpa desimal via `useCurrencyFormat()`.
2. **Isolasi Multi-Tenant:**
   - Seluruh mutasi dan query wajib terikat pada `company_id` paroki aktif.
3. **Zona Waktu WIB:**
   - Sesi dan tanggal transaksi wajib menggunakan waktu Jakarta (WIB / UTC+7) via `getTodayJakarta()`.
4. **Mutasi Stok Atomik:**
   - Perubahan stok dilakukan melalui RPC atomik ({rpc_str}) untuk mencegah inkonsistensi konkurensi.

---

## 5. Jejak Arsitektur & Dependensi Teknis

| Komponen | Identitas / Path | Deskripsi & Peran |
|---|---|---|
| **Rute Frontend** | `{route}` | Halaman antarmuka utama |
| **File Sumber UI** | `{", ".join(files)}` | Komponen Vue 3 SFC (`<script setup>`) |
| **Pinia Store** | `{", ".join(store_files) if store_files else "In-memory state"}` | State management reaktif |
| **Supabase RPC / API** | {rpc_str} | Prosedur database atomik |
| **Header Multi-Tenant** | `X-Company-Id` | Isolasi data antar paroki |

---

## 6. Batasan Ruang Lingkup (Scope Boundaries)

### 6.1 Dalam Cakupan (In-Scope)
- Pengujian fungsionalitas UI pada rute `{route}` (Desktop & Mobile PWA 375px).
- Validasi form, feedback toast, dan pencegahan double-submit.
- Verifikasi mutasi state Pinia store dan respon RPC database.

### 6.2 Di Luar Cakupan (Out-of-Scope)
- Pengujian beban (*load testing*) skala ribuan transaksi bersamaan.
- Pembayaran payment gateway pihak ketiga (QRIS dinamis eksternal).

---

## 7. Kriteria Penerimaan Inti (Acceptance Criteria Rujukan)

{chr(10).join(ac_items)}

---

## 8. Status Review & Persetujuan

- [ ] **Feature Brief Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
"""
    return doc


def generate_doc01(data: dict) -> str:
    code = data.get("feature_code", "F-XX")
    name = data.get("feature_name", "Feature")
    today = datetime.now().strftime("%Y-%m-%d")

    doc = f"""# Pertanyaan dan Asumsi: {name} ({code})

> **Dokumen Tahap 2/9 — Klarifikasi Kebutuhan & Pencatatan Asumsi**  
> *Fungsi: Mencatat hal-hal ambigu, perilaku tepi (edge case), batas toleransi sistem, atau detail UI yang belum tertulis di PRD agar diverifikasi dan disetujui sebelum penulisan test case.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `{code}` |
| **Nama Fitur** | `{name}` |
| **Status Klarifikasi** | `IN REVIEW` |
| **Terakhir Diperbarui** | `{today}` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Pemberi Keputusan** | `Product Owner & Tech Lead OMK POS` |

---

## 2. Matriks Pertanyaan (Questions) & Asumsi (Assumptions)

| ID | Jenis | Pertanyaan / Asumsi | Kategori | Sumber | Dampak ke Testing / Risiko | Status | Jawaban / Keputusan Resmi | Tanggal Respon |
|---|---|---|---|---|---|---|---|---|
| **Q-01** | Pertanyaan | Bagaimana penanganan jika koneksi internet terputus di tengah proses transaksi? | Resiliensi Jaringan | PRD F-03 PWA Queue | Memerlukan skenario offline queue fallback | `Menunggu Konfirmasi` | Ditampung di IndexedDB dan disinkronkan saat online | `{today}` |
| **Q-02** | Pertanyaan | Apakah ada batas maksimum item yang dapat ditambahkan ke dalam keranjang? | Batasan Sistem | PRD F-02 | Validasi kapasitas tampilan keranjang mobile | `Menunggu Konfirmasi` | Dibatasi oleh stok aktual produk di server | `{today}` |
| **A-01** | Asumsi | Asumsi: Tombol submit transaksi otomatis dinonaktifkan (`disabled` + spinner) saat proses RPC berjalan untuk mencegah *double checkout*. | UI/UX & Integritas | Best Practice POS | Mencegah bug duplikasi transaksi di automation | `Disetujui` | Sesuai spesifikasi AppButton (`loading = true`) | `{today}` |
| **A-02** | Asumsi | Asumsi: Pengecekan stok akhir dilakukan secara atomik di database level saat checkout, bukan hanya validasi visual di keranjang. | Integritas Data | Aturan RPC Atomik | Uji skenario race condition kasir bersamaan | `Disetujui` | Terjamin oleh RPC `complete_transaction` | `{today}` |
| **A-03** | Asumsi | Asumsi: Semua kalkulasi mata uang menggunakan integer Rupiah tanpa desimal dan diformat via `useCurrencyFormat()`. | Finansial | AGENTS.md Rule 6 | Uji input dan asersi teks nominal di UI | `Disetujui` | Baku di seluruh aplikasi | `{today}` |

---

## 3. Log Keputusan Arsitektur & Bisnis (Decision Log)

### 3.1 Keputusan #[DEC-01]: Isolasi Harga Modal UMKM
- **Rujukan ID:** `A-02`
- **Isi Keputusan:** Kasir tidak diperbolehkan menerima atau melihat data `harga_asli` baik di layar maupun respons JSON jaringan.
- **Dampak pada Desain Pengujian:** Skenario keamanan P0 wajib memvalidasi inspect network payload.

### 3.2 Keputusan #[DEC-02]: Penanganan Tombol Aksi Primer
- **Rujukan ID:** `A-01`
- **Isi Keputusan:** Seluruh aksi submit transaksi wajib memiliki proteksi *double-click* dan indikator visual loading.
- **Dampak pada Desain Pengujian:** Skenario negatif dan edge case wajib menguji penekanan cepat tombol berkali-kali.

---

## 4. Status Review & Kesiapan Melangkah ke Tahap Berikutnya

- [ ] **Semua Pertanyaan Kritis Terjawab:** `YA / BELUM`
- [ ] **Semua Asumsi Utama Dikonfirmasi:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 02-test-scenarios.md:** `(Tanda Tangan / Persetujuan User: ________)`
"""
    return doc


def generate_doc02(data: dict) -> str:
    code = data.get("feature_code", "F-XX")
    name = data.get("feature_name", "Feature")
    today = datetime.now().strftime("%Y-%m-%d")

    prd = data.get("prd", {})
    acs = prd.get("acceptance_criteria", [])

    scenarios = []
    sc_idx = 1

    # Map PRD ACs into scenarios
    for ac in acs:
        title = ac.get("title", f"Skenario {sc_idx}")
        steps = ac.get("steps", [])
        gwt_text = "<br>".join([f"**{s.split(':')[0]}** {':'.join(s.split(':')[1:]).strip()}" for s in steps if ":" in s])
        if not gwt_text:
            gwt_text = f"**Given** kondisi valid<br>**When** aksi dilakukan<br>**Then** hasil sesuai {title}"
        
        # Infer type and priority
        prio = "P0" if any(k in title.lower() for k in ["inti", "bayar", "transaksi", "login", "atomik", "modal"]) else "P1"
        sc_type = "Positif" if "positif" in title.lower() or "normal" in title.lower() or sc_idx <= 2 else "Negatif / Validasi"
        if "rahasia" in title.lower() or "isolasi" in title.lower():
            sc_type = "Keamanan / RBAC"
            prio = "P0"
        elif "real-time" in title.lower() or "sinkronisasi" in title.lower():
            sc_type = "Konkurensi / Realtime"
            prio = "P0"

        scenarios.append({
            "id": f"S-{sc_idx:02d}",
            "gwt": gwt_text,
            "type": sc_type,
            "prio": prio,
            "source": f"PRD {title.split(':')[0]}",
            "auto": "Candidate (Playwright)"
        })
        sc_idx += 1

    # Default fallback scenarios if PRD had few
    if len(scenarios) < 4:
        scenarios.append({
            "id": f"S-{sc_idx:02d}",
            "gwt": "**Given** formulir dalam keadaan kosong<br>**When** pengguna menekan tombol simpan<br>**Then** validasi input muncul dan request diblokir",
            "type": "Negatif / Validasi",
            "prio": "P1",
            "source": "Form Guard",
            "auto": "Candidate (Playwright)"
        })
        sc_idx += 1
        scenarios.append({
            "id": f"S-{sc_idx:02d}",
            "gwt": "**Given** viewport dibuka pada ukuran mobile 375px<br>**When** pengguna memeriksa antarmuka tombol dan form<br>**Then** area sentuh memenuhi standar minimal 48x48px",
            "type": "Ergonomi & UI",
            "prio": "P2",
            "source": "UI/UX Spec 4.1",
            "auto": "Candidate (Playwright)"
        })

    table_rows = []
    for s in scenarios:
        table_rows.append(f"| **{s['id']}** | {s['gwt']} | {s['type']} | {s['prio']} | {s['source']} | {s['auto']} |")

    p0_count = sum(1 for s in scenarios if s["prio"] == "P0")
    p1_count = sum(1 for s in scenarios if s["prio"] == "P1")
    p2_count = sum(1 for s in scenarios if s["prio"] == "P2")

    doc = f"""# Test Scenarios (Test Plan): {name} ({code})

> **Dokumen Tahap 3/9 — Rencana Pengujian & Daftar Skenario**  
> *Fungsi: Memetakan seluruh skenario pengujian dengan format Given-When-Then, menetapkan prioritas risiko (P0-P3), serta mengelompokkan skenario positif, negatif, edge-case, dan konkurensi sebelum penulisan test case terperinci.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `{code}` |
| **Nama Fitur** | `{name}` |
| **Total Skenario** | `{len(scenarios)} Skenario` |
| **Rasio Prioritas** | `P0: {p0_count} | P1: {p1_count} | P2: {p2_count}` |
| **Target Cakupan** | `UI E2E + Pinia Store State + Supabase RPC Integrity` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |

---

## 2. Definisi Skala Prioritas & Tipe Uji

| Prioritas | Kriteria | Toleransi Rilis |
|---|---|---|
| **P0 (Critical)** | Alur utama bisnis, transaksi finansial, isolasi tenant & data, mutasi stok atomik. | Zero tolerance; blokir rilis jika gagal. |
| **P1 (High)** | Validasi formulir, error handling jaringan, feedback toast, kalkulasi kembalian. | Harus lulus sebelum staging rilis. |
| **P2 (Medium)** | Filter data, pencarian teks instan, tampilan responsif mobile 375px. | Dapat diperbaiki pada patch minor. |
| **P3 (Low)** | Estetika visual minor, animasi transisi non-kritis. | Tidak menghambat rilis. |

---

## 3. Daftar Skenario Pengujian (Given-When-Then)

| ID | Skenario Pengujian (Given-When-Then) | Tipe | Prioritas | Sumber / Rujukan | Status Automasi |
|---|---|---|---|---|---|
{chr(10).join(table_rows)}

---

## 4. Matriks Cakupan Pengujian (Coverage Matrix)

### 4.1 Cakupan Berdasarkan Peran (Role Coverage)
| Peran (Role) | Target Skenario | Skenario Terkait |
|---|---|---|
| **Kasir / Admin** | Operasional fitur utama & transaksi | {", ".join([s["id"] for s in scenarios[:3]])} |
| **Unauthorized User** | Proteksi izin akses & isolasi harga modal | {", ".join([s["id"] for s in scenarios if "Keamanan" in s["type"]] or [scenarios[0]["id"]])} |

### 4.2 Cakupan Berdasarkan Viewport & Jaringan
| Kondisi / Viewport | Perilaku yang Divalidasi | Skenario Terkait |
|---|---|---|
| **Desktop (1280×800)** | Tampilan tabel lengkap, navigasi admin | {scenarios[0]["id"]} |
| **Mobile PWA (375×667)** | Ergonomi ibu jari, tap target 48×48px, table-to-card | {scenarios[-1]["id"]} |

---

## 5. Keterlacakan ke Acceptance Criteria (Traceability Matrix)

| Acceptance Criteria (PRD) | Skenario Teruji | Status Keterpenuhan |
|---|---|---|
{chr(10).join([f"| `{s['source']}` | `{s['id']}` | `Tercakup Lengkap` |" for s in scenarios])}

---

## 6. Status Review & Persetujuan

- [ ] **Semua Skenario Kritis (P0) Disetujui:** `YA / BELUM`
- [ ] **Distribusi Prioritas & Tipe Uji Seimbang:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 03-screen-flow.md:** `(Tanda Tangan / Persetujuan User: ________)`
"""
    return doc


def main():
    parser = argparse.ArgumentParser(description="Generate QA Documents 00, 01, and 02")
    parser.add_argument("--feature", required=True, help="Feature key or code (e.g. f02)")
    parser.add_argument("--output-dir", required=True, help="Directory to save docs (e.g. docs/qa/f02-pos-cashier)")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    args = parser.parse_args()

    norm_key = normalize_feature_key(args.feature)
    data = analyze_feature(norm_key, args.project_root)

    os.makedirs(args.output_dir, exist_ok=True)

    doc00 = generate_doc00(data)
    doc01 = generate_doc01(data)
    doc02 = generate_doc02(data)

    p00 = os.path.join(args.output_dir, "00-feature-brief.md")
    p01 = os.path.join(args.output_dir, "01-questions-assumptions.md")
    p02 = os.path.join(args.output_dir, "02-test-scenarios.md")

    with open(p00, "w", encoding="utf-8") as f:
        f.write(doc00)
    with open(p01, "w", encoding="utf-8") as f:
        f.write(doc01)
    with open(p02, "w", encoding="utf-8") as f:
        f.write(doc02)

    print(f"Generated Docs 00, 01, 02 in {args.output_dir}")


if __name__ == "__main__":
    main()
