import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface CreateUserBody {
  email: string
  password: string
  fullName?: string
  phone?: string
  role?: 'staff' | 'branch_manager' | 'super_admin' | 'customer' | 'driver'
  managedStoreIds?: string[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = (config.supabaseServiceRoleKey as string | undefined) || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server not configured for admin user creation'
    })
  }

  // Verify the caller is authenticated and is a super_admin
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

  const body = await readBody<CreateUserBody>(event)
  if (!body?.email || !body?.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required'
    })
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.fullName || '',
      phone: body.phone || '',
      role: body.role || 'staff',
      managed_store_ids: body.managedStoreIds || []
    }
  })

  if (createErr || !created?.user) {
    throw createError({
      statusCode: 400,
      statusMessage: createErr?.message || 'Failed to create user'
    })
  }

  const { error: updateProfileErr } = await (admin as any)
    .from('profiles')
    .update({
      full_name: body.fullName || null,
      phone_number: body.phone || null,
      role: body.role || 'staff',
      managed_store_ids: body.managedStoreIds && body.managedStoreIds.length > 0 ? body.managedStoreIds : null
    })
    .eq('id', created.user.id)

  if (updateProfileErr) {
    throw createError({
      statusCode: 400,
      statusMessage: updateProfileErr.message
    })
  }

  return {
    success: true,
    user: {
      id: created.user.id,
      email: created.user.email
    }
  }
})
