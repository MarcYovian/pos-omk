import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const umkmId = getRouterParam(event, 'id')
  if (!umkmId) throw createError({ status: 400, statusText: 'ID UMKM diperlukan' })

  const client = serverSupabaseServiceRole(event)

  // 1. Ambil data profil UMKM
  const { data: umkm, error: umkmErr } = await client
    .from('umkm')
    .select('id, nama_umkm, is_active, company_id')
    .eq('id', umkmId)
    .single()

  if (umkmErr || !umkm) throw createError({ status: 404, statusText: 'Mitra UMKM tidak ditemukan' })

  // 2. Ambil ringkasan performa via RPC SECURITY DEFINER
  const [prodRes, sessRes] = await Promise.all([
    client.rpc('get_umkm_product_performance', { p_umkm_id: umkmId }),
    client.rpc('get_umkm_session_history', { p_umkm_id: umkmId }),
  ])

  // 3. Ambil rincian produk per sesi
  const sessionDetails: Record<string, any[]> = {}
  try {
    const { data: detailData } = await client
      .from('session_products')
      .select(`
        id,
        session_id,
        stok_awal,
        stok_sekarang,
        harga_asli,
        master_product:master_products!inner(
          nama_produk,
          umkm_id
        ),
        reconciliation(
          stok_fisik
        )
      `)
      .eq('master_products.umkm_id', umkmId)

    if (detailData) {
      for (const item of (detailData as any[])) {
        const sessId = item.session_id
        if (!sessionDetails[sessId]) sessionDetails[sessId] = []

        let phys = item.stok_sekarang
        if (item.reconciliation) {
          if (Array.isArray(item.reconciliation) && item.reconciliation.length > 0) {
            phys = (item.reconciliation[0] as any).stok_fisik
          } else if (!Array.isArray(item.reconciliation)) {
            phys = (item.reconciliation as any).stok_fisik
          }
        }

        const sold = item.stok_awal - phys
        sessionDetails[sessId].push({
          nama_produk: item.master_product?.nama_produk || '',
          stok_awal: item.stok_awal,
          stok_sekarang: item.stok_sekarang,
          stok_fisik: phys,
          sold,
          harga_asli: item.harga_asli,
          total_setoran: sold * item.harga_asli,
        })
      }
    }
  } catch {
    // ignore
  }

  return {
    umkm: { id: umkm.id, nama_umkm: umkm.nama_umkm },
    products: prodRes.data || [],
    sessions: sessRes.data || [],
    sessionDetails,
  }
})
