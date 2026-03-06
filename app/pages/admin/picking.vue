<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Order Picking Dashboard</h1>
            <p class="text-gray-600 mt-2">
              Pick and pack orders with location guidance
              <span v-if="selectedStore" class="font-medium text-red-600">
                - {{ selectedStore.name }}
              </span>
            </p>
          </div>
          <div class="flex items-center gap-3">
            <select
              v-model="selectedStoreId"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
            >
              <option value="">All Stores</option>
              <option v-for="store in stores" :key="store.id" :value="store.id">
                {{ store.name }}
              </option>
            </select>
            <button
              @click="refreshOrders"
              :disabled="loading"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Refreshing...
              </span>
              <span v-else>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-sm text-gray-600">Ready to Pick</p>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ readyToPickCount }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-sm text-gray-600">Picking in Progress</p>
          <p class="text-2xl font-bold text-amber-600 mt-1">{{ pickingInProgressCount }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-sm text-gray-600">Ready for Packing</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ readyToPackCount }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-sm text-gray-600">Completed Today</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{{ completedTodayCount }}</p>
        </div>
      </div>

      <!-- Orders List -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Orders to Pick</h2>
            <div class="flex items-center gap-3">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search orders..."
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
              />
              <select
                v-model="statusFilter"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="ready_for_pos">Ready for POS</option>
                <option value="completed_in_pos">POS Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div class="divide-y divide-gray-200">
          <div
            v-for="order in filteredOrders"
            :key="order.id"
            class="p-6 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="font-semibold text-gray-900">
                    Order #{{ order.id.slice(-8).toUpperCase() }}
                  </h3>
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusBadgeClass(order.status)"
                  >
                    {{ order.status.replace('_', ' ') }}
                  </span>
                  <span
                    v-if="order.delivery_method === 'pickup'"
                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                  >
                    Pickup
                  </span>
                  <span
                    v-if="order.pickup_time"
                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    {{ order.pickup_time }}
                  </span>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p class="text-gray-500">Customer</p>
                    <p class="font-medium text-gray-900">{{ order.customer_name || 'N/A' }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Items</p>
                    <p class="font-medium text-gray-900">{{ order.item_count }} items</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Store</p>
                    <p class="font-medium text-gray-900">{{ order.store_name }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500">Created</p>
                    <p class="font-medium text-gray-900">{{ getTimeElapsed(order.created_at) }}</p>
                  </div>
                </div>

                <!-- Items with Picking Status -->
                <div class="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 class="text-sm font-medium text-gray-700 mb-3">Items to Pick</h4>
                  <div class="space-y-2">
                    <div
                      v-for="(item, idx) in order.items"
                      :key="idx"
                      class="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div class="flex items-center gap-3">
                        <button
                          @click="toggleItemPicked(order.id, idx)"
                          class="w-6 h-6 rounded border-2 flex items-center justify-center transition-colors"
                          :class="isItemPicked(order.id, idx) 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-red-400'"
                        >
                          <svg v-if="isItemPicked(order.id, idx)" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        </button>
                        <div>
                          <p class="font-medium text-gray-900">{{ item.name }}</p>
                          <p class="text-sm text-gray-500">
                            Qty: {{ item.quantity }} × ₦{{ item.unit_price }}
                          </p>
                          <p
                            v-if="item.location"
                            class="text-xs font-medium text-red-600 mt-0.5"
                          >
                            📍 {{ item.location }}
                          </p>
                          <p v-else class="text-xs text-amber-600 mt-0.5">
                            ⚠️ No location set
                          </p>
                        </div>
                      </div>
                      <span class="text-sm font-medium text-gray-900">
                        ₦{{ (item.unit_price * item.quantity).toLocaleString() }}
                      </span>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="mt-4">
                    <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Picking Progress</span>
                      <span>{{ getPickingProgress(order.id, order.items.length) }}%</span>
                    </div>
                    <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-green-500 transition-all duration-300"
                        :style="{ width: getPickingProgress(order.id, order.items.length) + '%' }"
                      />
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-3">
                  <button
                    v-if="order.status === 'confirmed'"
                    @click="updateOrderStatus(order.id, 'ready_for_pos')"
                    :disabled="processing.has(order.id)"
                    class="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    Mark Ready for POS
                  </button>
                  <button
                    v-if="order.status === 'ready_for_pos'"
                    @click="updateOrderStatus(order.id, 'completed_in_pos')"
                    :disabled="processing.has(order.id) || !isOrderFullyPicked(order.id, order.items.length)"
                    class="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    Mark POS Done
                  </button>
                  <button
                    v-if="order.status === 'completed_in_pos' && order.delivery_method === 'pickup'"
                    @click="updateOrderStatus(order.id, 'picked_up')"
                    :disabled="processing.has(order.id)"
                    class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Mark Ready for Pickup
                  </button>
                  <button
                    v-if="order.status === 'completed_in_pos' && order.delivery_method === 'delivery'"
                    @click="updateOrderStatus(order.id, 'assigned')"
                    :disabled="processing.has(order.id)"
                    class="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Assign Rider
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredOrders.length === 0" class="p-12 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No orders to pick</h3>
            <p class="mt-1 text-sm text-gray-500">All caught up! Check back later for new orders.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/database.types'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

useHead({
  title: 'Picking Dashboard - HomeAffairs'
})

const supabase = useSupabaseClient<Database>()
const toast = useToast()

// State
const orders = ref<any[]>([])
const stores = ref<any[]>([])
const loading = ref(false)
const selectedStoreId = ref('')
const searchQuery = ref('')
const statusFilter = ref('')
const processing = ref<Set<string>>(new Set())

// Track picked items per order (in-memory only for session)
const pickedItems = ref<Record<string, Set<number>>>({})

// Computed
const selectedStore = computed(() => {
  return stores.value.find(s => s.id === selectedStoreId.value)
})

const readyToPickCount = computed(() => {
  return orders.value.filter(o => o.status === 'confirmed').length
})

const pickingInProgressCount = computed(() => {
  return orders.value.filter(o => o.status === 'ready_for_pos').length
})

const readyToPackCount = computed(() => {
  return orders.value.filter(o => o.status === 'completed_in_pos').length
})

const completedTodayCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return orders.value.filter(o => 
    o.status === 'delivered' && 
    o.updated_at?.startsWith(today)
  ).length
})

const filteredOrders = computed(() => {
  let result = orders.value
  
  if (selectedStoreId.value) {
    result = result.filter(o => o.store_id === selectedStoreId.value)
  }
  
  if (statusFilter.value) {
    result = result.filter(o => o.status === statusFilter.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(o => 
      o.id.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.items?.some((i: any) => i.name?.toLowerCase().includes(q))
    )
  }
  
  // Sort by pickup time for pickup orders, then by created_at
  return result.sort((a, b) => {
    if (a.delivery_method === 'pickup' && b.delivery_method === 'pickup') {
      if (a.pickup_time && b.pickup_time) {
        return a.pickup_time.localeCompare(b.pickup_time)
      }
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
})

// Methods
const isItemPicked = (orderId: string, itemIndex: number) => {
  return pickedItems.value[orderId]?.has(itemIndex) || false
}

const toggleItemPicked = (orderId: string, itemIndex: number) => {
  if (!pickedItems.value[orderId]) {
    pickedItems.value[orderId] = new Set()
  }
  
  if (pickedItems.value[orderId].has(itemIndex)) {
    pickedItems.value[orderId].delete(itemIndex)
  } else {
    pickedItems.value[orderId].add(itemIndex)
  }
}

const getPickingProgress = (orderId: string, totalItems: number) => {
  const picked = pickedItems.value[orderId]?.size || 0
  return Math.round((picked / totalItems) * 100)
}

const isOrderFullyPicked = (orderId: string, totalItems: number) => {
  return (pickedItems.value[orderId]?.size || 0) === totalItems
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700',
    confirmed: 'bg-blue-100 text-blue-700',
    ready_for_pos: 'bg-cyan-100 text-cyan-700',
    completed_in_pos: 'bg-teal-100 text-teal-700',
    assigned: 'bg-purple-100 text-purple-700',
    picked_up: 'bg-yellow-100 text-yellow-700',
    arrived: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

const getTimeElapsed = (createdAt: string) => {
  const minutes = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60000
  )
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const fetchStores = async () => {
  const { data } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  
  if (data) {
    stores.value = data
  }
}

const fetchOrders = async () => {
  loading.value = true
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      stores!store_id(name),
      store_inventory!inner(
        product_id,
        aisle,
        shelf,
        section
      )
    `)
    .in('status', ['confirmed', 'ready_for_pos', 'completed_in_pos'])
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching orders:', error)
    toast.add({ title: 'Error', description: 'Failed to load orders', color: 'error' })
    loading.value = false
    return
  }
  
  // Get unique user IDs for profile lookup
  const userIds = [...new Set((data || []).map((o: any) => o.user_id).filter(Boolean))]
  
  // Fetch user profiles
  const profileMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number')
      .in('id', userIds)
    
    if (profilesData) {
      for (const p of profilesData) {
        profileMap[p.id] = p
      }
    }
  }
  
  // Build inventory location map
  const inventoryMap: Record<string, any> = {}
  for (const order of (data || [])) {
    if (order.store_inventory) {
      for (const inv of order.store_inventory) {
        inventoryMap[inv.product_id] = inv
      }
    }
  }
  
  // Process orders with location data
  orders.value = (data || []).map((order: any) => {
    const items = Array.isArray(order.items) ? order.items : []
    
    // Add location info to each item
    const itemsWithLocation = items.map((item: any) => {
      const inv = inventoryMap[item.product_id]
      let location = ''
      if (inv) {
        const parts = []
        if (inv.aisle) parts.push(`Aisle ${inv.aisle}`)
        if (inv.shelf) parts.push(`Shelf ${inv.shelf}`)
        if (inv.section) parts.push(`Section ${inv.section}`)
        location = parts.join(' › ')
      }
      return { ...item, location }
    })
    
    return {
      ...order,
      store_name: order.stores?.name || 'Unknown',
      customer_name: order.contact_name || profileMap[order.user_id]?.full_name,
      customer_phone: order.contact_phone || profileMap[order.user_id]?.phone_number,
      item_count: items.length,
      items: itemsWithLocation
    }
  })
  
  loading.value = false
}

const updateOrderStatus = async (orderId: string, newStatus: string) => {
  processing.value.add(orderId)
  
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    
    if (!accessToken) {
      throw new Error('Not authenticated')
    }
    
    await $fetch('/api/admin/update-order-status', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: {
        orderId,
        status: newStatus
      }
    })
    
    toast.add({ 
      title: 'Status Updated', 
      description: `Order moved to ${newStatus.replace('_', ' ')}`,
      color: 'success'
    })
    
    // Refresh orders
    await fetchOrders()
  } catch (err: any) {
    console.error('Error updating order:', err)
    toast.add({ 
      title: 'Error', 
      description: err?.data?.message || 'Failed to update order',
      color: 'error'
    })
  } finally {
    processing.value.delete(orderId)
  }
}

const refreshOrders = () => {
  fetchOrders()
}

// Lifecycle
onMounted(() => {
  fetchStores()
  fetchOrders()
})
</script>
