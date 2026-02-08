<template>
  <div class="min-h-screen bg-gray-100">
    <AppHeader />
    
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Verification Queue</h1>
          <p class="mt-1 text-sm text-gray-600">
            Manual call verification for Pay on Delivery orders
          </p>
        </div>
        
        <!-- My Stats -->
        <div class="flex gap-3">
          <div class="rounded-xl bg-white px-4 py-2 shadow-sm">
            <p class="text-xs text-gray-500">My Verifications Today</p>
            <p class="text-xl font-bold text-green-600">{{ myVerificationsToday }}</p>
          </div>
          <div class="rounded-xl bg-white px-4 py-2 shadow-sm">
            <p class="text-xs text-gray-500">Avg. Response Time</p>
            <p class="text-xl font-bold text-blue-600">{{ avgResponseTime }}m</p>
          </div>
        </div>
      </div>

      <!-- SLA Alert -->
      <div v-if="overdueOrders.length > 0" class="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4">
        <div class="flex items-center gap-2">
          <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-bold text-red-900">{{ overdueOrders.length }} orders over 3-minute SLA!</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-6 flex flex-wrap gap-3">
        <button 
          @click="filter = 'all'"
          :class="filter === 'all' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'"
          class="rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition"
        >
          All Pending ({{ pendingOrders.length }})
        </button>
        <button 
          @click="filter = 'unclaimed'"
          :class="filter === 'unclaimed' ? 'bg-amber-600 text-white' : 'bg-white text-gray-700'"
          class="rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition"
        >
          Unclaimed ({{ unclaimedOrders.length }})
        </button>
        <button 
          @click="filter = 'my_orders'"
          :class="filter === 'my_orders' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'"
          class="rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition"
        >
          My Orders ({{ myOrders.length }})
        </button>
        <button 
          @click="loadOrders"
          class="ml-auto flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <!-- Orders Table -->
      <div class="rounded-xl bg-white shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">SLA</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Store</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr v-for="order in filteredOrders" :key="order.id" :class="getRowClass(order)">
                <!-- SLA Timer -->
                <td class="whitespace-nowrap px-4 py-3">
                  <SLATimer :order="order" />
                </td>
                
                <!-- Claim Status -->
                <td class="whitespace-nowrap px-4 py-3">
                  <span 
                    v-if="order.claimed_by"
                    class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                    :class="order.claimed_by === currentUserId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'"
                  >
                    <span v-if="order.claimed_by === currentUserId">✓ You</span>
                    <span v-else>👤 {{ getStaffName(order.claimed_by) }}</span>
                  </span>
                  <span v-else class="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                    🔓 Available
                  </span>
                </td>
                
                <!-- Customer -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="font-medium text-gray-900">{{ order.contact_name }}</p>
                  <p class="text-xs text-gray-500">{{ order.id?.slice(-8) }}</p>
                </td>
                
                <!-- Phone -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="font-mono text-sm text-gray-900">{{ order.contact_phone }}</p>
                  <p v-if="order.call_attempt_count > 0" class="text-xs text-red-600">
                    {{ order.call_attempt_count }} attempt(s) failed
                  </p>
                </td>
                
                <!-- Order Details -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="font-bold text-gray-900">{{ formatPrice(order.total_amount) }}</p>
                  <p class="text-xs text-gray-500 capitalize">{{ order.delivery_method }}</p>
                </td>
                
                <!-- Store -->
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="text-sm text-gray-900">{{ order.store?.name || 'Unknown' }}</p>
                </td>
                
                <!-- Actions -->
                <td class="whitespace-nowrap px-4 py-3">
                  <div class="flex items-center gap-2">
                    <!-- Claim Button -->
                    <button
                      v-if="!order.claimed_by"
                      @click="claimOrder(order.id)"
                      :disabled="claiming[order.id]"
                      class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {{ claiming[order.id] ? '...' : 'Claim' }}
                    </button>
                    
                    <!-- Dial Button -->
                    <a
                      v-if="order.claimed_by === currentUserId"
                      :href="`tel:${order.contact_phone}`"
                      @click="recordCallAttempt(order.id)"
                      class="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                    >
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Dial
                    </a>
                    
                    <!-- Verify Button -->
                    <button
                      v-if="order.claimed_by === currentUserId"
                      @click="verifyOrder(order.id)"
                      :disabled="verifying[order.id]"
                      class="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {{ verifying[order.id] ? '...' : 'Verify' }}
                    </button>
                    
                    <!-- Reject Button -->
                    <button
                      v-if="order.claimed_by === currentUserId"
                      @click="openRejectModal(order)"
                      :disabled="rejecting[order.id]"
                      class="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-200 disabled:bg-gray-100"
                    >
                      Reject
                    </button>
                    
                    <!-- Release Button (if claimed by me) -->
                    <button
                      v-if="order.claimed_by === currentUserId"
                      @click="releaseOrder(order.id)"
                      class="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      title="Release to queue"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredOrders.length === 0">
                <td colspan="7" class="px-6 py-8 text-center text-sm text-gray-500">
                  No orders in this queue.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Queue Stats -->
      <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-xl bg-white p-4 shadow-sm">
          <p class="text-xs text-gray-500">Total Pending</p>
          <p class="text-2xl font-bold text-gray-900">{{ pendingOrders.length }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm">
          <p class="text-xs text-gray-500">Unclaimed</p>
          <p class="text-2xl font-bold text-amber-600">{{ unclaimedOrders.length }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm">
          <p class="text-xs text-gray-500">Being Handled</p>
          <p class="text-2xl font-bold text-blue-600">{{ claimedOrders.length }}</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm">
          <p class="text-xs text-gray-500">Over SLA (>3m)</p>
          <p class="text-2xl font-bold text-red-600">{{ overdueOrders.length }}</p>
        </div>
      </div>
    </main>

    <!-- Reject Modal -->
    <div v-if="rejectModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 class="text-lg font-bold text-gray-900">Reject Order</h3>
        <p class="mt-2 text-sm text-gray-600">
          Order #{{ selectedOrder?.id?.slice(-8) }} - {{ selectedOrder?.contact_name }}
        </p>
        
        <div class="mt-4 space-y-3">
          <label class="block text-sm font-medium text-gray-700">Reason for rejection</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition" 
                   :class="rejectReason === 'no_answer' ? 'border-red-300 bg-red-50' : 'border-gray-200'">
              <input v-model="rejectReason" type="radio" value="no_answer" class="text-red-600">
              <span class="text-sm">Customer didn't pick up</span>
            </label>
            <label class="flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition"
                   :class="rejectReason === 'cancelled_during_call' ? 'border-red-300 bg-red-50' : 'border-gray-200'">
              <input v-model="rejectReason" type="radio" value="cancelled_during_call" class="text-red-600">
              <span class="text-sm">Order cancelled during call</span>
            </label>
            <label class="flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition"
                   :class="rejectReason === 'invalid_items' ? 'border-red-300 bg-red-50' : 'border-gray-200'">
              <input v-model="rejectReason" type="radio" value="invalid_items" class="text-red-600">
              <span class="text-sm">Invalid/out of stock items</span>
            </label>
            <label class="flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition"
                   :class="rejectReason === 'wrong_phone' ? 'border-red-300 bg-red-50' : 'border-gray-200'">
              <input v-model="rejectReason" type="radio" value="wrong_phone" class="text-red-600">
              <span class="text-sm">Wrong phone number</span>
            </label>
            <label class="flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition"
                   :class="rejectReason === 'other' ? 'border-red-300 bg-red-50' : 'border-gray-200'">
              <input v-model="rejectReason" type="radio" value="other" class="text-red-600">
              <span class="text-sm">Other</span>
            </label>
          </div>
          
          <div v-if="rejectReason === 'other'">
            <label class="block text-sm font-medium text-gray-700">Details</label>
            <textarea 
              v-model="rejectDetails" 
              rows="2"
              class="mt-1 w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:border-red-600 focus:outline-none"
              placeholder="Please provide more details..."
            ></textarea>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button 
            @click="rejectModalOpen = false"
            class="flex-1 rounded-xl border-2 border-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            @click="rejectOrder"
            :disabled="!rejectReason || rejectingSubmit"
            class="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700 disabled:bg-gray-400"
          >
            {{ rejectingSubmit ? 'Rejecting...' : 'Reject Order' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Order {
  id: string
  status: string
  contact_name: string
  contact_phone: string
  total_amount: number
  delivery_method: string
  created_at: string
  claimed_by: string | null
  claimed_at: string | null
  call_attempt_count: number
  last_call_attempt_at: string
  store?: { name: string }
}

// SLATimer Component
const SLATimer = defineComponent({
  props: ['order'],
  setup(props) {
    const elapsed = ref(0)
    let interval: any
    
    const isOverdue = computed(() => elapsed.value > 180) // 3 minutes = 180 seconds
    
    const displayTime = computed(() => {
      const mins = Math.floor(elapsed.value / 60)
      const secs = elapsed.value % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    })
    
    onMounted(() => {
      const created = new Date(props.order.created_at).getTime()
      interval = setInterval(() => {
        elapsed.value = Math.floor((Date.now() - created) / 1000)
      }, 1000)
    })
    
    onUnmounted(() => {
      clearInterval(interval)
    })
    
    return { displayTime, isOverdue }
  },
  template: `
    <div class="flex flex-col">
      <span :class="isOverdue ? 'text-red-600 font-bold' : 'text-gray-900'">{{ displayTime }}</span>
      <span v-if="isOverdue" class="text-xs text-red-600">OVER SLA!</span>
    </div>
  `
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const currentUserId = computed(() => user.value?.id)

const loading = ref(false)
const filter = ref<'all' | 'unclaimed' | 'my_orders'>('all')
const pendingOrders = ref<Order[]>([])
const claiming = ref<Record<string, boolean>>({})
const verifying = ref<Record<string, boolean>>({})
const rejecting = ref<Record<string, boolean>>({})
const rejectingSubmit = ref(false)
const rejectModalOpen = ref(false)
const selectedOrder = ref<Order | null>(null)
const rejectReason = ref('')
const rejectDetails = ref('')

// Staff names cache
const staffNames = ref<Record<string, string>>({})

// Stats
const myVerificationsToday = ref(0)
const avgResponseTime = ref(0)

const unclaimedOrders = computed(() => 
  pendingOrders.value.filter(o => !o.claimed_by)
)

const claimedOrders = computed(() => 
  pendingOrders.value.filter(o => o.claimed_by)
)

const myOrders = computed(() => 
  pendingOrders.value.filter(o => o.claimed_by === currentUserId.value)
)

const overdueOrders = computed(() => 
  pendingOrders.value.filter(o => {
    const created = new Date(o.created_at).getTime()
    const elapsed = (Date.now() - created) / 1000
    return elapsed > 180 // 3 minutes
  })
)

const filteredOrders = computed(() => {
  let orders = pendingOrders.value
  
  switch (filter.value) {
    case 'unclaimed':
      orders = unclaimedOrders.value
      break
    case 'my_orders':
      orders = myOrders.value
      break
  }
  
  // Sort by created_at (oldest first) and then by SLA urgency
  return orders.sort((a, b) => {
    const aOverdue = (Date.now() - new Date(a.created_at).getTime()) > 180000
    const bOverdue = (Date.now() - new Date(b.created_at).getTime()) > 180000
    
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
})

function formatPrice(price: number): string {
  return '₦' + price?.toLocaleString('en-NG') || '0'
}

function getRowClass(order: Order): string {
  const created = new Date(order.created_at).getTime()
  const elapsed = (Date.now() - created) / 1000
  
  if (elapsed > 300) return 'bg-red-50' // > 5 min
  if (elapsed > 180) return 'bg-amber-50' // > 3 min
  return ''
}

function getStaffName(userId: string): string {
  return staffNames.value[userId] || 'Staff'
}

async function loadOrders() {
  loading.value = true
  
  const { data, error } = await supabase
    .from('orders')
    .select('*, store:stores(name)')
    .in('status', ['awaiting_call', 'processing', 'packaging', 'ready_for_pickup', 'out_for_delivery'])
    .order('created_at', { ascending: true })
  
  if (!error && data) {
    pendingOrders.value = data as Order[]
  }
  
  loading.value = false
}

async function claimOrder(orderId: string) {
  claiming.value[orderId] = true
  
  const { data, error } = await supabase.rpc('claim_order', {
    p_order_id: orderId
  } as any)
  
  claiming.value[orderId] = false
  
  if (!error && data) {
    await loadOrders()
  } else {
    alert('Could not claim order. It may have been claimed by another staff member.')
  }
}

async function releaseOrder(orderId: string) {
  const updateData: any = {
    claimed_by: null,
    claimed_at: null
  }
  const { error } = await supabase
    .from('orders')
    // @ts-ignore
    .update(updateData)
    .eq('id', orderId)
    .eq('claimed_by', currentUserId.value)
  
  if (!error) {
    await loadOrders()
  }
}

async function recordCallAttempt(orderId: string) {
  await supabase.rpc('record_call_attempt', {
    p_order_id: orderId
  } as any)
}

async function verifyOrder(orderId: string) {
  verifying.value[orderId] = true
  
  const { data, error } = await supabase.rpc('verify_order', {
    p_order_id: orderId,
    p_method: 'phone_call'
  } as any)
  
  verifying.value[orderId] = false
  
  if (!error && data) {
    await loadOrders()
  } else {
    alert('Failed to verify order')
  }
}

function openRejectModal(order: Order) {
  selectedOrder.value = order
  rejectReason.value = ''
  rejectDetails.value = ''
  rejectModalOpen.value = true
}

async function rejectOrder() {
  if (!selectedOrder.value || !rejectReason.value) return
  
  rejectingSubmit.value = true
  
  const { data, error } = await supabase.rpc('reject_order', {
    p_order_id: selectedOrder.value.id,
    p_reason: rejectReason.value,
    p_details: rejectDetails.value || null
  } as any)
  
  rejectingSubmit.value = false
  rejectModalOpen.value = false
  
  if (!error && data) {
    await loadOrders()
  } else {
    alert('Failed to reject order')
  }
}

// Real-time subscription for new orders
let subscription: any = null

function setupRealtimeSubscription() {
  subscription = supabase
    .channel('verification-queue')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders'
      },
      () => {
        loadOrders()
      }
    )
    .subscribe()
}

onMounted(() => {
  loadOrders()
  setupRealtimeSubscription()
  
  // Auto-refresh every 30 seconds
  setInterval(loadOrders, 30000)
})

onUnmounted(() => {
  if (subscription) {
    supabase.removeChannel(subscription)
  }
})

definePageMeta({ 
  middleware: ['auth'],
  layout: 'admin'
})
</script>
