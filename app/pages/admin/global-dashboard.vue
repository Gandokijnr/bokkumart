<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Global Dashboard</h1>
        <p class="text-gray-600 mt-2">System-wide overview and administration</p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Stores</p>
              <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
              <p v-else class="text-2xl font-bold text-gray-900 mt-1">{{ totalStores }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">🏪</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Active Staff</p>
              <div v-if="loading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
              <p v-else class="text-2xl font-bold text-gray-900 mt-1">{{ totalStaff }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Pending Orders</p>
              <div v-if="todaysLoading" class="mt-2 h-7 w-16 rounded bg-gray-200 animate-pulse" />
              <p v-else class="text-2xl font-bold text-gray-900 mt-1">{{ pendingOrders }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Today's Revenue</p>
              <div v-if="todaysLoading" class="mt-2 h-7 w-40 rounded bg-gray-200 animate-pulse" />
              <p v-else class="text-2xl font-bold text-gray-900 mt-1">{{ formatNaira(todaysRevenue) }}</p>
            </div>
            <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span class="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NuxtLink
          to="/admin/staff-management"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">👥</span>
          <h3 class="text-lg font-semibold text-gray-900">Staff Management</h3>
          <p class="text-sm text-gray-600 mt-2">Manage users, roles, and permissions</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/orders"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">📦</span>
          <h3 class="text-lg font-semibold text-gray-900">All Orders</h3>
          <p class="text-sm text-gray-600 mt-2">View and manage orders across all stores</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/analytics"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <span class="text-3xl mb-3 block">📊</span>
          <h3 class="text-lg font-semibold text-gray-900">Analytics</h3>
          <p class="text-sm text-gray-600 mt-2">Branch performance and insights</p>
        </NuxtLink>
      </div>

      <!-- Live Orders (Recent) -->
      <div class="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <p class="text-sm text-gray-500">Live feed from orders table</p>
          </div>
          <button
            type="button"
            class="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            :disabled="ordersLoading"
            @click="fetchRecentOrders"
          >
            Refresh
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Store</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-if="ordersLoading">
                <td colspan="6" class="px-6 py-6">
                  <div class="space-y-3">
                    <div class="h-4 w-full rounded bg-gray-200 animate-pulse" />
                    <div class="h-4 w-5/6 rounded bg-gray-200 animate-pulse" />
                    <div class="h-4 w-4/6 rounded bg-gray-200 animate-pulse" />
                  </div>
                </td>
              </tr>

              <tr v-else v-for="order in recentOrders" :key="order.id" class="hover:bg-gray-50 transition-colors">
                <td class="whitespace-nowrap px-6 py-4">
                  <NuxtLink
                    :to="`/admin/orders?orderId=${order.id}`"
                    class="font-mono text-sm font-semibold text-gray-900 hover:text-red-600"
                  >
                    #{{ order.id.slice(-6).toUpperCase() }}
                  </NuxtLink>
                </td>
                <td class="whitespace-nowrap px-6 py-4">
                  <p class="text-sm font-medium text-gray-900">{{ order.contact_name || 'Unknown' }}</p>
                  <p class="text-xs text-gray-500">{{ order.contact_phone || '' }}</p>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                  {{ order.store?.name || 'Unknown' }}
                </td>
                <td class="whitespace-nowrap px-6 py-4">
                  <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border" :class="getStatusColor(order.status)">
                    {{ order.status }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                  {{ formatNaira(order.total_amount || 0) }}
                </td>
                <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {{ formatTimeAgo(order.created_at) }}
                </td>
              </tr>

              <tr v-if="!ordersLoading && recentOrders.length === 0">
                <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                  No orders found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database.types'

definePageMeta({
  layout: 'admin',
  middleware: ['super-admin']
})

useHead({
  title: 'Global Dashboard - HomeAffairs'
})

const supabase = useSupabaseClient<Database>()

const loading = ref(false)
const totalStores = ref(0)
const totalStaff = ref(0)

const todaysLoading = ref(false)
const todaysOrders = ref(0)
const todaysRevenue = ref(0)
const pendingOrders = ref(0)

type RecentOrder = Database['public']['Tables']['orders']['Row'] & {
  store?: { name: string } | null
  contact_name?: string | null
  contact_phone?: string | null
}

const ordersLoading = ref(false)
const recentOrders = ref<RecentOrder[]>([])

let ordersListChannel: any = null
let ordersListRefreshTimer: ReturnType<typeof setTimeout> | null = null

const fetchGlobalCounts = async () => {
  loading.value = true
  try {
    const [{ count: storesCount }, { count: staffCount }] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', ['staff', 'branch_manager', 'super_admin'])
    ])

    totalStores.value = storesCount || 0
    totalStaff.value = staffCount || 0
  } finally {
    loading.value = false
  }
}

const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
    .format(amount)
    .replace('NGN', '₦')
}

const fetchTodaysStats = async () => {
  todaysLoading.value = true
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const startIso = start.toISOString()

    const [{ count, error: countError }, { data, error }] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', startIso),
      supabase
        .from('orders')
        .select('subtotal')
        .gte('created_at', startIso)
    ])

    if (countError) {
      console.error('Error fetching today orders count:', countError)
    }
    todaysOrders.value = count || 0

    if (error) {
      console.error('Error fetching today revenue:', error)
      todaysRevenue.value = 0
    } else {
      todaysRevenue.value = (data || []).reduce((sum, row: any) => sum + (row?.subtotal || 0), 0)
    }
  } finally {
    todaysLoading.value = false
  }
}

const fetchPendingOrders = async () => {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching pending orders count:', error)
    pendingOrders.value = 0
    return
  }

  pendingOrders.value = count || 0
}

const fetchRecentOrders = async () => {
  ordersLoading.value = true
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, store:stores!orders_store_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching recent orders:', error)
      recentOrders.value = []
      return
    }

    recentOrders.value = (data || []) as any
  } finally {
    ordersLoading.value = false
  }
}

const scheduleOrdersListRefresh = () => {
  if (ordersListRefreshTimer) clearTimeout(ordersListRefreshTimer)
  ordersListRefreshTimer = setTimeout(() => {
    Promise.all([fetchRecentOrders(), fetchTodaysStats(), fetchPendingOrders()])
  }, 250)
}

const subscribeToOrdersList = () => {
  if (ordersListChannel) {
    supabase.removeChannel(ordersListChannel)
    ordersListChannel = null
  }

  ordersListChannel = supabase
    .channel('global-dashboard:orders-list')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => scheduleOrdersListRefresh()
    )
    .subscribe()
}

const unsubscribeFromOrdersList = () => {
  if (ordersListChannel) {
    supabase.removeChannel(ordersListChannel)
    ordersListChannel = null
  }
  if (ordersListRefreshTimer) {
    clearTimeout(ordersListRefreshTimer)
    ordersListRefreshTimer = null
  }
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    confirmed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    assigned: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    picked_up: 'bg-purple-100 text-purple-800 border-purple-200',
    arrived: 'bg-purple-100 text-purple-800 border-purple-200',
    delivered: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    refunded: 'bg-red-100 text-red-800 border-red-200'
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

function formatTimeAgo(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

onMounted(async () => {
  await Promise.all([fetchGlobalCounts(), fetchTodaysStats(), fetchPendingOrders(), fetchRecentOrders()])
  subscribeToOrdersList()
})

onUnmounted(() => {
  unsubscribeFromOrdersList()
})
</script>
