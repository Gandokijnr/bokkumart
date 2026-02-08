<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />
    
    <main class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div class="text-center">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="mt-6 text-2xl font-bold text-gray-900">Payment Successful!</h1>
        <p class="mt-2 text-gray-600">Thank you for your order. We've sent a confirmation to your email.</p>
      </div>

      <!-- QR Code for Pickup Orders -->
      <div v-if="isPickupOrder" class="mt-8 rounded-xl border-2 border-red-200 bg-red-50 p-6 text-center">
        <div class="mb-4">
          <p class="font-bold text-red-900">Show this QR code at pickup</p>
          <p class="text-sm text-red-700 mt-1">Our store attendant will scan this to verify your order</p>
        </div>
        
        <!-- QR Code Placeholder -->
        <div class="mx-auto h-48 w-48 rounded-xl bg-white p-4 shadow-md">
          <div class="h-full w-full rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
            <svg class="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p class="text-xs text-gray-400 mt-2">QR Code Placeholder</p>
            <p class="text-xs text-gray-400">vue-qrcode component</p>
          </div>
        </div>
        
        <p class="mt-4 text-sm font-medium text-gray-900">Order #{{ orderId }}</p>
      </div>

      <!-- In-Store Upsell Section (BOPIS) -->
      <div v-if="isPickupOrder" class="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
            <svg class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-bold text-amber-900">Forgot something?</p>
            <p class="text-sm text-amber-800 mt-1">
              Grab these items at the counter for <span class="font-bold text-red-600">10% off</span> when you pick up your order!
            </p>
            
            <!-- Upsell Items -->
            <div class="mt-3 grid grid-cols-3 gap-2">
              <div v-for="item in upsellItems" :key="item.id" class="rounded-lg bg-white p-2 text-center border border-amber-200">
                <div class="h-12 w-12 mx-auto rounded bg-gray-100 flex items-center justify-center">
                  <span class="text-xl">{{ item.emoji }}</span>
                </div>
                <p class="text-xs font-medium text-gray-900 mt-1 line-clamp-1">{{ item.name }}</p>
                <p class="text-xs text-gray-500">{{ formatPrice(item.price) }}</p>
                <p class="text-xs font-bold text-red-600">-{{ item.discount }}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 rounded-xl border-2 border-gray-200 bg-white p-6">
        <h2 class="font-bold text-gray-900">Order Details</h2>
        <div class="mt-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Order ID</span>
            <span class="font-medium">{{ orderId || 'Processing...' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Store</span>
            <span class="font-medium">{{ cartStore.currentStoreName }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Items</span>
            <span class="font-medium">{{ cartStore.cartCount }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Total Paid</span>
            <span class="font-bold text-red-600">{{ formatPrice(cartStore.cartTotal) }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <button 
          @click="navigateTo('/')"
          class="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white hover:bg-red-700"
        >
          Continue Shopping
        </button>
        <button 
          @click="navigateTo('/profile')"
          class="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          View My Orders
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/useCartStore'
import { navigateTo } from '#app'

const cartStore = useCartStore()
const route = useRoute()
const orderId = ref(route.query.order || '')

const isPickupOrder = ref(true) // Would be determined from order data

const upsellItems = ref([
  { id: 1, name: 'Milk 1L', price: 1200, discount: 10, emoji: '🥛' },
  { id: 2, name: 'Bread', price: 800, discount: 10, emoji: '🍞' },
  { id: 3, name: 'Eggs (12)', price: 1500, discount: 10, emoji: '🥚' }
])

function formatPrice(price: number): string {
  return '₦' + price.toLocaleString('en-NG')
}

onMounted(() => {
  if (orderId.value) {
    cartStore.clearCart()
  }
})
</script>
