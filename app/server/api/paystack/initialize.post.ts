import { defineEventHandler, readBody, createError } from 'h3'

interface PaystackInitializeRequest {
  email: string
  amount: number // in kobo (Naira * 100)
  metadata: {
    order_id?: string
    user_id: string
    store_id: string
    items: Array<{
      product_id: string
      name: string
      quantity: number
      price: number
    }>
    delivery_method: 'pickup' | 'delivery'
    delivery_details?: {
      area?: string
      street?: string
      houseNumber?: string
      landmark?: string
      contactPhone: string
    }
    store_address?: string
    subtotal: number
    delivery_fee: number
  }
  callback_url?: string
}

interface PaystackResponse {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const body = await readBody<PaystackInitializeRequest>(event)

    // Validate required fields
    if (!body.email || !body.amount || !body.metadata) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: email, amount, metadata'
      })
    }

    // Validate amount (minimum 100 kobo = ₦1)
    if (body.amount < 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Amount must be at least 100 kobo (₦1)'
      })
    }

    const paystackSecret = config.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Paystack secret key not configured'
      })
    }

    // Build callback URL
    const siteUrl = config.public.siteUrl || 'http://localhost:3000'
    const callbackUrl = body.callback_url || `${siteUrl}/checkout/verify`

    // Prepare Paystack payload
    const payload = {
      email: body.email,
      amount: body.amount,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata: {
        ...body.metadata,
        custom_fields: [
          {
            display_name: 'Store',
            variable_name: 'store_name',
            value: body.metadata.store_id
          },
          {
            display_name: 'Delivery Method',
            variable_name: 'delivery_method',
            value: body.metadata.delivery_method
          }
        ]
      }
    }

    // Call Paystack API
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result: PaystackResponse = await response.json()

    if (!response.ok || !result.status) {
      console.error('Paystack initialize error:', result)
      throw createError({
        statusCode: 400,
        statusMessage: result.message || 'Failed to initialize payment'
      })
    }

    // Return authorization URL for redirect
    return {
      success: true,
      authorization_url: result.data?.authorization_url,
      reference: result.data?.reference,
      access_code: result.data?.access_code
    }

  } catch (error: any) {
    console.error('Paystack initialize error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
