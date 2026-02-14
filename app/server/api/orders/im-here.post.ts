import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

interface ImHereBody {
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

  const body = await readBody<ImHereBody>(event)
  if (!body?.orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'orderId is required'
    })
  }

  const callerId = callerData.user.id
  const { data: order, error: fetchError } = await (admin as any)
    .from('orders')
    .select('id, user_id, status, delivery_method, metadata')
    .eq('id', body.orderId)
    .single()

  if (fetchError) {
    throw createError({
      statusCode: 400,
      statusMessage: fetchError.message
    })
  }

  if (!order || order.user_id !== callerId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not authorized'
    })
  }

  if (order.delivery_method !== 'pickup') {
    throw createError({
      statusCode: 400,
      statusMessage: 'This order is not a pickup order'
    })
  }

  const existingArrivedAt = (order.metadata as any)?.pickup_arrived_at
  if (existingArrivedAt) {
    return { success: true, alreadyReported: true, pickup_arrived_at: existingArrivedAt }
  }

  const pickupArrivedAt = new Date().toISOString()
  const mergedMetadata = {
    ...(order.metadata || {}),
    pickup_arrived_at: pickupArrivedAt
  }

  const { data: updated, error: updateError } = await (admin as any)
    .from('orders')
    .update({
      metadata: mergedMetadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', body.orderId)
    .select('id, metadata')
    .single()

  if (updateError) {
    throw createError({
      statusCode: 400,
      statusMessage: updateError.message
    })
  }

  return { success: true, order: updated }
})
