<template>
  <div>
    <!-- Inventory Stats -->
    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">Total Products</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ stats.totalProducts }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">In Stock</p>
        <p class="mt-1 text-2xl font-bold text-green-600">{{ stats.inStock }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">Low Stock</p>
        <p class="mt-1 text-2xl font-bold text-orange-600">{{ stats.lowStock }}</p>
      </div>
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-gray-600">Out of Stock</p>
        <p class="mt-1 text-2xl font-bold text-red-600">{{ stats.outOfStock }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
      <div class="flex-1 min-w-[200px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search products..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
        />
      </div>
      
      <select v-model="storeFilter" class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none">
        <option value="">All Stores</option>
        <option v-for="store in stores" :key="store.id" :value="store.id">
          {{ store.name }}
        </option>
      </select>

      <select v-model="statusFilter" class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none">
        <option value="">All Status</option>
        <option value="in_stock">In Stock</option>
        <option value="low_stock">Low Stock</option>
        <option value="out_of_stock">Out of Stock</option>
      </select>

      <button 
        @click="fetchInventory"
        class="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </button>
    </div>

    <!-- Inventory Grid -->
    <div class="rounded-xl bg-white shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Store</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stock Level</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Updated</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in filteredInventory" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <img 
                    v-if="item.product?.image_url" 
                    :src="item.product.image_url" 
                    class="h-10 w-10 rounded-lg object-cover"
                    alt=""
                  />
                  <div v-else class="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <span class="text-gray-400">📦</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ item.product?.name || 'Unknown' }}</p>
                    <p class="text-xs text-gray-500">{{ item.product?.category }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">{{ item.store?.name || 'All Stores' }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <input
                    v-model="item.quantity"
                    type="number"
                    min="0"
                    class="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-center"
                    @change="updateStock(item)"
                  />
                  <span class="text-xs text-gray-500">units</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span 
                  class="rounded-full px-2 py-1 text-xs font-bold"
                  :class="getStatusClass(item)"
                >
                  {{ getStatusLabel(item) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ formatTime(item.updated_at) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    @click="toggleAvailability(item)"
                    :class="item.is_available 
                      ? 'rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-200'
                      : 'rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200'"
                  >
                    {{ item.is_available ? 'Available' : 'Unavailable' }}
                  </button>
                  <button
                    v-if="item.quantity <= 5 && item.quantity > 0"
                    @click="restockItem(item)"
                    class="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-200"
                  >
                    Restock
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredInventory.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                No inventory items found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div class="mt-6 rounded-xl bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-bold text-gray-900">Bulk Actions</h3>
      <div class="flex flex-wrap gap-3">
        <button
          @click="markAllOutOfStock"
          class="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200"
        >
          Mark Low Stock as Out of Stock
        </button>
        <button
          @click="exportInventory"
          class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
        >
          Export Inventory Report
        </button>
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

const inventory = ref<any[]>([])
const stores = ref<any[]>([])
const searchQuery = ref('')
const storeFilter = ref('')
const statusFilter = ref('')
const processing = ref<Set<string>>(new Set())

const stats = computed(() => {
  const total = inventory.value.length
  const inStock = inventory.value.filter(i => i.is_available && i.quantity > 5).length
  const lowStock = inventory.value.filter(i => i.is_available && i.quantity > 0 && i.quantity <= 5).length
  const outOfStock = inventory.value.filter(i => !i.is_available || i.quantity === 0).length
  return { totalProducts: total, inStock, lowStock, outOfStock }
})

const filteredInventory = computed(() => {
  return inventory.value.filter(item => {
    const matchesSearch = !searchQuery.value ||
      item.product?.name?.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesStore = !storeFilter.value || item.store_id === storeFilter.value
    
    let matchesStatus = true
    if (statusFilter.value === 'in_stock') {
      matchesStatus = item.is_available && item.quantity > 5
    } else if (statusFilter.value === 'low_stock') {
      matchesStatus = item.is_available && item.quantity > 0 && item.quantity <= 5
    } else if (statusFilter.value === 'out_of_stock') {
      matchesStatus = !item.is_available || item.quantity === 0
    }
    
    return matchesSearch && matchesStore && matchesStatus
  })
})

const formatTime = (timestamp: string) => {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString('en-NG', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getStatusClass = (item: any) => {
  if (!item.is_available || item.quantity === 0) return 'bg-red-100 text-red-700'
  if (item.quantity <= 5) return 'bg-orange-100 text-orange-700'
  return 'bg-green-100 text-green-700'
}

const getStatusLabel = (item: any) => {
  if (!item.is_available || item.quantity === 0) return 'Out of Stock'
  if (item.quantity <= 5) return 'Low Stock'
  return 'In Stock'
}

const fetchStores = async () => {
  const { data } = await supabase.from('stores').select('id, name').eq('is_active', true)
  if (data) stores.value = data
}

const fetchInventory = async () => {
  const { data, error } = await supabase
    .from('store_inventory')
    .select(`
      *,
      product:products(id, name, image_url, category_id),
      store:stores(id, name)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching inventory:', error)
    return
  }

  inventory.value = (data || []).map((item: any) => ({
    ...item,
    quantity: item.available_stock || 0,
    is_available: item.is_visible !== false
  }))
}

const updateStock = async (item: any) => {
  if (processing.value.has(item.id)) return
  processing.value.add(item.id)

  const { error } = await (supabase as any)
    .from('store_inventory')
    .update({
      stock_level: Math.max(0, parseInt(item.quantity) || 0),
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)

  if (!error) {
    item.updated_at = new Date().toISOString()
  }

  processing.value.delete(item.id)
}

const toggleAvailability = async (item: any) => {
  if (processing.value.has(item.id)) return
  processing.value.add(item.id)

  const newVisibility = !item.is_available

  const { error } = await (supabase as any)
    .from('store_inventory')
    .update({
      is_visible: newVisibility,
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)

  if (!error) {
    item.is_available = newVisibility
    item.updated_at = new Date().toISOString()
  }

  processing.value.delete(item.id)
}

const restockItem = async (item: any) => {
  const newQuantity = prompt(`Enter new quantity for ${item.product?.name}:`, String(item.quantity + 10))
  if (newQuantity === null) return

  const quantity = parseInt(newQuantity)
  if (isNaN(quantity) || quantity < 0) {
    alert('Invalid quantity')
    return
  }

  item.quantity = quantity
  await updateStock(item)
}

const markAllOutOfStock = async () => {
  if (!confirm('Mark all low stock items as out of stock?')) return

  const lowStockItems = inventory.value.filter(i => i.quantity <= 5 && i.quantity > 0)
  
  for (const item of lowStockItems) {
    await (supabase as any)
      .from('store_inventory')
      .update({
        is_visible: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
    
    item.is_available = false
  }

  alert(`${lowStockItems.length} items marked as out of stock`)
}

const exportInventory = () => {
  const csv = [
    ['Product', 'Store', 'Quantity', 'Status', 'Last Updated'].join(','),
    ...inventory.value.map(item => [
      item.product?.name || 'Unknown',
      item.store?.name || 'All Stores',
      item.quantity,
      getStatusLabel(item),
      formatTime(item.updated_at)
    ].join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  fetchInventory()
  fetchStores()
})
</script>
