<template>
  <div>
    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
      <div class="flex-1 min-w-[200px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search orders..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
        />
      </div>
      
      <select
        v-model="storeFilter"
        class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
      >
        <option value="">All Stores</option>
        <option v-for="store in stores" :key="store.id" :value="store.id">
          {{ store.name }}
        </option>
      </select>

      <select
        v-model="paymentFilter"
        class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
      >
        <option value="">All Payment Methods</option>
        <option value="pod">Pay on Delivery</option>
        <option value="prepaid">Prepaid</option>
      </select>

      <div class="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
        <button
          @click="viewMode = 'kanban'"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
        >
          Kanban
        </button>
        <button
          @click="viewMode = 'table'"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
        >
          Table
        </button>
      </div>
    </div>

    <!-- Kanban View -->
    <div v-if="viewMode === 'kanban'" class="grid gap-4 lg:grid-cols-5">
      <div
        v-for="column in kanbanColumns"
        :key="column.status"
        class="rounded-xl bg-gray-100 p-3"
        :class="{ 'bg-red-50': column.status === 'awaiting_call' }"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">{{ column.title }}</h3>
          <span class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
            {{ getOrdersByStatus(column.status).length }}
          </span>
        </div>

        <div class="space-y-3">
          <div
            v-for="order in getOrdersByStatus(column.status)"
            :key="order.id"
            class="cursor-pointer rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            :class="{ 'border-l-4 border-red-500': order.fraudRisk?.isHighRisk }"
            @click="openOrderDetails(order)"
          >
            <div class="flex items-start justify-between">
              <span class="font-mono text-xs font-bold text-gray-900">
                #{{ order.id.slice(-8).toUpperCase() }}
              </span>
              <span
                v-if="order.payment_method === 'pod'"
                class="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-bold text-orange-700"
              >
                POD
              </span>
            </div>

            <p class="mt-1 text-sm font-medium text-gray-900">{{ order.customer_name || 'N/A' }}</p>
            <p class="text-xs text-gray-500">{{ order.store_name }}</p>

            <div class="mt-2 flex items-center justify-between">
              <span class="font-bold text-gray-900">₦{{ formatNumber(order.total_amount) }}</span>
              <span class="text-xs text-gray-500">{{ getTimeElapsed(order.created_at) }}</span>
            </div>

            <div v-if="column.status !== 'cancelled' && column.status !== 'delivered'" class="mt-2">
              <div class="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  class="h-1.5 rounded-full bg-red-600 transition-all"
                  :style="{ width: getProgressPercentage(column.status) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div v-else class="rounded-xl bg-white shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Store</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="hover:bg-gray-50"
              :class="{ 'bg-red-50': order.fraudRisk?.isHighRisk }"
            >
              <td class="px-4 py-3 font-mono text-sm font-bold text-gray-900">
                #{{ order.id.slice(-8).toUpperCase() }}
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ order.customer_name || 'N/A' }}</p>
                <p class="text-xs text-gray-500">{{ order.delivery_details?.contactPhone || order.customer_phone }}</p>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">{{ order.store_name }}</td>
              <td class="px-4 py-3 text-sm font-bold text-gray-900">₦{{ formatNumber(order.total_amount) }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-1 text-xs font-bold"
                  :class="order.payment_method === 'pod' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'"
                >
                  {{ order.payment_method === 'pod' ? 'POD' : 'Prepaid' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-1 text-xs font-bold"
                  :class="getStatusBadgeClass(order.status)"
                >
                  {{ order.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ getTimeElapsed(order.created_at) }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    @click="updateStatus(order, getNextStatus(order.status))"
                    :disabled="processing.has(order.id) || order.status === 'delivered' || order.status === 'cancelled'"
                    class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {{ getNextStatusLabel(order.status) }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Details Modal -->
    <div v-if="selectedOrder" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">
            Order #{{ selectedOrder.id.slice(-8).toUpperCase() }}
          </h3>
          <button @click="selectedOrder = null" class="text-gray-400 hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mt-4 space-y-4">
          <div class="rounded-lg bg-gray-50 p-4">
            <h4 class="font-semibold text-gray-900">Customer</h4>
            <p class="text-gray-700">{{ selectedOrder.customer_name || 'N/A' }}</p>
            <a :href="`tel:${selectedOrder.delivery_details?.contactPhone || selectedOrder.customer_phone}`" class="text-red-600 hover:underline">
              {{ selectedOrder.delivery_details?.contactPhone || selectedOrder.customer_phone || 'N/A' }}
            </a>
          </div>

          <div class="rounded-lg bg-gray-50 p-4">
            <h4 class="font-semibold text-gray-900">Delivery</h4>
            <p class="text-gray-700">
              {{ selectedOrder.delivery_details?.address?.area }}, 
              {{ selectedOrder.delivery_details?.address?.street }}
            </p>
            <p v-if="selectedOrder.delivery_details?.address?.landmark" class="text-sm text-gray-500">
              Landmark: {{ selectedOrder.delivery_details.address.landmark }}
            </p>
          </div>

          <div class="rounded-lg bg-gray-50 p-4">
            <h4 class="font-semibold text-gray-900">Items ({{ selectedOrder.item_count }})</h4>
            <div v-if="selectedOrder.items" class="mt-2 space-y-2">
              <div
                v-for="(item, idx) in selectedOrder.items"
                :key="idx"
                class="flex items-center justify-between text-sm"
              >
                <span>{{ item.name }} x{{ item.quantity }}</span>
                <span class="font-medium">₦{{ formatNumber(item.price * item.quantity) }}</span>
              </div>
            </div>
            <div class="mt-3 border-t border-gray-200 pt-2">
              <div class="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>₦{{ formatNumber(selectedOrder.total_amount) }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              v-if="selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled'"
              @click="updateStatus(selectedOrder, getNextStatus(selectedOrder.status))"
              class="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700"
            >
              {{ getNextStatusLabel(selectedOrder.status) }}
            </button>
            <button
              v-if="selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled'"
              @click="cancelOrder(selectedOrder)"
              class="rounded-xl border-2 border-red-600 px-6 py-3 font-bold text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const supabase = useSupabaseClient()

const orders = ref<any[]>([])
const stores = ref<any[]>([])
const processing = ref<Set<string>>(new Set())
const realtimeChannel = ref<RealtimeChannel | null>(null)

const searchQuery = ref('')
const storeFilter = ref('')
const paymentFilter = ref('')
const viewMode = ref<'kanban' | 'table'>('kanban')

const selectedOrder = ref<any>(null)

const kanbanColumns = [
  { status: 'awaiting_call', title: 'Awaiting Call' },
  { status: 'processing', title: 'Confirmed' },
  { status: 'packaging', title: 'Packaging' },
  { status: 'ready_for_pickup', title: 'Ready for Rider' },
  { status: 'out_for_delivery', title: 'Out for Delivery' }
]

const statusWorkflow: Record<string, string> = {
  'awaiting_call': 'processing',
  'processing': 'packaging',
  'packaging': 'ready_for_pickup',
  'ready_for_pickup': 'out_for_delivery',
  'out_for_delivery': 'delivered'
}

const statusLabels: Record<string, string> = {
  'awaiting_call': 'Confirm Order',
  'processing': 'Start Packaging',
  'packaging': 'Ready for Pickup',
  'ready_for_pickup': 'Assign Rider',
  'out_for_delivery': 'Mark Delivered'
}

const filteredOrders = computed(() => {
  return orders.value.filter(order => {
    const matchesSearch = !searchQuery.value || 
      order.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      order.delivery_details?.contactPhone?.includes(searchQuery.value)
    
    const matchesStore = !storeFilter.value || order.store_id === storeFilter.value
    const matchesPayment = !paymentFilter.value || order.payment_method === paymentFilter.value
    
    return matchesSearch && matchesStore && matchesPayment
  })
})

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-NG').format(num)
}

const getTimeElapsed = (createdAt: string) => {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const getOrdersByStatus = (status: string) => {
  return filteredOrders.value.filter(o => o.status === status)
}

const getNextStatus = (currentStatus: string) => {
  return statusWorkflow[currentStatus] || currentStatus
}

const getNextStatusLabel = (currentStatus: string) => {
  return statusLabels[currentStatus] || 'Update'
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'awaiting_call': 'bg-orange-100 text-orange-700',
    'processing': 'bg-blue-100 text-blue-700',
    'packaging': 'bg-purple-100 text-purple-700',
    'ready_for_pickup': 'bg-yellow-100 text-yellow-700',
    'out_for_delivery': 'bg-indigo-100 text-indigo-700',
    'delivered': 'bg-green-100 text-green-700',
    'cancelled': 'bg-red-100 text-red-700'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

const getProgressPercentage = (status: string) => {
  const percentages: Record<string, number> = {
    'awaiting_call': 10,
    'processing': 30,
    'packaging': 50,
    'ready_for_pickup': 70,
    'out_for_delivery': 90
  }
  return percentages[status] || 0
}

const fetchOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      stores!store_id(name)
    `)
    .in('status', ['awaiting_call', 'processing', 'packaging', 'ready_for_pickup', 'out_for_delivery'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching orders:', error)
    return
  }

  // Get unique store IDs and user IDs for lookup
  const storeIds = [...new Set((data as any[])?.map((o: any) => o.store_id).filter(Boolean))]
  const userIds = [...new Set((data as any[])?.map((o: any) => o.user_id).filter(Boolean))]

  // Fetch store names (skip if no orders)
  const storeMap: Record<string, string> = {}
  if (storeIds.length > 0) {
    const { data: storesData } = await supabase
      .from('stores')
      .select('id, name')
      .in('id', storeIds) as any
    Object.assign(storeMap, Object.fromEntries((storesData || []).map((s: any) => [s.id, s.name])))
  }

  // Fetch user profiles (skip if no orders)
  const profileMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', userIds) as any
    Object.assign(profileMap, Object.fromEntries((profilesData || []).map((p: any) => [p.id, p])))
  }

  orders.value = (data || []).map((order: any) => ({
    ...order,
    store_name: storeMap[order.store_id] || order.stores?.name,
    customer_name: order.contact_name || profileMap[order.user_id]?.full_name,
    customer_phone: order.contact_phone || profileMap[order.user_id]?.phone,
    item_count: Array.isArray(order.items) ? order.items.length : 0
  }))
}

const fetchStores = async () => {
  const { data } = await supabase.from('stores').select('id, name').eq('is_active', true)
  if (data) stores.value = data
}

const updateStatus = async (order: any, newStatus: string) => {
  processing.value.add(order.id)

  const { error } = await (supabase as any)
    .from('orders')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id)

  if (!error) {
    await fetchOrders()
    if (selectedOrder.value?.id === order.id) {
      selectedOrder.value.status = newStatus
    }
  }

  processing.value.delete(order.id)
}

const cancelOrder = async (order: any) => {
  processing.value.add(order.id)

  const { error } = await (supabase as any)
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', order.id)

  if (!error) {
    await fetchOrders()
    selectedOrder.value = null
  }

  processing.value.delete(order.id)
}

const openOrderDetails = (order: any) => {
  selectedOrder.value = order
}

const setupRealtime = () => {
  realtimeChannel.value = supabase
    .channel('active-orders')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => {
        fetchOrders()
      }
    )
    .subscribe()
}

onMounted(() => {
  fetchOrders()
  fetchStores()
  setupRealtime()
})

onUnmounted(() => {
  realtimeChannel.value?.unsubscribe()
})
</script>
