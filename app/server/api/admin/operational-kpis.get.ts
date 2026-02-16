import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type OperationalKpis = {
  window_days: number
  orders_today: number
  orders_per_day: number
  average_order_value: number
  fulfillment_time_hours: number | null
  cancellation_rate: number
  stock_mismatch_rate: number
}

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function safeNumber(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
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
    .select('role, store_id, managed_store_ids')
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

  const windowDays = 7
  const windowStart = daysAgoIso(windowDays)
  const todayStart = startOfTodayIso()

  const scopedStoreId: string | null = (() => {
    if (role === 'super_admin') return null
    if ((callerProfile as any)?.store_id) return String((callerProfile as any).store_id)
    const managed = (callerProfile as any)?.managed_store_ids
    if (Array.isArray(managed) && managed.length > 0) return String(managed[0] || '') || null
    return null
  })()

  let ordersQuery = (admin as any)
    .from('orders')
    .select('id, store_id, status, total_amount, created_at, paid_at, delivered_at')
    .gte('created_at', windowStart)

  if (scopedStoreId) {
    ordersQuery = ordersQuery.eq('store_id', scopedStoreId)
  }

  const { data: orders, error: ordersErr } = await ordersQuery
  if (ordersErr) {
    throw createError({ statusCode: 500, statusMessage: ordersErr.message })
  }

  const ordersArr = (orders || []) as any[]
  const totalWindowOrders = ordersArr.length

  const ordersToday = ordersArr.filter((o) => String(o?.created_at || '') >= todayStart).length

  const netOrders = ordersArr.filter((o) => !['cancelled', 'refunded'].includes(String(o?.status || '')))
  const netOrdersWithAmount = netOrders
    .map((o) => safeNumber(o?.total_amount))
    .filter((n) => n > 0)

  const averageOrderValue = netOrdersWithAmount.length > 0
    ? netOrdersWithAmount.reduce((a, b) => a + b, 0) / netOrdersWithAmount.length
    : 0

  const deliveredOrders = ordersArr.filter((o) => String(o?.status || '') === 'delivered' && !!o?.delivered_at)
  const fulfillmentDurationsHours = deliveredOrders
    .map((o) => {
      const start = o?.paid_at || o?.created_at
      const end = o?.delivered_at
      if (!start || !end) return null
      const diffMs = new Date(end).getTime() - new Date(start).getTime()
      if (!Number.isFinite(diffMs) || diffMs < 0) return null
      return diffMs / (1000 * 60 * 60)
    })
    .filter((v) => typeof v === 'number' && Number.isFinite(v)) as number[]

  const fulfillmentTimeHours = fulfillmentDurationsHours.length > 0
    ? fulfillmentDurationsHours.reduce((a, b) => a + b, 0) / fulfillmentDurationsHours.length
    : null

  const cancelledCount = ordersArr.filter((o) => String(o?.status || '') === 'cancelled').length
  const cancellationRate = totalWindowOrders > 0 ? cancelledCount / totalWindowOrders : 0

  let mismatchRate = 0
  try {
    let interactionsQuery = (admin as any)
      .from('order_interactions')
      .select('order_id, interaction_type, notes, created_at, orders!inner(store_id)')
      .eq('interaction_type', 'rejection')
      .gte('created_at', windowStart)

    if (scopedStoreId) {
      interactionsQuery = interactionsQuery.eq('orders.store_id', scopedStoreId)
    }

    const { data: interactions, error: interactionsErr } = await interactionsQuery
    if (!interactionsErr && interactions) {
      const mismatchedOrderIds = new Set<string>()
      for (const row of interactions as any[]) {
        const notes = String(row?.notes || '').toLowerCase()
        const isMismatch =
          notes.includes('stock') ||
          notes.includes('out of stock') ||
          notes.includes('insufficient') ||
          notes.includes('not available')

        if (isMismatch) {
          const oid = String(row?.order_id || '')
          if (oid) mismatchedOrderIds.add(oid)
        }
      }
      mismatchRate = totalWindowOrders > 0 ? mismatchedOrderIds.size / totalWindowOrders : 0
    }
  } catch {
    mismatchRate = 0
  }

  const payload: OperationalKpis = {
    window_days: windowDays,
    orders_today: ordersToday,
    orders_per_day: totalWindowOrders / windowDays,
    average_order_value: averageOrderValue,
    fulfillment_time_hours: fulfillmentTimeHours,
    cancellation_rate: cancellationRate,
    stock_mismatch_rate: mismatchRate
  }

  return { success: true, kpis: payload, scoped_store_id: scopedStoreId }
})
