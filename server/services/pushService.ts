import webpush from 'web-push'

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushPayload {
  title: string
  message: string
  body?: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  orderId?: string
  type?: string
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string; icon?: string }>
}

let vapidConfigured = false

/**
 * Initialize web-push with VAPID keys
 */
export function initPushService(): void {
  if (vapidConfigured) return

  const config = useRuntimeConfig()
  const publicKey = config.vapidPublicKey as string
  const privateKey = config.vapidPrivateKey as string
  const subject = (config.vapidSubject as string) || 'mailto:admin@homeaffairs.com'

  if (!publicKey || !privateKey) {
    console.error('[PushService] VAPID keys not configured')
    throw new Error('VAPID keys not configured')
  }

  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  )

  vapidConfigured = true
  console.log('[PushService] VAPID configured successfully')
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    initPushService()

    const pushPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      body: payload.body || payload.message,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-64x64.png',
      tag: payload.tag || 'default',
      url: payload.url || '/',
      orderId: payload.orderId,
      type: payload.type,
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || []
    })

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      },
      pushPayload
    )

    return { success: true }
  } catch (error: any) {
    console.error('[PushService] Error sending notification:', error)

    // Handle expired or invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      return {
        success: false,
        error: 'subscription_expired'
      }
    }

    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Send notifications to multiple subscriptions
 */
export async function sendBulkPushNotifications(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<{
  sent: number
  failed: number
  expired: number
  errors: string[]
}> {
  const results = {
    sent: 0,
    failed: 0,
    expired: 0,
    errors: [] as string[]
  }

  // Send in batches of 100 to avoid overwhelming the server
  const batchSize = 100
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (sub) => {
        const result = await sendPushNotification(sub, payload)
        return { subscription: sub, result }
      })
    )

    for (const { result } of batchResults) {
      if (result.success) {
        results.sent++
      } else if (result.error === 'subscription_expired') {
        results.expired++
      } else {
        results.failed++
        if (result.error) results.errors.push(result.error)
      }
    }
  }

  return results
}

/**
 * Generate VAPID keys for new installations
 */
export function generateVAPIDKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys()
}
