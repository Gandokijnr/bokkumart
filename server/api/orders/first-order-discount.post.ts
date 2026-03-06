import { defineEventHandler, readBody, createError } from 'h3'

interface FirstOrderDiscountRequest {
  userId: string
  orderAmount: number
}

interface FirstOrderDiscountResponse {
  eligible: boolean
  discount?: number
  message?: string
}

export default defineEventHandler(async (event): Promise<FirstOrderDiscountResponse> => {
  try {
    const body = await readBody<FirstOrderDiscountRequest>(event)
    const { userId, orderAmount } = body

    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required field: userId'
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

    // Check if user has already used first order discount
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_order_discount_used')
      .eq('id', userId)
      .single()

    if (profile?.first_order_discount_used) {
      return {
        eligible: false,
        message: 'First order discount already used'
      }
    }

    // Check if user has any completed orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['paid', 'confirmed', 'ready_for_pos', 'completed_in_pos', 'assigned', 'picked_up', 'arrived', 'delivered'])
      .limit(1)

    if (ordersError) {
      console.error('Error checking orders:', ordersError)
    }

    if (orders && orders.length > 0) {
      return {
        eligible: false,
        message: 'First order discount only available for new customers'
      }
    }

    // Get first order discount config from settings
    const discountPercent = 20 // Default 20% off
    const maxDiscount = 5000 // Max ₦5,000 discount

    const discount = Math.min(
      (orderAmount || 0) * (discountPercent / 100),
      maxDiscount
    )

    return {
      eligible: true,
      discount: Math.round(discount),
      message: `${discountPercent}% off your first order (max ₦${maxDiscount.toLocaleString()})`
    }
  } catch (err: any) {
    console.error('Error checking first order discount:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to check first order discount'
    })
  }
})
