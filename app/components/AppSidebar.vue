<template>
  <div>
    <!-- Mobile Header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <NuxtLink to="/" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-sm">
          <span class="text-sm font-bold text-white">HA</span>
        </div>
        <span class="font-bold text-gray-900">HomeAffairs</span>
      </NuxtLink>
      <button
        @click="isMobileMenuOpen = !isMobileMenuOpen"
        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        <svg v-if="!isMobileMenuOpen" class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Mobile Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileMenuOpen"
        class="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        @click="isMobileMenuOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none"
      :class="[
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      ]"
    >
      <!-- Logo & Brand (Desktop Only) -->
      <div class="hidden lg:block p-6 border-b border-gray-200">
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <div class="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <span class="text-base font-bold text-white">HA</span>
          </div>
          <div>
            <span class="font-bold text-lg text-gray-900">HomeAffairs</span>
            <p class="text-xs text-gray-500">Admin Portal</p>
          </div>
        </NuxtLink>
      </div>
    
      <!-- User Info Card -->
      <div class="p-4 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md ring-2 ring-red-100">
            <span class="text-lg font-bold text-white">{{ userInitials }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">
              {{ userStore.displayName }}
            </p>
            <p class="text-xs text-gray-600 capitalize flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              {{ userRoleDisplay }}
            </p>
          </div>
        </div>
        
        <!-- Branch Manager Store Badge -->
        <div v-if="userStore.isBranchManager && currentStoreDisplay" class="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-center gap-2">
            <span class="text-sm">📍</span>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-red-600 font-medium">Current Store</p>
              <p class="text-sm font-semibold text-red-900 truncate">{{ currentStoreDisplay }}</p>
            </div>
          </div>
        </div>

        <!-- Super Admin Store Switcher -->
        <div v-if="userStore.isSuperAdmin && stores.length > 0" class="mt-3">
          <label class="block text-xs font-medium text-gray-700 mb-1">Switch Branch View</label>
          <select 
            v-model="selectedStoreId"
            @change="handleStoreSwitch"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
          >
            <option value="">All Stores</option>
            <option v-for="store in stores" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
        </div>
      </div>
    
      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <!-- Dynamically filtered navigation items -->
        <NuxtLink
          v-for="item in visibleNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative"
          :class="[
            isActive(item.to)
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-50 hover:text-red-600'
          ]"
        >
          <!-- Icon -->
          <SidebarIcon 
            :name="item.icon"
            class="flex-shrink-0 transition-transform group-hover:scale-110"
            :class="[
              isActive(item.to) ? 'text-white' : 'text-gray-400 group-hover:text-red-600'
            ]"
          />
          
          <span class="flex-1">{{ item.label }}</span>
          
          <!-- Notification Badge (Verification Queue for Branch Managers) -->
          <span 
            v-if="item.badge && item.badge > 0"
            class="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold transition-all"
            :class="[
              isActive(item.to) 
                ? 'bg-white text-red-600' 
                : 'bg-red-500 text-white'
            ]"
          >
            {{ item.badge }}
          </span>
          
          <!-- Active indicator -->
          <div 
            v-if="isActive(item.to)"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
          />
        </NuxtLink>
      </nav>
    
      <!-- Session Info (for staff/admin) -->
      <div v-if="userStore.hasAdminAccess" class="px-4 py-3 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
        <div class="flex items-center gap-2 text-xs text-gray-600">
          <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="font-medium">Secure Session</span>
        </div>
        <p class="text-xs text-gray-500 mt-1 ml-6">
          Auto-logout: 30 min inactive
        </p>
      </div>
    
      <!-- Sign Out Button -->
      <div class="p-4 border-t border-gray-200 bg-white">
        <button
          @click="handleLogout"
          class="w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 flex items-center justify-center gap-2 border border-gray-200 hover:border-red-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/user'
import type { UserRole } from '~/stores/user'

// Icon components
const IconHome = 'svg'
const IconGlobe = 'svg'
const IconOfficeBuilding = 'svg'
const IconClipboardList = 'svg'
const IconPackage = 'svg'
const IconChartBar = 'svg'
const IconUsers = 'svg'
const IconCog = 'svg'
const IconPhone = 'svg'
const IconCube = 'svg'

const userStore = useUserStore()
const route = useRoute()
const supabase = useSupabaseClient()

// State
const isMobileMenuOpen = ref(false)
const selectedStoreId = ref('')
const stores = ref<any[]>([])
const pendingVerificationCount = ref(0)

// Navigation Items with Role-Based Access
interface NavItem {
  label: string
  to: string
  icon: string
  requiredRoles: UserRole[]
  badge?: number
}

const navItems = ref<NavItem[]>([
  // Super Admin Only
  {
    label: 'Global Dashboard',
    to: '/admin/global-dashboard',
    icon: 'globe',
    requiredRoles: ['super_admin']
  },
  {
    label: 'Staff Management',
    to: '/admin/staff-management',
    icon: 'users',
    requiredRoles: ['super_admin']
  },
  {
    label: 'All Orders',
    to: '/admin/orders',
    icon: 'clipboardList',
    requiredRoles: ['super_admin', 'branch_manager', 'staff']
  },
  {
    label: 'Analytics',
    to: '/admin/analytics',
    icon: 'chartBar',
    requiredRoles: ['super_admin', 'branch_manager', 'staff']
  },
  
  // Branch Manager
  {
    label: 'Branch Dashboard',
    to: '/admin/branch-dashboard',
    icon: 'officeBuilding',
    requiredRoles: ['branch_manager']
  },
  {
    label: 'Verification Queue',
    to: '/admin/verification-queue',
    icon: 'phone',
    requiredRoles: ['branch_manager', 'staff'],
    badge: 0 // Will be updated dynamically
  },
  
  // Staff Only
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: 'home',
    requiredRoles: ['staff']
  },
  {
    label: 'Inventory',
    to: '/admin/inventory',
    icon: 'cube',
    requiredRoles: ['super_admin', 'branch_manager', 'staff']
  },
  {
    label: 'Settings',
    to: '/admin/settings',
    icon: 'cog',
    requiredRoles: ['super_admin']
  }
])

// Computed: Filter navigation based on current user role
const visibleNav = computed(() => {
  const userRole = userStore.effectiveRole
  
  return navItems.value
    .filter(item => item.requiredRoles.includes(userRole))
    .map(item => {
      // Add badge for verification queue if branch manager
      if (item.to === '/admin/verification-queue' && userStore.isBranchManager) {
        return { ...item, badge: pendingVerificationCount.value }
      }
      return item
    })
})

// Computed: User initials
const userInitials = computed(() => {
  const name = userStore.displayName
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

// Computed: User role display
const userRoleDisplay = computed(() => {
  const role = userStore.effectiveRole
  const roleNames = {
    super_admin: 'Super Admin',
    branch_manager: 'Branch Manager',
    admin: 'Administrator',
    manager: 'Manager',
    staff: 'Staff Member',
    customer: 'Customer'
  }
  return roleNames[role] || role
})

// Computed: Current store display for branch manager
const currentStoreDisplay = computed(() => {
  return userStore.managedStoreNames
})

// Check if route is active
const isActive = (to: string) => {
  return route.path === to || route.path.startsWith(to + '/')
}

// Handle store switch (super admin only)
const handleStoreSwitch = () => {
  // Emit event or update global state for store filtering
  console.log('Switched to store:', selectedStoreId.value)
  // You can emit this to a global state or event bus
}

// Fetch stores for super admin
const fetchStores = async () => {
  if (userStore.isSuperAdmin) {
    const { data } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    
    if (data) {
      stores.value = data
    }
  }
}

// Fetch pending verification count for branch managers
const fetchPendingCount = async () => {
  if (userStore.isBranchManager && userStore.profile?.store_id) {
    // This would be a real query to your orders table
    // For now, using a placeholder
    pendingVerificationCount.value = 5
  }
}

// Handle logout
const handleLogout = async () => {
  isMobileMenuOpen.value = false
  await userStore.signOut()
  navigateTo('/auth')
}

// Close mobile menu when route changes
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

// Initialize
onMounted(() => {
  fetchStores()
  fetchPendingCount()
})
</script>

<style scoped>
/* Custom scrollbar for navigation */
nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
