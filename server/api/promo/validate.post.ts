import { defineEventHandler, readBody, createError } from 'h3'

interface ValidatePromoRequest {
  code: string
  userId: string
  orderAmount: number
}

interface ValidatePromoResponse {
  valid: boolean
  discount?: number
  message?: string
  promoCode?: {
    id: string
    code: string
    discountType: 'percentage' | 'fixed_amount'
    discountValue: number
  }
}

export default defineEventHandler(async (event): Promise<ValidatePromoResponse> => {
  try {
    const body = await readBody<ValidatePromoRequest>(event)
    const { code, userId, orderAmount } = body

    if (!code || !userId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: code, userId'
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

    // Check if user has already used this promo code
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('metadata->>promo_code', code.toUpperCase())
      .limit(1)
      .single()

    if (existingOrder) {
      return {
        valid: false,
        message: 'You have already used this promo code'
      }
    }

    // Fetch promo code
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !promoCode) {
      return {
        valid: false,
        message: 'Invalid promo code'
      }
    }

    // Check validity dates
    const now = new Date().toISOString()
    if (promoCode.valid_from && now < promoCode.valid_from) {
      return {
        valid: false,
        message: 'This promo code is not yet active'
      }
    }

    if (promoCode.valid_until && now > promoCode.valid_until) {
      return {
        valid: false,
        message: 'This promo code has expired'
      }
    }

    // Check usage limit
    if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
      return {
        valid: false,
        message: 'This promo code has reached its usage limit'
      }
    }

    // Check minimum order amount
    if (promoCode.min_order_amount && orderAmount < promoCode.min_order_amount) {
      return {
        valid: false,
        message: `Minimum order amount of ₦${promoCode.min_order_amount} required`
      }
    }

    // Calculate discount
    let discount = 0
    if (promoCode.discount_type === 'percentage') {
      discount = orderAmount * (promoCode.discount_value / 100)
      if (promoCode.max_discount) {
        discount = Math.min(discount, promoCode.max_discount)
      }
    } else {
      discount = promoCode.discount_value
    }

    discount = Math.min(discount, orderAmount)

    return {
      valid: true,
      discount: Math.round(discount),
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discount_type,
        discountValue: promoCode.discount_value
      }
    }
  } catch (err: any) {
    console.error('Error validating promo code:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to validate promo code'
    })
  }
})
