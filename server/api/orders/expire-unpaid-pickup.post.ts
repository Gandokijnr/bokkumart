import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface ExpireUnpaidPickupBody {
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Server not configured'
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) as unknown as ReturnType<typeof createClient<Database>>

  const body = await readBody<ExpireUnpaidPickupBody>(event)
  if (!body?.orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'orderId is required'
    })
  }

  const { data: order, error: fetchError } = await (admin as any)
    .from('orders')
    .select('id, status, delivery_method, payment_method, items, metadata')
    .eq('id', body.orderId)
    .single()

  if (fetchError) {
    throw createError({
      statusCode: 400,
      statusMessage: fetchError.message
    })
  }

  if (!order) {
    return { success: true, expired: false, reason: 'Order not found' }
  }

  if (order.delivery_method !== 'pickup' || order.payment_method !== 'online') {
    return {
      success: true,
      expired: false,
      reason: 'Not a pickup online-payment order'
    }
  }

  if (order.status !== 'pending') {
    return { success: true, expired: false, reason: `Order status is ${order.status}` }
  }

  const expiresAt = (order.metadata as any)?.payment_expires_at
  if (!expiresAt) {
    return { success: true, expired: false, reason: 'No payment_expires_at set' }
  }

  const expired = Date.now() > new Date(expiresAt).getTime()
  if (!expired) {
    return { success: true, expired: false, reason: 'Not expired yet' }
  }

  const { error: updateError } = await (admin as any)
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      metadata: {
        ...(order.metadata || {}),
        expired_at: new Date().toISOString(),
        expiry_reason: 'pickup_payment_timeout'
      }
    })
    .eq('id', body.orderId)

  if (updateError) {
    throw createError({
      statusCode: 400,
      statusMessage: updateError.message
    })
  }

  const items = Array.isArray(order.items) ? order.items : []
  for (const item of items as any[]) {
    if (!item?.product_id || !item?.quantity) continue
    await (admin as any).rpc('release_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity
    })
  }

  return { success: true, expired: true }
})
