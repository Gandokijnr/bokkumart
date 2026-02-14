<template>
  <div class="min-h-screen bg-gray-100">
    <AppHeader />
    
    <main class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12" role="status" aria-live="polite">
        <div 
          class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-red-200 border-t-red-600"
          aria-label="Loading order details"
        />
        <p class="mt-4 text-gray-600">Loading order details...</p>
      </div>

      <!-- Order Not Found -->
      <div v-else-if="!order" class="text-center py-12">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-gray-900">Order Not Found</h1>
        <p class="mt-2 text-gray-600">We couldn't find the order you're looking for.</p>
        <button 
          @click="navigateTo('/')"
          class="mt-6 rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Continue Shopping
        </button>
      </div>

      <!-- Awaiting Verification State -->
      <div v-else-if="order.status === 'awaiting_call'" class="space-y-6">
        <!-- Status Card -->
        <div class="rounded-2xl bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <svg class="h-10 w-10 animate-pulse text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
          
          <h1 class="text-center text-xl font-bold text-gray-900">Order Received!</h1>
          
          <!-- Working Hours Message -->
          <p v-if="isWithinWorkingHours" class="mt-3 text-center text-gray-600">
            A HomeAffairs representative will call you at 
            <span class="font-bold text-gray-900">{{ order.contact_phone }}</span> 
            within <span class="font-bold text-amber-600">5–10 minutes</span> to verify your items.
          </p>
          <p v-else class="mt-3 text-center text-gray-600">
            We've received your order! Our office is currently closed. We will call you 
            <span class="font-bold text-amber-600">first thing tomorrow morning</span> at 
            <span class="font-bold text-gray-900">{{ order.contact_phone }}</span> to confirm.
          </p>

          <!-- Order Summary -->
          <div class="mt-6 rounded-xl border-2 border-gray-100 bg-gray-50 p-4">
            <h3 class="mb-3 font-bold text-gray-900">Order Summary</h3>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-600">Order #</dt>
                <dd class="font-medium">{{ truncateOrderId(order.id) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Total Amount</dt>
                <dd class="font-bold">{{ formatPrice(order.total_amount) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Items</dt>
                <dd class="font-medium">{{ itemCount }} item{{ itemCount !== 1 ? 's' : '' }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Delivery Method</dt>
                <dd class="font-medium capitalize">{{ order.delivery_method }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Real-time Status -->
        <div class="rounded-xl bg-blue-50 p-4 text-center" role="status" aria-live="polite">
          <div class="flex items-center justify-center gap-2 text-sm text-blue-800">
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Waiting for verification call...</span>
          </div>
          <p class="mt-1 text-xs text-blue-600">This page updates automatically</p>
        </div>

        <!-- Call Failed Message -->
        <div v-if="order.call_attempt_count > 0" class="rounded-xl border-2 border-red-200 bg-red-50 p-4" role="alert">
          <div class="flex items-start gap-3">
            <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="font-bold text-red-900">We tried calling but couldn't reach you</p>
              <p class="mt-1 text-sm text-red-700">
                Attempt #{{ order.call_attempt_count }} was made at {{ formatTime(order.last_call_attempt_at) }}.
                Please check your signal or call us at 
                <a 
                  href="tel:+23412345678" 
                  class="font-bold underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  +234 1 234 5678
                </a>.
              </p>
            </div>
          </div>
        </div>

        <!-- Help Section -->
        <div class="rounded-xl bg-white p-4 shadow-sm">
          <h3 class="mb-3 font-bold text-gray-900">Need Help?</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <a 
              href="tel:+23412345678"
              class="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call Us Now
            </a>
            <button 
              @click="showCancelModal = true"
              type="button"
              class="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Order
            </button>
          </div>
        </div>
      </div>

      <!-- Confirmed State -->
      <div v-else-if="isConfirmedStatus" class="space-y-6">
        <div class="rounded-2xl bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h1 class="text-center text-xl font-bold text-gray-900">Order Verified!</h1>
          <p class="mt-3 text-center text-gray-600">
            Your order has been verified and is now being prepared for {{ order.delivery_method === 'pickup' ? 'pickup' : 'delivery' }}.
          </p>

          <!-- Packaging Status -->
          <div class="mt-6 rounded-xl border-2 border-green-200 bg-green-50 p-4">
            <div class="flex items-center gap-3">
              <svg class="h-6 w-6 animate-bounce text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <div>
                <p class="font-bold text-green-900">Packaging in Progress</p>
                <p class="text-sm text-green-700">We're carefully packing your items</p>
              </div>
            </div>
          </div>

          <button 
            @click="navigateTo('/profile')"
            class="mt-6 w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            View Order Details
          </button>
        </div>
      </div>

      <!-- Cancelled State -->
      <div v-else-if="order.status === 'cancelled'" class="space-y-6">
        <div class="rounded-2xl bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          
          <h1 class="text-center text-xl font-bold text-gray-900">Order Cancelled</h1>
          <p class="mt-3 text-center text-gray-600">
            {{ order.rejection_reason || 'This order has been cancelled.' }}
          </p>

          <button 
            @click="navigateTo('/')"
            class="mt-6 w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>

      <!-- Other Statuses Fallback (pending, delivered, etc.) -->
      <div v-else class="space-y-6">
        <div class="rounded-2xl bg-white p-6 shadow-sm">
          <div class="mb-4 flex items-center justify-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <svg class="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          
          <h1 class="text-center text-xl font-bold text-gray-900">Order {{ order.status.replace('_', ' ') }}</h1>
          <p class="mt-3 text-center text-gray-600">
            Your order is currently <span class="font-bold">{{ order.status.replace('_', ' ') }}</span>.
          </p>

          <!-- Order Summary -->
          <div class="mt-6 rounded-xl border-2 border-gray-100 bg-gray-50 p-4">
            <h3 class="mb-3 font-bold text-gray-900">Order Summary</h3>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-600">Order #</dt>
                <dd class="font-medium">{{ truncateOrderId(order.id) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Total Amount</dt>
                <dd class="font-bold">{{ formatPrice(order.total_amount) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Items</dt>
                <dd class="font-medium">{{ itemCount }} item{{ itemCount !== 1 ? 's' : '' }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600">Delivery Method</dt>
                <dd class="font-medium capitalize">{{ order.delivery_method }}</dd>
              </div>
            </dl>
          </div>

          <button 
            @click="navigateTo('/profile')"
            class="mt-6 w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    </main>

    <!-- Cancel Order Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="showCancelModal" 
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="showCancelModal = false"
        >
          <div 
            class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="cancel-modal-title"
            aria-describedby="cancel-modal-description"
          >
            <h3 id="cancel-modal-title" class="text-lg font-bold text-gray-900">Cancel Order?</h3>
            <p id="cancel-modal-description" class="mt-2 text-sm text-gray-600">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div class="mt-6 flex gap-3">
              <button 
                @click="showCancelModal = false"
                type="button"
                class="flex-1 rounded-xl border-2 border-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Keep Order
              </button>
              <button 
                @click="handleCancelOrder"
                :disabled="cancelling"
                type="button"
                class="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                {{ cancelling ? 'Cancelling...' : 'Yes, Cancel' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Database } from '~/types/database.types'

// Types
interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
}

interface Order {
  id: string
  status: 'awaiting_call' | 'confirmed' | 'packing' | 'ready' | 'cancelled'
  confirmation_status: string
  contact_phone: string
  total_amount: number
  delivery_method: 'pickup' | 'delivery'
  call_attempt_count: number
  last_call_attempt_at: string | null
  rejection_reason: string | null
  items?: OrderItem[]
}

// Composables
const route = useRoute()
const supabase = useSupabaseClient<Database>()

type RealtimeChannel = ReturnType<typeof supabase.channel>

// State
const loading = ref(true)
const order = ref<Order | null>(null)
const showCancelModal = ref(false)
const cancelling = ref(false)
const subscription = ref<RealtimeChannel | null>(null)

// Computed Properties
const itemCount = computed(() => {
  return Array.isArray(order.value?.items) ? order.value.items.length : 0
})

const isWithinWorkingHours = computed(() => {
  const now = new Date()
  const lagosTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }))
  const hour = lagosTime.getHours()
  const day = lagosTime.getDay()
  
  // Monday-Saturday (1-6), 8 AM - 8 PM
  return day !== 0 && hour >= 8 && hour < 20
})

const isConfirmedStatus = computed(() => {
  return ['confirmed', 'packing', 'ready'].includes(order.value?.status ?? '')
})

// Utility Functions
function formatPrice(price: number): string {
  if (typeof price !== 'number' || isNaN(price)) {
    return '₦0'
  }
  return '₦' + price.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ''
    
    return date.toLocaleTimeString('en-NG', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Africa/Lagos'
    })
  } catch {
    return ''
  }
}

function truncateOrderId(orderId: string): string {
  return orderId?.slice(-8) || ''
}

// Real-time Subscription
function setupRealtimeListener(orderId: string) {
  subscription.value = supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      handleOrderUpdate
    )
    .subscribe()
}

function handleOrderUpdate(payload: any) {
  const newOrder = payload.new as Order
  const oldOrder = payload.old as Order
  
  // Update order data
  order.value = newOrder
  
  // Check if status changed from awaiting_call to confirmed
  if (oldOrder?.status === 'awaiting_call' && newOrder.status === 'confirmed') {
    sendNotification('Order Verified!', 'Your HomeAffairs order has been confirmed and is being prepared.')
  }
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/badge.png'
      })
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }
}

// Order Management
async function loadOrder() {
  const orderId = route.params.id as string
  
  if (!orderId) {
    loading.value = false
    return
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) throw error
    
    order.value = data as Order
    
    // Setup real-time listener
    setupRealtimeListener(orderId)
  } catch (error) {
    console.error('Error loading order:', error)
    order.value = null
  } finally {
    loading.value = false
  }
}

async function handleCancelOrder() {
  if (!order.value) return
  
  cancelling.value = true
  
  try {
    const { error } = await (supabase.from('orders').update as any)({
      status: 'cancelled',
      confirmation_status: 'cancelled_by_customer',
      updated_at: new Date().toISOString()
    }).eq('id', order.value.id)

    if (error) throw error
    
    order.value.status = 'cancelled'
    showCancelModal.value = false
  } catch (error) {
    console.error('Error cancelling order:', error)
    alert('Failed to cancel order. Please try again.')
  } finally {
    cancelling.value = false
  }
}

function cleanupSubscription() {
  if (subscription.value) {
    subscription.value.unsubscribe()
    subscription.value = null
  }
}

async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

// Lifecycle Hooks
onMounted(() => {
  loadOrder()
  requestNotificationPermission()
})

onUnmounted(() => {
  cleanupSubscription()
})
</script>