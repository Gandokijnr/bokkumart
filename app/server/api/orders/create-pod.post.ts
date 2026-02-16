import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type CartItem = {
  product_id: string
  name?: string
  quantity: number
  unit_price?: number
  total_price?: number
  options?: Record<string, any>
}

type CreatePodBody = {
  store_id: string
  delivery_method: 'pickup' | 'delivery'
  delivery_details?: any
  delivery_zone?: string | null
  contact_name: string
  contact_phone: string
  items: CartItem[]
  subtotal: number
  delivery_fee: number
  service_fee?: number
  total_amount: number
}

function normalizePhone(phone: string) {
  return String(phone || '').trim()
}

function isPhoneVerified(profile: any) {
  return !!String(profile?.phone_number || '').trim()
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

  const userId = callerData.user.id
  const body = (await readBody<CreatePodBody>(event)) || ({} as any)

  const storeId = String((body as any)?.store_id || '')
  const deliveryMethod = (body as any)?.delivery_method
  const contactName = String((body as any)?.contact_name || '').trim()
  const contactPhone = normalizePhone(String((body as any)?.contact_phone || ''))
  const items = Array.isArray((body as any)?.items) ? (body as any).items : []

  if (!storeId || !deliveryMethod || !contactName || !contactPhone || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }

  if (deliveryMethod === 'pickup') {
    throw createError({ statusCode: 400, statusMessage: 'Pickup requires upfront payment' })
  }

  const { data: profile, error: profileErr } = await (admin as any)
    .from('profiles')
    .select('id, phone_number, created_at')
    .eq('id', userId)
    .single()

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message })
  }

  if (!isPhoneVerified(profile)) {
    throw createError({ statusCode: 403, statusMessage: 'Phone verification required for pay-on-delivery' })
  }

  const createdAt = profile?.created_at ? new Date(String(profile.created_at)).getTime() : NaN
  const isNewUser = Number.isFinite(createdAt) ? (Date.now() - createdAt) < 7 * 24 * 60 * 60 * 1000 : false

  if (isNewUser) {
    const { count: podCount, error: podCountErr } = await (admin as any)
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('payment_method', 'pod')

    if (podCountErr) {
      throw createError({ statusCode: 500, statusMessage: podCountErr.message })
    }

    if ((podCount || 0) >= 1) {
      throw createError({ statusCode: 403, statusMessage: 'Pay-on-delivery is temporarily limited for new accounts. Please pay online.' })
    }
  }

  const { data: recentOrders, error: recentErr } = await (admin as any)
    .from('orders')
    .select('id, status, payment_method, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (recentErr) {
    throw createError({ statusCode: 500, statusMessage: recentErr.message })
  }

  const cancels = (recentOrders || []).filter((o: any) => String(o?.status) === 'cancelled').length
  if (cancels >= 3) {
    throw createError({ statusCode: 403, statusMessage: 'Pay-on-delivery is disabled due to repeated cancellations. Please pay online.' })
  }

  const insertPayload: any = {
    user_id: userId,
    store_id: storeId,
    status: 'pending',
    items,
    delivery_method: deliveryMethod,
    delivery_details: (body as any)?.delivery_details || null,
    subtotal: Number((body as any)?.subtotal || 0),
    delivery_fee: Number((body as any)?.delivery_fee || 0),
    total_amount: Number((body as any)?.total_amount || 0),
    payment_method: 'pod',
    nearest_landmark: null,
    driver_notes: null,
    metadata: {
      service_fee: Number((body as any)?.service_fee || 0),
      delivery_zone: (body as any)?.delivery_zone || null,
      fraud_controls: {
        is_new_user: isNewUser,
        recent_cancellations: cancels
      }
    }
  }

  const { data: orderRow, error: orderErr } = await (admin as any)
    .from('orders')
    .insert(insertPayload)
    .select('id')
    .single()

  if (orderErr) {
    throw createError({ statusCode: 400, statusMessage: orderErr.message })
  }

  return { success: true, order_id: orderRow?.id }
})
