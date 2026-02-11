import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface UpdateUserBody {
  id: string
  fullName?: string
  phone?: string
  role?: 'staff' | 'branch_manager' | 'super_admin' | 'customer' | 'driver'
  managedStoreIds?: string[] | null
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const supabaseUrl =
    ((config.public as any)?.supabase?.url as string | undefined) ||
    (process.env.SUPABASE_URL as string | undefined)

  const serviceRoleKey =
    (config.supabaseServiceRoleKey as string | undefined) ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined)

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server not configured for admin user updates'
    })
  }

  const authHeader = event.node.req.headers['authorization']
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader
  const token = typeof bearer === 'string' && bearer.startsWith('Bearer ')
    ? bearer.slice('Bearer '.length)
    : null

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing Authorization Bearer token'
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as ReturnType<typeof createClient<Database>>

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !callerData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid session'
    })
  }

  const callerId = callerData.user.id
  const { data: callerProfile, error: profileErr } = await (admin as any)
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .single()

  if (profileErr) {
    throw createError({
      statusCode: 500,
      statusMessage: profileErr.message
    })
  }

  if (callerProfile?.role !== 'super_admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not authorized'
    })
  }

  const body = await readBody<UpdateUserBody>(event)
  if (!body?.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User id is required'
    })
  }

  const updateData: Database['public']['Tables']['profiles']['Update'] = {
    full_name: body.fullName ?? null,
    phone_number: body.phone ?? null,
    role: (body.role as any) ?? undefined,
    managed_store_ids: Array.isArray(body.managedStoreIds)
      ? (body.managedStoreIds.length > 0 ? body.managedStoreIds : null)
      : body.managedStoreIds === null
        ? null
        : undefined
  }

  const { data, error } = await (admin as any)
    .from('profiles')
    .update(updateData)
    .eq('id', body.id)
    .select('*')
    .single()

  if (!error && body.role) {
    const { data: targetUserData, error: targetUserErr } = await (admin as any).auth.admin.getUserById(body.id)
    if (targetUserErr) {
      throw createError({
        statusCode: 400,
        statusMessage: targetUserErr.message
      })
    }

    const existingAppMeta = (targetUserData?.user as any)?.app_metadata || {}
    const { error: authUpdateErr } = await (admin as any).auth.admin.updateUserById(body.id, {
      app_metadata: {
        ...existingAppMeta,
        role: body.role
      }
    })

    if (authUpdateErr) {
      throw createError({
        statusCode: 400,
        statusMessage: authUpdateErr.message
      })
    }
  }

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return { success: true, profile: data }
})
