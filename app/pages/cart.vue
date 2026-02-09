<template>
  <div class="min-h-screen bg-gray-50 overflow-x-hidden">
    <AppHeader />

    <main class="mx-auto max-w-7xl px-4 py-4 pb-32 sm:px-6 lg:py-8 lg:pb-8">
      <!-- Page Title -->
      <div class="mb-4 flex items-center justify-between sm:mb-6">
        <h1 class="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">
          Shopping Cart
          <span v-if="cartStore.cartCount > 0" class="ml-2 text-base font-medium text-gray-500 sm:text-lg">
            ({{ cartStore.cartCount }} {{ cartStore.cartCount === 1 ? 'item' : 'items' }})
          </span>
        </h1>
        <button
          v-if="cartStore.items.length > 0"
          @click="showClearConfirm = true"
          class="text-xs font-medium text-red-500 hover:text-red-700 sm:text-sm"
        >
          Clear Cart
        </button>
      </div>

      <!-- Empty Cart State -->
      <div v-if="cartStore.items.length === 0" class="flex flex-col items-center justify-center py-12 sm:py-16">
        <div class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 sm:mb-6 sm:h-32 sm:w-32">
          <svg class="h-12 w-12 text-gray-400 sm:h-16 sm:w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 class="mb-2 text-lg font-bold text-gray-900 sm:text-xl">Your cart is empty</h2>
        <p class="mb-6 max-w-md px-4 text-center text-sm text-gray-500 sm:mb-8 sm:text-base">
          Looks like you haven't added anything to your cart yet. Explore our categories and find something you'll love.
        </p>
        <button
          @click="navigateTo('/#categories')"
          class="mb-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl sm:mb-12 sm:px-8 sm:py-3.5"
          style="background-color: #DC2626;"
        >
          <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Start Shopping
        </button>

        <!-- Top Categories Suggestions (Dynamic) -->
        <div v-if="categories.length > 0" class="w-full max-w-4xl px-2">
          <h3 class="mb-3 text-center text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">Popular Categories</h3>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            <button
              v-for="category in categories.slice(0, 8)"
              :key="category.id"
              @click="navigateTo(`/category/${category.slug}`)"
              class="group flex flex-col items-center rounded-xl border-2 border-gray-200 bg-white p-3 transition-all hover:border-red-600 hover:shadow-md sm:p-4"
            >
              <div class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-red-50 sm:mb-3 sm:h-14 sm:w-14">
                <span class="text-2xl sm:text-3xl">{{ getCategoryIcon(category) }}</span>
              </div>
              <span class="text-center text-xs font-medium text-gray-700 group-hover:text-red-600 sm:text-sm">{{ category.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Cart Content -->
      <div v-else class="grid gap-4 sm:gap-6 lg:grid-cols-[1fr,360px] xl:grid-cols-[1fr,400px] lg:items-start">
        <!-- Left Column: Items -->
        <div class="space-y-3 order-2 sm:space-y-4 lg:order-1">
          <!-- Store Context Header -->
          <div class="flex items-center gap-3 overflow-hidden rounded-xl border-2 p-3 sm:gap-4 sm:p-4" style="border-color: #DC262630; background-color: #DC262608;">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white sm:h-12 sm:w-12" style="background-color: #DC2626;">
              <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-gray-900 sm:text-base">Shopping from: {{ cartStore.currentStoreName || 'HomeAffairs Store' }}</p>
              <p class="truncate text-xs text-gray-600 sm:text-sm">All items reserved for 10 minutes</p>
            </div>
            <div v-if="reservationTimeRemaining > 0" class="flex-shrink-0">
              <span
                class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium sm:px-3"
                style="background-color: #DC262630; color: #991b1b;"
              >
                <svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="whitespace-nowrap">{{ formatTime(reservationTimeRemaining) }}</span>
              </span>
            </div>
          </div>

          <!-- Cart Items List -->
          <div class="space-y-3 sm:space-y-4">
            <div
              v-for="item in cartStore.items"
              :key="item.id"
              class="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
              :class="{ 'opacity-60': item.quantity > item.max_quantity }"
            >
              <!-- Stock Warning Badge -->
              <div
                v-if="item.quantity > item.max_quantity"
                class="absolute -top-2 left-3 z-10 max-w-[calc(100%-24px)] rounded-full px-2 py-1 text-xs font-bold text-white shadow-md sm:left-4 sm:px-3"
                style="background-color: #dc2626;"
              >
                <span class="truncate">Only {{ item.max_quantity }} in stock</span>
              </div>

              <div class="flex gap-3 sm:gap-4">
                <!-- Product Image -->
                <div class="relative flex-shrink-0">
                  <img
                    :src="item.image_url || '/placeholder-product.png'"
                    :alt="item.name"
                    class="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24"
                    loading="lazy"
                  />
                  <div
                    v-if="item.quantity > item.max_quantity"
                    class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50"
                  >
                    <span class="text-xs font-bold text-white">Out of Stock</span>
                  </div>
                </div>

                <!-- Product Details -->
                <div class="flex min-w-0 flex-1 flex-col justify-between pr-10 sm:pr-0">
                  <div class="min-w-0">
                    <h3 class="line-clamp-2 text-sm font-semibold text-gray-900 sm:text-base">{{ item.name }}</h3>
                    <p class="mt-1 text-xs text-gray-500 sm:text-sm">{{ formatPrice(item.price) }} per unit</p>
                  </div>

                  <div class="mt-3 flex items-center justify-between gap-2 sm:mt-4">
                    <!-- Quantity Controls - Mobile Optimized (48x48px touch targets) -->
                    <div class="flex flex-shrink-0 items-center rounded-lg border-2 border-gray-200">
                      <button
                        @click="updateQuantity(item.id, item.quantity - 1)"
                        class="flex h-10 w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
                        :disabled="item.quantity <= 1"
                        aria-label="Decrease quantity"
                      >
                        <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                        </svg>
                      </button>
                      <span class="flex h-10 w-10 items-center justify-center text-sm font-semibold text-gray-900 sm:h-11 sm:w-11 sm:text-base">
                        {{ item.quantity }}
                      </span>
                      <button
                        @click="updateQuantity(item.id, item.quantity + 1)"
                        class="flex h-10 w-10 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
                        :disabled="item.quantity >= item.max_quantity"
                        aria-label="Increase quantity"
                      >
                        <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    <!-- Item Total -->
                    <p class="truncate text-sm font-bold text-gray-900 sm:text-base lg:text-lg">
                      {{ formatPrice(item.price * item.quantity) }}
                    </p>
                  </div>
                </div>

                <!-- Delete Button - Absolute positioned on mobile -->
                <button
                  @click="removeItem(item.id)"
                  class="absolute right-3 top-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:static sm:h-10 sm:w-10"
                  aria-label="Remove item"
                >
                  <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Continue Shopping Link -->
          <button
            @click="navigateTo('/#categories')"
            class="flex items-center gap-2 text-sm font-medium transition-colors hover:text-red-600 sm:text-base"
            style="color: #DC2626;"
          >
            <svg class="h-4 w-4 rotate-180 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            Continue Shopping
          </button>

          <!-- Cross-Sell Section -->
          <div v-if="crossSellProducts.length > 0" class="mt-6 overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-4 sm:mt-8 sm:p-5">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 sm:mb-4 sm:text-base">
              <svg class="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" style="color: #DC2626;" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              You might also need
            </h3>
            <div class="scrollbar-hide -mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
              <div class="flex gap-3 pb-2 sm:gap-4">
                <div
                  v-for="product in crossSellProducts"
                  :key="product.id"
                  class="flex w-32 flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-white p-2.5 transition-shadow hover:shadow-md sm:w-36 sm:p-3"
                >
                  <img
                    :src="product.image_url || '/placeholder-product.png'"
                    :alt="product.name"
                    class="mb-2 h-20 w-full rounded-lg object-cover sm:h-24"
                  />
                  <h4 class="mb-1 line-clamp-2 text-xs font-medium text-gray-900">{{ product.name }}</h4>
                  <p class="mb-2 text-xs font-semibold sm:text-sm" style="color: #DC2626;">{{ formatPrice(product.price) }}</p>
                  <button
                    @click="addCrossSellItem(product)"
                    class="mt-auto rounded-lg py-1.5 text-xs font-bold text-white transition-colors active:scale-95 sm:py-2"
                    style="background-color: #DC2626;"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Order Summary (Sticky on Desktop) -->
        <div class="lg:sticky lg:top-4 order-1 lg:order-2">
          <div class="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 class="mb-4 text-base font-bold text-gray-900 sm:mb-5 sm:text-lg">Order Summary</h2>

            <!-- Summary Breakdown -->
            <div class="space-y-2.5 sm:space-y-3">
              <div class="flex justify-between text-xs sm:text-sm">
                <span class="text-gray-600">Subtotal ({{ cartStore.cartCount }} items)</span>
                <span class="font-medium text-gray-900">{{ formatPrice(cartStore.cartSubtotal) }}</span>
              </div>

              <!-- Delivery Fee -->
              <div class="flex justify-between text-xs sm:text-sm">
                <span class="text-gray-600">Delivery Fee</span>
                <span v-if="deliveryCalculated" class="font-medium text-gray-900">{{ formatPrice(cartStore.deliveryFee) }}</span>
                <button
                  v-else
                  @click="calculateDelivery"
                  class="rounded-md px-2 py-1 text-xs font-medium text-white"
                  style="background-color: #DC2626;"
                >
                  Calculate
                </button>
              </div>

              <!-- Service Fee -->
              <div class="flex justify-between text-xs sm:text-sm">
                <span class="text-gray-600">Service Fee (2.5%)</span>
                <span class="font-medium text-gray-900">{{ formatPrice(serviceFee) }}</span>
              </div>

              <div class="border-t-2 border-gray-100 pt-2.5 sm:pt-3">
                <div class="flex justify-between">
                  <span class="text-sm font-bold text-gray-900 sm:text-base">Total</span>
                  <span class="text-lg font-bold sm:text-xl" style="color: #DC2626;">{{ formatPrice(totalWithService) }}</span>
                </div>
                <p class="mt-1 text-right text-xs text-gray-500">Includes VAT where applicable</p>
              </div>
            </div>

            <!-- Delivery Location Preview -->
            <div
              v-if="cartStore.deliveryDetails?.method"
              class="mt-4 rounded-lg border p-2.5 text-xs sm:mt-5 sm:p-3 sm:text-sm"
              style="border-color: #DC262630; background-color: #DC262608;"
            >
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 flex-shrink-0" style="color: #DC2626;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-gray-900">
                    {{ cartStore.deliveryDetails.method === 'pickup' ? 'Store Pickup' : 'Home Delivery' }}
                  </p>
                  <p class="truncate text-gray-600">
                    {{ cartStore.deliveryDetails.method === 'pickup'
                      ? cartStore.currentStoreName
                      : cartStore.deliveryDetails.address?.area || 'Area not set'
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Order Note -->
            <div class="mt-4 sm:mt-5">
              <label class="mb-2 block text-xs font-medium text-gray-700 sm:text-sm">
                Specific Instructions
                <span class="text-gray-400">(Optional)</span>
              </label>
              <textarea
                v-model="orderNote"
                rows="3"
                placeholder="e.g., Please pick firm tomatoes, Call upon arrival..."
                class="w-full resize-none rounded-lg border-2 border-gray-200 p-2.5 text-xs focus:border-red-600 focus:outline-none sm:p-3 sm:text-sm"
              ></textarea>
            </div>

            <!-- Stock Validation Warning -->
            <div
              v-if="hasOutOfStockItems"
              class="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 sm:mt-4 sm:p-3 sm:text-sm"
            >
              <svg class="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Some items are out of stock. Please adjust quantities to proceed.</span>
            </div>

            <!-- Checkout Button -->
            <button
              @click="proceedToCheckout"
              :disabled="hasOutOfStockItems || cartStore.items.length === 0"
              class="mt-4 w-full rounded-xl py-3 text-sm font-bold shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:mt-5 sm:py-4"
              style="background-color: #DC2626; color: #fff;"
            >
              <span v-if="hasOutOfStockItems">Update Cart to Continue</span>
              <span v-else>Proceed to Checkout</span>
            </button>

            <!-- Trust Badges -->
            <div class="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500 sm:mt-4 sm:gap-4">
              <span class="flex items-center gap-1">
                <svg class="h-3.5 w-3.5 text-green-500 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Secure Payment
              </span>
              <span class="flex items-center gap-1">
                <svg class="h-3.5 w-3.5 text-green-500 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                10min Reservation
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Mobile Sticky Checkout Bar -->
    <div
      v-if="cartStore.items.length > 0"
      class="fixed bottom-0 left-0 right-0 border-t-2 border-gray-200 bg-white p-3 shadow-lg lg:hidden sm:p-4"
      style="padding-bottom: max(12px, env(safe-area-inset-bottom));"
    >
      <div class="mb-2.5 flex items-center justify-between sm:mb-3">
        <span class="text-xs text-gray-600 sm:text-sm">Total</span>
        <span class="text-lg font-bold sm:text-xl" style="color: #DC2626;">{{ formatPrice(totalWithService) }}</span>
      </div>
      <button
        @click="proceedToCheckout"
        :disabled="hasOutOfStockItems"
        class="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-50 sm:py-3.5"
        style="background-color: #DC2626; color: #fff;"
      >
        {{ hasOutOfStockItems ? 'Update Cart' : 'Proceed to Checkout' }}
      </button>
    </div>

    <!-- Clear Cart Confirmation Modal -->
    <div
      v-if="showClearConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="showClearConfirm = false"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 sm:mb-4">
          <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 class="mb-2 text-base font-bold text-gray-900 sm:text-lg">Clear your cart?</h3>
        <p class="mb-5 text-xs text-gray-600 sm:mb-6 sm:text-sm">This will remove all items from your cart. This action cannot be undone.</p>
        <div class="flex gap-2.5 sm:gap-3">
          <button
            @click="showClearConfirm = false"
            class="flex-1 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 sm:py-3"
          >
            Cancel
          </button>
          <button
            @click="clearCart"
            class="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 sm:py-3"
          >
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/useCartStore'
import { useCategories } from '~/composables/useCategories'
import { useProducts } from '~/composables/useProducts'
import { computed, ref, onMounted, onUnmounted } from 'vue'

// SEO Meta
definePageMeta({
  pageTransition: {
    name: 'slide-left',
    mode: 'out-in'
  }
})

useSeoMeta({
  title: 'Shopping Cart - HomeAffairs',
  description: 'Review your cart items and proceed to checkout. Fresh groceries delivered to your doorstep in Lagos.',
  ogTitle: 'Shopping Cart - HomeAffairs',
  ogDescription: 'Review your cart items and proceed to checkout. Fresh groceries delivered to your doorstep in Lagos.'
})

const cartStore = useCartStore()
const { categories, fetchCategories, getCategoryIcon } = useCategories()
const { products: allProducts, fetchProducts } = useProducts()

const orderNote = ref('')
const deliveryCalculated = ref(false)
const showClearConfirm = ref(false)
const reservationTimeRemaining = ref(0)
let reservationTimer: ReturnType<typeof setInterval> | null = null

// Dynamic cross-sell products (fetched from database)
const crossSellProducts = ref<Array<{
  id: string
  product_id: string
  name: string
  price: number
  image_url?: string
  category?: string
}>>([])

// Computed values
const serviceFee = computed(() => Math.round(cartStore.cartSubtotal * 0.025))
const totalWithService = computed(() => cartStore.cartSubtotal + cartStore.deliveryFee + serviceFee.value)

const hasOutOfStockItems = computed(() => {
  return cartStore.items.some(item => item.quantity > item.max_quantity)
})

// Methods
function formatPrice(price: number): string {
  return '₦' + price.toLocaleString('en-NG')
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function updateQuantity(itemId: string, quantity: number) {
  const result = cartStore.updateQuantity(itemId, quantity)
  if (!result.success) {
    alert(result.error)
  }
}

function removeItem(itemId: string) {
  cartStore.removeItem(itemId)
}

function clearCart() {
  cartStore.clearCart()
  showClearConfirm.value = false
}

function calculateDelivery() {
  deliveryCalculated.value = true
}

// Fetch dynamic cross-sell products based on cart contents
async function loadCrossSellProducts() {
  const supabase = useSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, price, image_url, category_id')
    .eq('is_active', true)
    .limit(8)
  
  if (data) {
    // Filter out products already in cart, prioritize different categories
    const cartProductIds = new Set(cartStore.items.map(i => i.product_id))
    crossSellProducts.value = data
      .filter((p: any) => !cartProductIds.has(p.id))
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id,
        product_id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        category: p.category_id
      }))
  }
}

function addCrossSellItem(product: typeof crossSellProducts.value[0]) {
  // Need to get full product details including store info
  const supabase = useSupabaseClient()
  supabase
    .from('products')
    .select('*, store_inventory(*)')
    .eq('id', product.id)
    .single()
    .then(async ({ data }) => {
      const productData = data as {
        id: string
        name: string
        price: number
        image_url: string | null
        store_inventory: Array<{
          store_id: string
          store_price: number | null
          available_stock: number
          digital_buffer: number
        }>
      } | null
      if (productData && productData.store_inventory && productData.store_inventory.length > 0) {
        const storeInfo = productData.store_inventory[0]!
        const result = await cartStore.addItem({
          id: productData.id,
          product_id: productData.id,
          name: productData.name,
          price: storeInfo.store_price || productData.price,
          store_id: storeInfo.store_id,
          store_name: cartStore.currentStoreName,
          image_url: productData.image_url ?? undefined,
          availableStock: storeInfo.available_stock - storeInfo.digital_buffer,
          digitalBuffer: storeInfo.digital_buffer
        }, 1)
        if (!result.success) {
          alert(result.error)
        }
      }
    })
}

function proceedToCheckout() {
  if (hasOutOfStockItems.value) {
    return
  }
  navigateTo('/checkout')
}

// Reservation timer
function updateReservationTimer() {
  reservationTimeRemaining.value = cartStore.reservationTimeRemaining
}

// Initialize
onMounted(async () => {
  updateReservationTimer()
  reservationTimer = setInterval(updateReservationTimer, 1000)

  // Check if delivery is already calculated
  if (cartStore.deliveryDetails) {
    deliveryCalculated.value = true
  }

  // Load dynamic data
  await fetchCategories()
  if (cartStore.items.length > 0) {
    await loadCrossSellProducts()
  }
})

onUnmounted(() => {
  if (reservationTimer) {
    clearInterval(reservationTimer)
  }
})
</script>

<style scoped>
/* Prevent horizontal overflow globally */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  overflow-x: hidden;
  width: 100%;
  position: relative;
}

/* Ensure main container doesn't overflow */
main {
  overflow-x: hidden;
  width: 100%;
}

/* Slide-left transition */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease-out;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Hide scrollbar utility class */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Smooth scrolling for horizontal content */
.scrollbar-hide {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}

.scrollbar-hide > div > * {
  scroll-snap-align: start;
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* Improve text rendering */
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Prevent text overflow */
h1, h2, h3, h4, h5, h6, p, span {
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* Prevent text size adjustment on mobile */
@media screen and (max-width: 640px) {
  html {
    -webkit-text-size-adjust: 100%;
  }
  
  /* Ensure no element exceeds viewport width */
  body {
    position: relative;
  }
  
  /* Prevent any overflow */
  .max-w-7xl {
    max-width: 100vw;
  }
  
  /* Additional overflow prevention */
  .rounded-xl,
  .rounded-lg {
    overflow: hidden;
  }
}

/* Button active state for mobile */
button:active {
  transform: scale(0.98);
}

/* Safe area for iOS devices */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-32 {
    padding-bottom: calc(8rem + env(safe-area-inset-bottom));
  }
}

/* Ensure images don't cause overflow */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Prevent grid overflow */
.grid {
  overflow: hidden;
}

/* Touch feedback */
@media (hover: none) and (pointer: coarse) {
  button:active {
    opacity: 0.8;
  }
}

/* Truncate utility enhancement */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Min-width-0 for flex items to allow shrinking */
.min-w-0 {
  min-width: 0;
}
</style>