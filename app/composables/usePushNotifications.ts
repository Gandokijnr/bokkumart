import type { User } from '@supabase/supabase-js'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  message: string
  body?: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  orderId?: string
  type?: NotificationType
  requireInteraction?: boolean
  actions?: Array<{ action: string; title: string; icon?: string }>
}

export type NotificationType = 
  | 'order_placed'
  | 'payment_successful'
  | 'order_confirmed'
  | 'driver_assigned'
  | 'driver_picked_up'
  | 'driver_arrived'
  | 'order_delivered'
  | 'order_cancelled'
  | 'new_order'
  | 'branch_alert'
  | 'system_alert'

export type UserRole = 'customer' | 'staff' | 'branch_manager' | 'super_admin'

/**
 * Request notification permission and subscribe to push notifications
 */
export async function subscribeToPush(user: User & { role?: UserRole }): Promise<boolean> {
  if (!import.meta.client) {
    console.log('[Push] Not on client side')
    return false
  }

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.error('[Push] Service workers not supported')
    return false
  }

  // Check if push notifications are supported
  if (!('PushManager' in window)) {
    console.error('[Push] Push notifications not supported')
    return false
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission()
    console.log('[Push] Notification permission:', permission)

    if (permission !== 'granted') {
      console.log('[Push] Permission denied')
      return false
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready
    console.log('[Push] Service worker ready')

    // Get VAPID public key from runtime config
    const config = useRuntimeConfig()
    const vapidPublicKey = config.public.vapidPublicKey as string

    if (!vapidPublicKey) {
      console.error('[Push] VAPID public key not configured')
      return false
    }

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })

    console.log('[Push] Push subscription created:', subscription)

    // Get subscription data
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    }

    // Send subscription to server
    const { data: userData } = await useSupabaseClient().auth.getUser()
    const role = userData?.user?.app_metadata?.role || user.role || 'customer'

    await $fetch('/api/notifications/save-subscription', {
      method: 'POST',
      body: {
        userId: user.id,
        role,
        subscription: subscriptionData
      }
    })

    console.log('[Push] Subscription saved to server')
    return true
  } catch (error) {
    console.error('[Push] Error subscribing to push:', error)
    return false
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!import.meta.client) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe from push
      await subscription.unsubscribe()

      // Remove from server
      await $fetch('/api/notifications/delete-subscription', {
        method: 'POST',
        body: { endpoint: subscription.endpoint }
      })

      console.log('[Push] Unsubscribed successfully')
      return true
    }

    return false
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error)
    return false
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (!import.meta.client) return false

  return 'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!import.meta.client) return 'default'

  return Notification.permission
}

/**
 * Convert base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Composable for push notifications
 */
export function usePushNotifications() {
  const isSupported = ref(false)
  const permission = ref<NotificationPermission>('default')
  const isSubscribed = ref(false)
  const isLoading = ref(false)

  onMounted(() => {
    isSupported.value = isPushSupported()
    permission.value = getNotificationPermission()
    checkSubscription()
  })

  async function checkSubscription(): Promise<void> {
    if (!isSupported.value) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
    } catch (error) {
      console.error('[Push] Error checking subscription:', error)
      isSubscribed.value = false
    }
  }

  async function subscribe(user: User & { role?: UserRole }): Promise<boolean> {
    isLoading.value = true
    try {
      const result = await subscribeToPush(user)
      if (result) {
        isSubscribed.value = true
        permission.value = 'granted'
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function unsubscribe(): Promise<boolean> {
    isLoading.value = true
    try {
      const result = await unsubscribeFromPush()
      if (result) {
        isSubscribed.value = false
      }
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function requestPermission(): Promise<NotificationPermission> {
    if (!isSupported.value) return 'denied'
    permission.value = await Notification.requestPermission()
    return permission.value
  }

  return {
    isSupported: computed(() => isSupported.value),
    permission: computed(() => permission.value),
    isSubscribed: computed(() => isSubscribed.value),
    isLoading: computed(() => isLoading.value),
    subscribe,
    unsubscribe,
    requestPermission,
    checkSubscription
  }
}

export default usePushNotifications
