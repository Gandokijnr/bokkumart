import { defineEventHandler, readBody, createError } from 'h3'

interface BranchNotificationRequest {
  orderId: string
  type: 'order_confirmed' | 'order_ready' | 'order_dispatched' | 'order_delivered'
  customMessage?: string
}

interface BranchNotificationResponse {
  success: boolean
  customerNotified: boolean
  message: string
  branchInfo: {
    name: string
    address: string
  }
}

export default defineEventHandler(async (event): Promise<BranchNotificationResponse> => {
  try {
    const body = await readBody<BranchNotificationRequest>(event)
    const { orderId, type, customMessage } = body

    if (!orderId || !type) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: orderId, type'
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

    // Fetch order with store details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        store_id,
        status,
        delivery_method,
        confirmation_code,
        stores(name, address, phone)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw createError({
        statusCode: 404,
        message: 'Order not found'
      })
    }

    const storeData = (order as any).stores as { name: string; address: string; phone: string | null } | null
    const branchName = storeData?.name || 'Home Affairs'

    // Generate branch-specific message
    let message = customMessage
    if (!message) {
      switch (type) {
        case 'order_confirmed':
          message = `Your order from ${branchName} has been confirmed and is being prepared.`
          break
        case 'order_ready':
          if (order.delivery_method === 'pickup') {
            message = `Your order from ${branchName} is ready for pickup at ${storeData?.address}. Use code: ${order.confirmation_code}`
          } else {
            message = `Your order from ${branchName} is ready and will be dispatched soon.`
          }
          break
        case 'order_dispatched':
          if (order.delivery_method === 'delivery') {
            message = `Your order from ${branchName} has been dispatched and is on its way to you.`
          } else {
            message = `Your pickup order from ${branchName} is ready. Please collect at ${storeData?.address}`
          }
          break
        case 'order_delivered':
          if (order.delivery_method === 'pickup') {
            message = `Thank you for collecting your order from ${branchName}. Enjoy!`
          } else {
            message = `Your order from ${branchName} has been delivered. Thank you for choosing us!`
          }
          break
      }
    }

    // Store notification in database
    const { error: notificationError } = await supabase
      .from('push_notifications')
      .insert({
        user_id: order.user_id,
        title: getNotificationTitle(type, branchName),
        body: message,
        type: type,
        data: {
          order_id: orderId,
          branch_id: order.store_id,
          branch_name: branchName,
          delivery_method: order.delivery_method,
          confirmation_code: order.confirmation_code
        },
        is_read: false,
        sent_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error('Error storing notification:', notificationError)
    }

    // TODO: Integrate with actual push notification service (Firebase, etc.)
    // For now, we store in DB for in-app notifications

    return {
      success: true,
      customerNotified: true,
      message,
      branchInfo: {
        name: branchName,
        address: storeData?.address || ''
      }
    }
  } catch (err: any) {
    console.error('Error sending branch notification:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to send notification'
    })
  }
})

function getNotificationTitle(type: string, branchName: string): string {
  switch (type) {
    case 'order_confirmed':
      return `Order Confirmed - ${branchName}`
    case 'order_ready':
      return `Order Ready - ${branchName}`
    case 'order_dispatched':
      return `Order Dispatched - ${branchName}`
    case 'order_delivered':
      return `Order Complete - ${branchName}`
    default:
      return `Update from ${branchName}`
  }
}
