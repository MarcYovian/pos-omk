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

  return {
    umkm: { id: umkm.id, nama_umkm: umkm.nama_umkm },
    products: prodRes.data || [],
    sessions: sessRes.data || [],
  }
})
