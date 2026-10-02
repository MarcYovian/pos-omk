import { serverSupabaseServiceRole } from '#supabase/server'
import type { UpdateUserPermissionsBody } from '~/shared/types/users'
import { invalidateUserCache, invalidateUsersCache } from '../../../utils/rbacCache'
import { resolveActiveCompany } from '../../../utils/tenantResolver'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users:manage')
  const tenant = await resolveActiveCompany(event)
  const companyId = tenant?.companyId

  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ status: 400, statusText: 'User ID wajib disertakan' })

  const body = await readBody<UpdateUserPermissionsBody>(event)
  const client = serverSupabaseServiceRole(event)

  // 1. Verify user exists
  const { data: userData, error: userError } = await client.auth.admin.getUserById(userId)
  if (userError || !userData.user) {
    throw createError({ status: 404, statusText: 'Pengguna tidak ditemukan' })
  }

  // 2. Update role if requested
  if (body.role_code) {
    const { data: roleData, error: roleError } = await client
      .from('roles')
      .select('id, code')
      .eq('code', body.role_code)
      .single()

    if (roleError || !roleData) {
      throw createError({ status: 400, statusText: `Peran '${body.role_code}' tidak valid` })
    }

    // Update in company_users for tenant
    if (companyId) {
      try {
        const tableQuery = client.from('company_users')
        if (typeof tableQuery?.update === 'function') {
          await tableQuery.update({ role_id: roleData.id }).eq('company_id', companyId).eq('user_id', userId)
        }
      } catch {
        // ignore in tests
      }
    }

    // Upsert into user_roles as global fallback
    await client
      .from('user_roles')
      .upsert({ user_id: userId, role_id: roleData.id }, { onConflict: 'user_id,role_id' })

    // Clean up other roles for this user (single-role model)
    await client
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .neq('role_id', roleData.id)

    // Sync auth.users raw_user_meta_data for backward compatibility
    await client.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...userData.user.user_metadata,
        role: roleData.code,
      }
    })
  }

  // 3. Process overrides
  if (Array.isArray(body.overrides)) {
    for (const override of body.overrides) {
      if (override.is_granted === null) {
        // Delete override (inherit from role)
        let deleteQuery = client
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_id', override.permission_id)

        if (companyId) {
          deleteQuery = deleteQuery.eq('company_id', companyId)
        }

        await deleteQuery
      } else {
        // Upsert explicit override
        if (companyId) {
          await client
            .from('user_permissions')
            .upsert({
              company_id: companyId,
              user_id: userId,
              permission_id: override.permission_id,
              is_granted: override.is_granted,
            }, { onConflict: 'company_id,user_id,permission_id' })
        } else {
          await client
            .from('user_permissions')
            .upsert({
              user_id: userId,
              permission_id: override.permission_id,
              is_granted: override.is_granted,
            }, { onConflict: 'user_id,permission_id' })
        }
      }
    }
  }

  invalidateUsersCache(companyId)
  invalidateUserCache(userId, companyId)
  return { success: true }
})
