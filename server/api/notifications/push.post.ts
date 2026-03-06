import { defineEventHandler, readBody, createError } from 'h3'

type NotificationType = 'order_status' | 'promo' | 'delivery' | 'system'

interface PushNotificationRequest {
  userId: string
  title: string
  body: string
  type: NotificationType
  data?: Record<string, any>
}

interface PushNotificationResponse {
  success: boolean
  message: string
  notificationId?: string
}

export default defineEventHandler(async (event): Promise<PushNotificationResponse> => {
  try {
    // Verify API key for external services
    const apiKey = getHeader(event, 'x-api-key')
    const config = useRuntimeConfig()
    
    if (apiKey !== config.pushNotificationApiKey) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized - Invalid API key'
      })
    }

    const body = await readBody<PushNotificationRequest>(event)
    const { userId, title, body: messageBody, type, data } = body

    if (!userId || !title || !messageBody) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: userId, title, body'
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    
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

    // Check if user has push notifications enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_notifications_enabled')
      .eq('id', userId)
      .single()

    if (profile?.push_notifications_enabled === false) {
      return {
        success: false,
        message: 'User has disabled push notifications'
      }
    }

    // Store notification in database for in-app display
    const { data: notification, error } = await supabase
      .from('push_notifications')
      .insert({
        user_id: userId,
        title,
        body: messageBody,
        type,
        data: data || {},
        is_read: false,
        sent_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error storing notification:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to store notification'
      })
    }

    // TODO: Integrate with actual push notification service (Firebase, OneSignal, etc.)
    // This is a hook - the actual implementation would be added here
    // Example: await sendFirebaseNotification(userId, title, messageBody, data)

    return {
      success: true,
      message: 'Notification queued successfully',
      notificationId: notification?.id
    }
  } catch (err: any) {
    console.error('Error sending push notification:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to send notification'
    })
  }
})

function getHeader(event: any, name: string): string | undefined {
  const headers = event.node?.req?.headers || {}
  return headers[name.toLowerCase()] as string | undefined
}
