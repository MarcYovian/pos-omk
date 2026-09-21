export interface UserRecord {
  id: string
  email: string
  role: 'admin' | 'cashier' | string
  role_name?: string
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  effective_permissions?: string[]
  custom_overrides_count?: number
}

export interface CreateUserBody {
  email: string
  role: 'admin' | 'cashier' | string
}

export interface UpdateUserBody {
  email?: string
  password?: string
  role?: 'admin' | 'cashier' | string
}

export interface ToggleActiveBody {
  is_active: boolean
}

export interface CreateUserResponse extends UserRecord {
  password: string
}

// RBAC & Permissions Types
export interface PermissionRecord {
  id: string
  code: string
  name: string
  module: string
  description: string | null
}

export interface RoleRecord {
  id: string
  code: string
  name: string
  description: string | null
  is_system: boolean
  permissions: string[]
  created_at?: string
  updated_at?: string
}

export interface CreateRoleBody {
  code: string
  name: string
  description?: string
  permissions: string[]
}

export interface UpdateRoleBody {
  name?: string
  description?: string
  permissions?: string[]
}

export interface UserPermissionOverrideItem {
  permission_id: string
  code: string
  name: string
  module: string
  inherited_from_role: boolean
  is_granted: boolean | null // null = inherit, true = grant override, false = revoke override
}

export interface UserPermissionsResponse {
  user_id: string
  email: string
  role_code: string
  role_name: string
  effective_permissions: string[]
  permissions: UserPermissionOverrideItem[]
}

export interface UpdateUserPermissionsBody {
  role_code?: string
  overrides: Array<{
    permission_id: string
    is_granted: boolean | null // null means delete override
  }>
}
