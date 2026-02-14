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

        <!-- Branch Switcher -->
        <button
          @click="handleBranchSwitch"
          class="hidden md:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-red-300 hover:shadow-md"
        >
          <svg class="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span class="max-w-[150px] truncate">{{ branchStore.activeBranchName }}</span>
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
            @click="showGlobalSearch = true"
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
            <!-- Mobile Branch Selector -->
            <button @click="handleBranchSwitch; mobileMenuOpen = false" class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700">
              <span class="text-lg">🏪</span>
              <span>{{ branchStore.activeBranchName }}</span>
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

  <!-- Branch Selector Modal -->
  <StoreSelector v-model="showBranchSelector" @select="handleBranchSelect" />

  <!-- Branch Switch Cart Warning Dialog -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showBranchCartWarning" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">Switching Stores?</h3>
                <p class="text-sm text-gray-600">This action will clear your cart</p>
              </div>
            </div>
            
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p class="text-sm text-amber-800">
                <span class="font-semibold">Warning:</span> Your cart contains 
                <span class="font-bold">{{ cartStore.cartCount }}</span> item{{ cartStore.cartCount === 1 ? '' : 's' }} 
                from <span class="font-bold">{{ cartStore.currentStoreName }}</span>.
              </p>
              <p class="text-sm text-amber-800 mt-2">
                Switching stores will <span class="font-bold">clear your current cart</span>. 
                Proceed?
              </p>
            </div>

            <div class="flex gap-3">
              <button
                @click="cancelBranchSwitch"
                class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                @click="confirmBranchSwitch"
                class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Clear Cart & Switch
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Global Search Modal -->
  <GlobalSearch v-model="showGlobalSearch" @switch-branch="pendingBranchId = $event; showBranchCartWarning = true" />
</template>

<script setup lang="ts">
import { useCartStore } from '~/stores/useCartStore'
import { useUserStore } from '~/stores/user'
import { useStoreStore } from '~/stores/store'
import { useBranchStore } from '~/stores/useBranchStore'

const cartStore = useCartStore()
const userStore = useUserStore()
const storeStore = useStoreStore()
const branchStore = useBranchStore()
const supabase = useSupabaseClient()

const searchOpen = ref(false)
const mobileMenuOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const showStoreSwitcher = ref(false)

// Search and branch switcher state
const showGlobalSearch = ref(false)
const showBranchSelector = ref(false)
const showBranchCartWarning = ref(false)
const pendingBranchId = ref<string | null>(null)

// Reactive cart count from store
const cartCount = computed(() => cartStore.cartCount)

// Use user store for role-based checks
const isAdmin = computed(() => userStore.isAdmin)
const isStaff = computed(() => userStore.isStaff)
const isManager = computed(() => userStore.isManager)
const hasStaffAccess = computed(() => userStore.hasStaffAccess)
const userRole = computed(() => userStore.userRole)

// Initialize stores on mount
onMounted(async () => {
  userStore.initialize()
  await branchStore.initialize(supabase)
  
  // Show branch selector if no branch is selected
  if (!branchStore.hasActiveBranch) {
    showBranchSelector.value = true
  }
})

const toggleSearch = async () => {
  showGlobalSearch.value = true
}

// Handle branch switching with cart warning
const handleBranchSwitch = () => {
  showBranchSelector.value = true
}

// Check for cart conflicts before switching
const handleBranchSelect = (branch: { id: string; name: string }) => {
  // Check if user has items in cart from a different branch
  if (cartStore.items.length > 0 && cartStore.currentStoreId !== branch.id) {
    showBranchCartWarning.value = true
    pendingBranchId.value = branch.id
    return
  }
  
  // No conflict, proceed with switch
  completeBranchSwitch(branch.id)
}

// Complete the branch switch
const completeBranchSwitch = async (branchId: string) => {
  const result = branchStore.switchBranch(branchId)
  
  if (result.success && result.newBranch) {
    // Clear cart if switching to different branch
    if (result.requiresCartClear && cartStore.items.length > 0) {
      cartStore.clearCart()
    }
    
    // Sync with Supabase
    await branchStore.syncWithSupabase(supabase)
    
    // Close modals
    showBranchSelector.value = false
    showBranchCartWarning.value = false
    pendingBranchId.value = null
    
    // Reload page to show branch-specific products
    window.location.reload()
  }
}

// Cancel branch switch due to cart conflict
const cancelBranchSwitch = () => {
  showBranchCartWarning.value = false
  pendingBranchId.value = null
}

// Confirm clearing cart and switching
const confirmBranchSwitch = async () => {
  if (pendingBranchId.value) {
    await completeBranchSwitch(pendingBranchId.value)
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
