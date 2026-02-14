import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface UpdateStoreInventoryBody {
  id: string
  store_id: string
  stock_level?: number
  reserved_stock?: number
  digital_buffer?: number
  is_visible?: boolean
  store_price?: number | null
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
      statusMessage: 'Server not configured for inventory operations'
    })
  }

  const authHeader = event.node.req.headers['authorization']
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader
  const token = typeof bearer === 'string' && bearer.startsWith('Bearer ')
    ? bearer.slice('Bearer '.length)
    : null

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Authorization Bearer token' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as ReturnType<typeof createClient<Database>>

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !callerData?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  const callerId = callerData.user.id
  const { data: callerProfile, error: profileErr } = await (admin as any)
    .from('profiles')
    .select('role, managed_store_ids')
    .eq('id', callerId)
    .single()

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message })
  }

  const isSuperAdmin = callerProfile?.role === 'super_admin'
  const isBranchManager = callerProfile?.role === 'branch_manager'

  if (!isSuperAdmin && !isBranchManager) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized to manage inventory' })
  }

  const body = await readBody<UpdateStoreInventoryBody>(event)
  if (!body?.id || !body?.store_id) {
    throw createError({ statusCode: 400, statusMessage: 'id and store_id are required' })
  }

  if (!isSuperAdmin) {
    const allowedStoreIds = (callerProfile?.managed_store_ids || []) as string[]
    if (!allowedStoreIds.includes(body.store_id)) {
      throw createError({ statusCode: 403, statusMessage: 'Not authorized to manage this store' })
    }
  }

  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (typeof body.stock_level === 'number') updateData.stock_level = Math.max(0, Math.trunc(body.stock_level))
  if (typeof body.reserved_stock === 'number') updateData.reserved_stock = Math.max(0, Math.trunc(body.reserved_stock))
  if (typeof body.digital_buffer === 'number') updateData.digital_buffer = Math.max(0, Math.trunc(body.digital_buffer))
  if (typeof body.is_visible === 'boolean') updateData.is_visible = body.is_visible
  if (Object.prototype.hasOwnProperty.call(body, 'store_price')) updateData.store_price = body.store_price

  const { data, error } = await (admin as any)
    .from('store_inventory')
    .update(updateData)
    .eq('id', body.id)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { success: true, inventory: data }
})
