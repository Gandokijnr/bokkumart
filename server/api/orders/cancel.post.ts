import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type CancelBody = {
  orderId: string
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
  const token =
    typeof bearer === 'string' && bearer.startsWith('Bearer ')
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

  const userId = callerData.user.id
  const body = (await readBody<CancelBody>(event)) || ({} as any)
  const orderId = String((body as any)?.orderId || '')

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'orderId is required' })
  }

  const { data: orderRow, error: orderErr } = await (admin as any)
    .from('orders')
    .select('id, user_id, status, payment_method, created_at, metadata')
    .eq('id', orderId)
    .single()

  if (orderErr || !orderRow) {
    throw createError({
      statusCode: 400,
      statusMessage: orderErr?.message || 'Order not found'
    })
  }

  if (String(orderRow.user_id) !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
  }

  const status = String(orderRow.status || '')
  if (!['pending', 'processing'].includes(status)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Order cannot be cancelled (status: ${status})`
    })
  }

  const { data: recentOrders, error: recentErr } = await (admin as any)
    .from('orders')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (recentErr) {
    throw createError({ statusCode: 500, statusMessage: recentErr.message })
  }

  const cancelledCount = (recentOrders || []).filter((o: any) => String(o?.status) === 'cancelled')
    .length
  if (cancelledCount >= 5) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many cancellations. Please contact support.'
    })
  }

  const { error: updateErr } = await (admin as any)
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      metadata: {
        ...(orderRow?.metadata || {}),
        cancelled_by: 'customer',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'customer_request'
      }
    })
    .eq('id', orderId)

  if (updateErr) {
    throw createError({ statusCode: 400, statusMessage: updateErr.message })
  }

  return { success: true }
})
