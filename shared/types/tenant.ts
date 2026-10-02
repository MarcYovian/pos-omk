export interface TenantContext {
  companyId: string
  companyName: string
  companySlug: string
  roleCode: string
  isSuperAdmin: boolean
  id?: string
  email?: string
  user?: any
}

declare module 'h3' {
  interface H3EventContext {
    tenant?: TenantContext
  }
}
