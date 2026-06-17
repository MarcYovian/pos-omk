export interface UserRecord {
  id: string
  email: string
  role: 'admin' | 'cashier'
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

export interface CreateUserBody {
  email: string
  role: 'admin' | 'cashier'
}

export interface UpdateUserBody {
  email?: string
  password?: string
  role?: 'admin' | 'cashier'
}

export interface ToggleActiveBody {
  is_active: boolean
}

export interface CreateUserResponse extends UserRecord {
  password: string
}
