<template>
  <div class="max-w-4xl mx-auto">
    <h2 class="mb-6 text-2xl font-bold text-gray-900">Store Settings</h2>
    
    <!-- Store Selection -->
    <div class="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <label class="mb-2 block text-sm font-medium text-gray-700">Select Store</label>
      <select 
        v-model="selectedStoreId" 
        class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
        @change="loadStoreSettings"
      >
        <option value="">Choose a store...</option>
        <option v-for="store in stores" :key="store.id" :value="store.id">
          {{ store.name }} - {{ store.location }}
        </option>
      </select>
    </div>

    <div v-if="selectedStore" class="space-y-6">
      <!-- Store Info Card -->
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-xl font-bold text-gray-900">{{ selectedStore.name }}</h3>
            <p class="mt-1 text-gray-600">{{ selectedStore.address }}</p>
            <div class="mt-2 flex items-center gap-2">
              <span 
                class="rounded-full px-2 py-1 text-xs font-bold"
                :class="selectedStore?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
              >
                {{ selectedStore?.isActive ? 'Active' : 'Inactive' }}
              </span>
              <span class="text-xs text-gray-500">ID: {{ selectedStore?.id?.slice(-8) }}</span>
            </div>
          </div>
          <button
            @click="toggleStoreStatus"
            :class="selectedStore?.isActive
              ? 'rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200'
              : 'rounded-lg bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-200'"
          >
            {{ selectedStore?.isActive ? 'Deactivate Store' : 'Activate Store' }}
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-xl bg-white p-4 shadow-sm text-center">
          <p class="text-2xl font-bold text-gray-900">{{ storeStats.ordersToday }}</p>
          <p class="text-sm text-gray-600">Orders Today</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm text-center">
          <p class="text-2xl font-bold text-gray-900">{{ storeStats.pendingVerification }}</p>
          <p class="text-sm text-gray-600">Pending Verification</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm text-center">
          <p class="text-2xl font-bold text-gray-900">{{ storeStats.lowStockItems }}</p>
          <p class="text-sm text-gray-600">Low Stock Items</p>
        </div>
      </div>

      <!-- Operating Hours -->
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <h4 class="mb-4 font-bold text-gray-900">Operating Hours</h4>
        <div class="space-y-3">
          <div v-for="day in weekDays" :key="day.key" class="flex items-center gap-4">
            <span class="w-24 text-sm font-medium text-gray-700">{{ day.label }}</span>
            <div class="flex items-center gap-2">
              <input
                :value="operatingHours[day.key]?.open || '08:00'"
                @input="e => updateHours(day.key, 'open', (e.target as HTMLInputElement).value)"
                type="time"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <span class="text-gray-500">to</span>
              <input
                :value="operatingHours[day.key]?.close || '20:00'"
                @input="e => updateHours(day.key, 'close', (e.target as HTMLInputElement).value)"
                type="time"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <label class="ml-4 flex items-center gap-2">
                <input
                  :checked="operatingHours[day.key]?.isOpen || false"
                  @change="e => updateHours(day.key, 'isOpen', (e.target as HTMLInputElement).checked)"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span class="text-sm text-gray-600">Open</span>
              </label>
            </div>
          </div>
        </div>
        <button
          @click="saveOperatingHours"
          class="mt-4 rounded-lg bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700"
        >
          Save Hours
        </button>
      </div>

      <!-- Delivery Settings -->
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <h4 class="mb-4 font-bold text-gray-900">Delivery Settings</h4>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Base Delivery Fee (₦)</label>
            <input
              v-model="settings.deliveryFee"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Free Delivery Threshold (₦)</label>
            <input
              v-model="settings.freeDeliveryThreshold"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Min Order Amount (₦)</label>
            <input
              v-model="settings.minOrderAmount"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Max Delivery Distance (km)</label>
            <input
              v-model="settings.maxDeliveryDistance"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>
        <button
          @click="saveDeliverySettings"
          class="mt-4 rounded-lg bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700"
        >
          Save Settings
        </button>
      </div>

      <!-- Notification Preferences -->
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <h4 class="mb-4 font-bold text-gray-900">Notification Preferences</h4>
        <div class="space-y-3">
          <label class="flex items-center gap-3">
            <input
              v-model="settings.notifyNewOrders"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span class="text-sm text-gray-700">Send notifications for new orders</span>
          </label>
          <label class="flex items-center gap-3">
            <input
              v-model="settings.notifyLowStock"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span class="text-sm text-gray-700">Alert when stock is low</span>
          </label>
          <label class="flex items-center gap-3">
            <input
              v-model="settings.notifyCancellations"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span class="text-sm text-gray-700">Notify on order cancellations</span>
          </label>
        </div>
      </div>

      <!-- Staff Management -->
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h4 class="font-bold text-gray-900">Store Staff</h4>
          <button
            @click="showAddStaffModal = true"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Add Staff
          </button>
        </div>
        <div class="divide-y divide-gray-200">
          <div v-for="staff in storeStaff" :key="staff.id" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <span class="font-bold text-red-600">{{ staff.email?.[0]?.toUpperCase() }}</span>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ staff.full_name || staff.email }}</p>
                <p class="text-xs text-gray-500 capitalize">{{ staff.role }}</p>
              </div>
            </div>
            <button
              v-if="staff.role !== 'admin'"
              @click="removeStaff(staff.id)"
              class="text-sm text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
          <p v-if="storeStaff.length === 0" class="py-4 text-center text-gray-500">
            No staff assigned to this store
          </p>
        </div>
      </div>
    </div>

    <!-- Add Staff Modal -->
    <div v-if="showAddStaffModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 class="text-lg font-bold text-gray-900">Add Staff Member</h3>
        <div class="mt-4 space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
            <input
              v-model="newStaffEmail"
              type="email"
              placeholder="staff@example.com"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select
              v-model="newStaffRole"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            >
              <option value="staff">Staff (Order Management)</option>
              <option value="manager">Manager (Full Access)</option>
            </select>
          </div>
        </div>
        <div class="mt-6 flex gap-3">
          <button
            @click="showAddStaffModal = false"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="addStaff"
            :disabled="!newStaffEmail"
            class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Add Staff
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const supabase = useSupabaseClient()

const stores = ref<any[]>([])
const selectedStoreId = ref('')
const selectedStore = computed(() => stores.value.find(s => s.id === selectedStoreId.value))

const storeStats = ref({
  ordersToday: 0,
  pendingVerification: 0,
  lowStockItems: 0
})

const storeStaff = ref<any[]>([])
const showAddStaffModal = ref(false)
const newStaffEmail = ref('')
const newStaffRole = ref('staff')

const weekDays = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

const updateHours = (day: string, field: 'open' | 'close' | 'isOpen', value: any) => {
  const hours = operatingHours.value[day]
  if (hours) (hours as any)[field] = value
}

const operatingHours = ref<Record<string, { open: string; close: string; isOpen: boolean }>>({
  monday: { open: '08:00', close: '20:00', isOpen: true },
  tuesday: { open: '08:00', close: '20:00', isOpen: true },
  wednesday: { open: '08:00', close: '20:00', isOpen: true },
  thursday: { open: '08:00', close: '20:00', isOpen: true },
  friday: { open: '08:00', close: '20:00', isOpen: true },
  saturday: { open: '09:00', close: '18:00', isOpen: true },
  sunday: { open: '10:00', close: '16:00', isOpen: false }
})

const settings = ref({
  deliveryFee: 500,
  freeDeliveryThreshold: 5000,
  minOrderAmount: 1000,
  maxDeliveryDistance: 10,
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyCancellations: true
})

const fetchStores = async () => {
  const { data } = await supabase.from('stores').select('*').order('name')
  if (data) stores.value = data
}

const loadStoreSettings = async () => {
  if (!selectedStoreId.value) return

  // Fetch store stats
  const today = new Date().toISOString().split('T')[0]
  
  const { count: ordersToday } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', selectedStoreId.value)
    .gte('created_at', today)

  const { count: pendingVerification } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', selectedStoreId.value)
    .eq('status', 'awaiting_call')

  const { count: lowStockItems } = await supabase
    .from('store_inventory')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', selectedStoreId.value)
    .lte('quantity', 5)
    .gt('quantity', 0)

  storeStats.value = {
    ordersToday: ordersToday || 0,
    pendingVerification: pendingVerification || 0,
    lowStockItems: lowStockItems || 0
  }

  // Load staff
  const { data: staffData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('store_id', selectedStoreId.value)

  if (staffData) storeStaff.value = staffData

  // Load operating hours from store metadata
  if (selectedStore.value?.metadata?.operatingHours) {
    operatingHours.value = { ...operatingHours.value, ...selectedStore.value.metadata.operatingHours }
  }
}

const toggleStoreStatus = async () => {
  if (!selectedStore.value) return

  const newStatus = !selectedStore.value.isActive
  
  const { error } = await (supabase as any)
    .from('stores')
    .update({ isActive: newStatus })
    .eq('id', selectedStoreId.value)

  if (!error) {
    selectedStore.value.isActive = newStatus
  }
}

const saveOperatingHours = async () => {
  const { error } = await (supabase as any)
    .from('stores')
    .update({
      metadata: {
        ...selectedStore.value?.metadata,
        operatingHours: operatingHours.value
      }
    })
    .eq('id', selectedStoreId.value)

  if (!error) {
    alert('Operating hours saved')
  }
}

const saveDeliverySettings = async () => {
  const { error } = await (supabase as any)
    .from('stores')
    .update({
      metadata: {
        ...selectedStore.value?.metadata,
        deliverySettings: settings.value
      }
    })
    .eq('id', selectedStoreId.value)

  if (!error) {
    alert('Delivery settings saved')
  }
}

const addStaff = async () => {
  // In a real implementation, this would send an invitation
  // For now, we'll just update the user's profile if they exist
  const { data: userData } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', newStaffEmail.value)
    .single()

  if (userData) {
    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        store_id: selectedStoreId.value,
        role: newStaffRole.value
      })
      .eq('id', (userData as any).id)

    if (!error) {
      showAddStaffModal.value = false
      newStaffEmail.value = ''
      loadStoreSettings()
    }
  } else {
    alert('User not found. They need to register first.')
  }
}

const removeStaff = async (staffId: string) => {
  if (!confirm('Remove this staff member?')) return

  const { error } = await (supabase as any)
    .from('profiles')
    .update({ store_id: null })
    .eq('id', staffId)

  if (!error) {
    loadStoreSettings()
  }
}

onMounted(() => {
  fetchStores()
})
</script>
