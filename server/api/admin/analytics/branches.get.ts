import { defineEventHandler, createError } from 'h3'

interface BranchAnalytics {
  branch_id: string
  branch_name: string
  branch_code: string
  orders_today: number
  orders_this_week: number
  orders_this_month: number
  revenue_today: number
  revenue_this_week: number
  revenue_this_month: number
  avg_order_value: number
  delivery_orders: number
  pickup_orders: number
  top_products: Array<{
    product_id: string
    product_name: string
    quantity_sold: number
    revenue: number
  }>
}

interface MultiBranchAnalyticsResponse {
  branches: BranchAnalytics[]
  summary: {
    total_branches: number
    total_orders_today: number
    total_revenue_today: number
    total_orders_this_month: number
    total_revenue_this_month: number
    best_performing_branch: string | null
  }
  date_range: {
    today: string
    week_start: string
    month_start: string
  }
}

export default defineEventHandler(async (event): Promise<MultiBranchAnalyticsResponse> => {
  try {
    // Verify user is super_admin
    const user = event.context.user
    if (!user || user.role !== 'super_admin') {
      throw createError({
        statusCode: 403,
        message: 'Access denied. Super admin only.'
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const config = useRuntimeConfig()

    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceRoleKey as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all active branches
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('is_active', true)

    if (storesError) {
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch stores'
      })
    }

    // Calculate date ranges
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    const branches: BranchAnalytics[] = []
    let totalOrdersToday = 0
    let totalRevenueToday = 0
    let totalOrdersMonth = 0
    let totalRevenueMonth = 0
    let bestBranch = { id: '', revenue: 0 }

    // Fetch analytics for each branch
    for (const store of (stores || [])) {
      // Today's orders
      const { count: ordersToday } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .gte('created_at', today)
        .in('status', ['paid', 'confirmed', 'ready_for_pos', 'completed_in_pos', 'assigned', 'picked_up', 'arrived', 'delivered'])

      // Week's orders
      const { count: ordersWeek } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .gte('created_at', weekStart)
        .in('status', ['paid', 'confirmed', 'ready_for_pos', 'completed_in_pos', 'assigned', 'picked_up', 'arrived', 'delivered'])

      // Month's orders
      const { count: ordersMonth, data: monthOrders } = await supabase
        .from('orders')
        .select('total_amount, delivery_method')
        .eq('store_id', store.id)
        .gte('created_at', monthStart)
        .in('status', ['paid', 'confirmed', 'ready_for_pos', 'completed_in_pos', 'assigned', 'picked_up', 'arrived', 'delivered'])

      // Calculate revenue
      let revenueToday = 0
      let revenueWeek = 0
      let revenueMonth = 0
      let deliveryCount = 0
      let pickupCount = 0

      if (monthOrders) {
        revenueMonth = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        deliveryCount = monthOrders.filter(o => o.delivery_method === 'delivery').length
        pickupCount = monthOrders.filter(o => o.delivery_method === 'pickup').length
      }

      // Get top products for this branch
      const { data: topProducts } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, products(name)')
        .eq('orders.store_id', store.id)
        .gte('created_at', monthStart)
        .order('quantity', { ascending: false })
        .limit(5)

      const branchAnalytics: BranchAnalytics = {
        branch_id: store.id,
        branch_name: store.name,
        branch_code: store.code,
        orders_today: ordersToday || 0,
        orders_this_week: ordersWeek || 0,
        orders_this_month: ordersMonth?.length || 0,
        revenue_today: revenueToday,
        revenue_this_week: revenueWeek,
        revenue_this_month: revenueMonth,
        avg_order_value: ordersMonth?.length ? Math.round(revenueMonth / ordersMonth.length) : 0,
        delivery_orders: deliveryCount,
        pickup_orders: pickupCount,
        top_products: (topProducts || []).map(p => ({
          product_id: p.product_id,
          product_name: (p.products as any)?.name || 'Unknown',
          quantity_sold: p.quantity,
          revenue: p.quantity * p.unit_price
        }))
      }

      branches.push(branchAnalytics)

      // Update totals
      totalOrdersToday += ordersToday || 0
      totalRevenueToday += revenueToday
      totalOrdersMonth += ordersMonth?.length || 0
      totalRevenueMonth += revenueMonth

      // Track best performing branch
      if (revenueMonth > bestBranch.revenue) {
        bestBranch = { id: store.name, revenue: revenueMonth }
      }
    }

    return {
      branches,
      summary: {
        total_branches: branches.length,
        total_orders_today: totalOrdersToday,
        total_revenue_today: totalRevenueToday,
        total_orders_this_month: totalOrdersMonth,
        total_revenue_this_month: totalRevenueMonth,
        best_performing_branch: bestBranch.id || null
      },
      date_range: {
        today,
        week_start: weekStart,
        month_start: monthStart
      }
    }
  } catch (err: any) {
    console.error('Error fetching multi-branch analytics:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch analytics'
    })
  }
})
