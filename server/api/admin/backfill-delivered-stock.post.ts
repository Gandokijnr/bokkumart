import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type BackfillBody = {
  limit?: number
  dryRun?: boolean
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
    throw createError({ statusCode: 500, statusMessage: 'Server not configured' })
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
    .select('role')
    .eq('id', callerId)
    .single()

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message })
  }

  const role = (callerProfile as any)?.role
  const allowedRoles = ['admin', 'super_admin', 'branch_manager', 'staff', 'manager']
  if (!allowedRoles.includes(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
  }

  const body = (await readBody<BackfillBody>(event)) || {}
  const limit = Number.isFinite(body.limit) ? Math.max(1, Math.min(1000, Number(body.limit))) : 200
  const dryRun = !!body.dryRun

  const { data: deliveredOrders, error: fetchErr } = await (admin as any)
    .from('orders')
    .select('id, status, store_id, items, metadata')
    .eq('status', 'delivered')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (fetchErr) {
    throw createError({ statusCode: 400, statusMessage: fetchErr.message })
  }

  const candidates = (deliveredOrders || []).filter((o: any) => !(o?.metadata as any)?.stock_finalized_at)

  const results = {
    scanned: (deliveredOrders || []).length,
    eligible: candidates.length,
    finalized: 0,
    skipped: 0,
    errors: [] as Array<{ orderId: string; message: string }>
  }

  for (const order of candidates as any[]) {
    const orderId = String(order?.id || '')
    const storeId = String(order?.store_id || '')
    const items = Array.isArray(order?.items) ? order.items : []

    if (!orderId || !storeId || items.length === 0) {
      results.skipped++
      continue
    }

    if (dryRun) {
      results.finalized++
      continue
    }

    try {
      const mergedMetadata = {
        ...(order.metadata || {}),
        stock_finalized_at: new Date().toISOString(),
        stock_finalized_by: callerId,
        stock_finalized_source: 'backfill'
      }

      const { error: markErr } = await (admin as any)
        .from('orders')
        .update({ metadata: mergedMetadata, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (markErr) {
        results.errors.push({ orderId, message: markErr.message })
        continue
      }

      for (const item of items as any[]) {
        const productId = String(item?.product_id || '')
        const quantity = Number(item?.quantity || 0)
        const itemStoreId = String(item?.store_id || storeId)

        if (!productId || !itemStoreId || !Number.isFinite(quantity) || quantity <= 0) continue

        const { data: invRow, error: invErr } = await (admin as any)
          .from('store_inventory')
          .select('id, stock_level, reserved_stock')
          .eq('store_id', itemStoreId)
          .eq('product_id', productId)
          .single()

        if (invErr || !invRow) continue

        const currentStock = Number(invRow.stock_level || 0)
        const currentReserved = Number(invRow.reserved_stock || 0)

        const nextStock = Math.max(0, currentStock - quantity)
        const nextReserved = Math.max(0, currentReserved - quantity)
        const nextAvailable = Math.max(0, nextStock - nextReserved)

        await (admin as any)
          .from('store_inventory')
          .update({
            stock_level: nextStock,
            reserved_stock: nextReserved,
            available_stock: nextAvailable,
            is_visible: nextAvailable > 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', invRow.id)
      }

      results.finalized++
    } catch (e: any) {
      results.errors.push({ orderId, message: e?.message || 'Unknown error' })
    }
  }

  return { success: true, ...results, dryRun }
})
