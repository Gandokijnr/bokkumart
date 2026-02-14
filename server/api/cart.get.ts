import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

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
  const token =
    typeof bearer === 'string' && bearer.startsWith('Bearer ')
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

  const userId = callerData.user.id

  const { data: cart, error } = await (admin as any)
    .from('carts')
    .select(
      `
        id,
        store_id,
        store_name,
        delivery_method,
        delivery_address,
        contact_phone,
        delivery_zone,
        cart_items (
          product_id,
          store_id,
          name,
          price,
          quantity,
          max_quantity,
          digital_buffer,
          image_url,
          options
        )
      `
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return { success: true, cart }
})
