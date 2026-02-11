<template>
  <header class="sticky top-0 z-50 bg-white shadow-sm">
    <div class="mx-auto max-w-7xl">
      <!-- Top bar -->
      <div class="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <!-- Logo -->
        <button @click="navigateTo('/')" class="flex items-center gap-2.5 md:gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-md md:h-12 md:w-12">
            <span class="text-base font-bold text-white md:text-lg">HA</span>
          </div>
          <div class="leading-tight">
            <div class="text-base font-bold text-gray-900 md:text-lg" :style="headingStyle">HomeAffairs</div>
            <div class="hidden text-xs text-gray-600 sm:block">Premium Supermarket</div>
          </div>
        </button>

        <!-- Store Selector -->
        <button
          @click="showStoreSwitcher = true"
          class="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-red-300 hover:shadow-md"
        >
          <svg class="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="max-w-[150px] truncate">{{ storeStore.selectedStore?.name || 'Select Store' }}</span>
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Desktop Navigation -->
        <nav class="hidden items-center gap-8 lg:flex" aria-label="Primary">
          <button @click="navigateTo('/#categories')" class="text-sm font-medium text-gray-700 transition-colors hover:text-red-600">Categories</button>
          <button @click="navigateTo('/#deals')" class="text-sm font-medium text-gray-700 transition-colors hover:text-red-600">Deals</button>
          <button @click="navigateTo('/#about')" class="text-sm font-medium text-gray-700 transition-colors hover:text-red-600">About</button>
          <button @click="navigateTo('/#contact')" class="text-sm font-medium text-gray-700 transition-colors hover:text-red-600">Contact</button>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Search button (desktop) -->
          <button
            class="hidden h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 md:flex"
            type="button"
            aria-label="Search"
            :aria-expanded="searchOpen ? 'true' : 'false'"
            @click="toggleSearch"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <!-- Cart -->
          <button @click="navigateTo('/cart')" class="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1" type="button" aria-label="Shopping cart">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <ClientOnly>
              <span v-if="cartCount > 0" class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">{{ cartCount }}</span>
            </ClientOnly>
          </button>

          <!-- Account -->
          <button @click="navigateTo('/profile')" class="hidden h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 sm:flex" type="button" aria-label="Account">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          <!-- Admin Dashboard Link (visible only for admins) -->
          <ClientOnly>
            <button
              v-if="isAdmin"
              @click="navigateTo('/admin/dashboard')"
              class="hidden h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 sm:flex"
              type="button"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Admin</span>
            </button>
          </ClientOnly>

          <!-- Mobile menu toggle -->
          <button
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 lg:hidden"
            type="button"
            aria-label="Menu"
            :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <svg v-if="!mobileMenuOpen" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Search bar (desktop dropdown) -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="searchOpen" class="border-t border-gray-100 bg-white px-4 py-4 md:px-6">
          <div class="mx-auto max-w-2xl">
            <div class="relative">
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="search"
                placeholder="Search for rice, fruits, beverages..."
                class="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-red-600 focus:bg-white"
              />
              <svg class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Mobile menu -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <div v-if="mobileMenuOpen" class="border-t border-gray-100 bg-white px-4 py-4 lg:hidden">
          <!-- Mobile search -->
          <div class="relative mb-4">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search products..."
              class="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-red-600 focus:bg-white"
            />
            <svg class="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- Mobile nav links -->
          <nav class="space-y-1" aria-label="Mobile">
            <!-- Mobile Store Selector -->
            <button @click="showStoreSwitcher = true; mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700">
              <span class="text-lg">🏪</span>
              <span>{{ storeStore.selectedStore?.name || 'Select Store' }}</span>
            </button>
            <button @click="navigateTo('/#categories'); mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700">
              <span class="text-lg">🏪</span>
              <span>Categories</span>
            </button>
            <button @click="navigateTo('/#deals'); mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700">
              <span class="text-lg">⚡</span>
              <span>Deals</span>
            </button>
            <button @click="navigateTo('/#about'); mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700">
              <span class="text-lg">ℹ️</span>
              <span>About Us</span>
            </button>
            <button @click="navigateTo('/#contact'); mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700">
              <span class="text-lg">📞</span>
              <span>Contact</span>
            </button>
          </nav>

          <!-- Mobile account link -->
          <div class="mt-4 border-t border-gray-100 pt-4 sm:hidden">
            <button @click="navigateTo('/profile'); mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700">
              <span class="text-lg">👤</span>
              <span>My Account</span>
            </button>
          </div>

          <!-- Mobile admin link (visible only for admins) -->
          <ClientOnly>
            <div v-if="isAdmin" class="border-t border-gray-100 pt-2 sm:hidden">
              <button @click="navigateTo('/admin/dashboard'); mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                <span class="text-lg">⚙️</span>
                <span>Admin Dashboard</span>
              </button>
            </div>
          </ClientOnly>
        </div>
      </Transition>
    </div>
  </header>

  <!-- Store Switcher Modal -->
  <StoreSwitcher v-model="showStoreSwitcher" />
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/useCartStore'
import { useUserStore } from '~/stores/user'
import { useStoreStore } from '~/stores/store'

const cartStore = useCartStore()
const userStore = useUserStore()
const storeStore = useStoreStore()
const searchOpen = ref(false)
const mobileMenuOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const showStoreSwitcher = ref(false)

// Reactive cart count from store
const cartCount = computed(() => cartStore.cartCount)

// Use user store for role-based checks
const isAdmin = computed(() => userStore.isAdmin)
const isStaff = computed(() => userStore.isStaff)
const isManager = computed(() => userStore.isManager)
const hasStaffAccess = computed(() => userStore.hasStaffAccess)
const userRole = computed(() => userStore.userRole)

// Initialize user store on mount
onMounted(() => {
  userStore.initialize()
})

const toggleSearch = async () => {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInput.value?.focus()
  }
}

const headingStyle = computed(() => ({
  fontFamily: "ui-serif, 'Playfair Display', Georgia, 'Times New Roman', Times, serif"
}))

// Handle escape key
onMounted(() => {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      searchOpen.value = false
      mobileMenuOpen.value = false
    }
  })
})
</script>
