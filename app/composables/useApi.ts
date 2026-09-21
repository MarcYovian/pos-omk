// composables/useApi.ts
export const useApi = () => {
  const supabase = useSupabase()

  const apiFetch = async <T>(url: string, opts: any = {}): Promise<T> => {
    let headers: Record<string, string> = {
      ...(opts.headers || {})
    }

    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`
      }
    } catch {
      // ignore
    }

    return $fetch<T>(url, {
      ...opts,
      headers
    })
  }

  return {
    apiFetch
  }
}
