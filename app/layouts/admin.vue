<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside 
      class="fixed left-0 top-0 z-40 h-screen w-64 transform bg-slate-900 transition-transform duration-300"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="flex h-full flex-col">
        <!-- Logo -->
        <div class="flex items-center gap-3 border-b border-slate-800 px-6 py-4">
          <div class="h-10 w-10 rounded-xl bg-red-600 flex items-center justify-center">
            <span class="text-lg font-bold text-white">HA</span>
          </div>
          <div>
            <h1 class="font-bold text-white">Admin</h1>
            <p class="text-xs text-slate-400">HomeAffairs</p>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 p-4">
          <NuxtLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            :class="route.path === item.href ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'"
          >
            <!-- Phone Icon -->
            <svg v-if="item.icon === 'phone'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <!-- Clipboard Icon -->
            <svg v-else-if="item.icon === 'clipboard'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <!-- Cube Icon -->
            <svg v-else-if="item.icon === 'cube'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            <!-- Cog Icon -->
            <svg v-else-if="item.icon === 'cog'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ item.name }}</span>
            <span 
              v-if="item.badge && item.badge > 0"
              class="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white"
            >
              {{ item.badge }}
            </span>
          </NuxtLink>
        </nav>

        <!-- User Info -->
        <div class="border-t border-slate-800 p-4">
          <div class="flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3">
            <div class="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center">
              <span class="text-sm font-bold text-white">{{ userInitials }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ user?.email }}</p>
              <p class="text-xs text-slate-400 capitalize">{{ userRole }}</p>
            </div>
            <button 
              @click="logout"
              class="text-slate-400 hover:text-white transition-colors"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Overlay -->
    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Main Content -->
    <div class="lg:ml-64">
      <!-- Header -->
      <header class="sticky top-0 z-20 bg-white shadow-sm">
        <div class="flex items-center justify-between px-4 py-3">
          <button 
            @click="isSidebarOpen = !isSidebarOpen"
            class="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div class="flex items-center gap-4">
            <!-- Store Filter -->
            <select 
              v-if="userRole !== 'admin'"
              v-model="selectedStore"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">All Stores</option>
              <option v-for="store in stores" :key="store.id" :value="store.id">
                {{ store.name }}
              </option>
            </select>

            <!-- Notifications -->
            <button class="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span 
                v-if="unreadCount > 0"
                class="absolute right-1 top-1 h-5 w-5 rounded-full bg-red-600 text-xs font-bold text-white flex items-center justify-center"
              >
                {{ unreadCount }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-4 lg:p-6">
        <slot />
      </main>
    </div>

    <!-- Unauthorized Modal -->
    <div v-if="!isAuthorized && !loading" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="rounded-2xl bg-white p-8 text-center shadow-xl max-w-md mx-4">
        <div class="mb-4 text-6xl">🚫</div>
        <h2 class="text-xl font-bold text-gray-900">Access Denied</h2>
        <p class="mt-2 text-gray-600">You don't have permission to access the admin dashboard.</p>
        <button 
          @click="navigateTo('/')"
          class="mt-6 rounded-xl bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const isSidebarOpen = ref(false)
const loading = ref(true)
const isAuthorized = ref(false)
const userRole = ref('')
const stores = ref<any[]>([])
const selectedStore = ref('')
const unreadCount = ref(0)

const userInitials = computed(() => {
  if (!user.value?.email) return '?'
  return user.value.email.substring(0, 2).toUpperCase()
})

const navigation = [
  { name: 'Verification Queue', href: '/admin/dashboard', icon: 'phone', badge: 0 },
  { name: 'Active Orders', href: '/admin/orders', icon: 'clipboard' },
  { name: 'Inventory', href: '/admin/inventory', icon: 'cube' },
  { name: 'Store Settings', href: '/admin/settings', icon: 'cog' },
]

// Check authorization (same pattern as auth middleware)
const checkAuth = async () => {
  // Helper to get user ID from either id or sub (Supabase uses sub in JWT)
  const getUserId = (u: any) => u?.id || u?.sub
  
  // Wait for user to resolve (user starts as undefined, then becomes null or object)
  let attempts = 0
  while ((user.value === undefined || !getUserId(user.value)) && attempts < 50) {
    await new Promise(r => setTimeout(r, 100))
    attempts++
  }

  if (!getUserId(user.value)) {
    console.log('admin.vue: No user after waiting, redirecting to login')
    navigateTo('/auth?redirect=/admin/dashboard')
    return
  }

  const userId = getUserId(user.value)
  
  console.log('admin.vue: User resolved, id:', userId)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, store_id')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('admin.vue: Profile fetch error:', error)
    loading.value = false
    return
  }

  if (!profile) {
    console.log('admin.vue: No profile found for user:', userId)
    loading.value = false
    return
  }

  console.log('admin.vue: User role:', (profile as any).role)
  const role = (profile as any).role
  const storeId = (profile as any).store_id

  if (role === 'admin' || role === 'staff') {
    isAuthorized.value = true
    userRole.value = role
    if (storeId) {
      selectedStore.value = storeId
    }
  } else {
    console.log('admin.vue: Access denied - role is:', role)
  }

  loading.value = false
}

// Fetch stores for filter
const fetchStores = async () => {
  const { data } = await supabase.from('stores').select('id, name').eq('is_active', true)
  if (data) stores.value = data
}

// Logout
const logout = async () => {
  await supabase.auth.signOut()
  navigateTo('/')
}

onMounted(() => {
  checkAuth()
  fetchStores()
})

// Provide store filter to child pages
provide('selectedStore', selectedStore)
provide('userRole', userRole)
</script>
