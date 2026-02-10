<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Database } from '~/types/database.types'

useHead({
  title: 'Staff Management - HomeAffairs Admin'
})

definePageMeta({
  layout: 'admin',
  middleware: ['super-admin']
})

const supabase = useSupabaseClient<Database>()
const toast = useToast()
const auditLog = useAuditLog()

// State
const loading = ref(false)
const users = ref<any[]>([])
const stores = ref<Database['public']['Tables']['stores']['Row'][]>([])
const searchQuery = ref('')
const roleFilter = ref<string>('all')

// Create user modal
const showCreateModal = ref(false)
const createForm = ref({
  email: '',
  password: '',
  fullName: '',
  phone: '',
  role: 'staff' as 'staff' | 'branch_manager' | 'super_admin' | 'customer',
  managedStoreIds: [] as string[]
})

// Edit user modal
const showEditModal = ref(false)
const editingUser = ref<any>(null)
const editForm = ref({
  fullName: '',
  phone: '',
  role: 'staff' as string,
  managedStoreIds: [] as string[]
})

// Computed
const filteredUsers = computed(() => {
  let filtered = users.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user =>
      user.full_name?.toLowerCase().includes(query) ||
      user.user_email?.toLowerCase().includes(query) ||
      user.phone_number?.includes(query)
    )
  }

  // Role filter
  if (roleFilter.value !== 'all') {
    filtered = filtered.filter(user => user.role === roleFilter.value)
  }

  return filtered
})

const roleOptions = [
  { value: 'customer', label: 'Customer', description: 'Regular customer with no admin access' },
  { value: 'staff', label: 'Staff', description: 'Store staff with basic operations access' },
  { value: 'branch_manager', label: 'Branch Manager', description: 'Manager with access to assigned stores' },
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access across all stores' }
]

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchStores()
  ])
})

// Methods
const fetchUsers = async () => {
  loading.value = true
  try {
    // Fetch all profiles with user auth data
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_email:id
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch email addresses from auth.users (requires admin access)
    const userIds = data?.map(p => p.id) || []
    
    // Get emails via admin API or stored metadata
    // For now, we'll use a workaround - store email in metadata
    users.value = data || []

  } catch (err: any) {
    console.error('Error fetching users:', err)
    toast.add({
      title: 'Error',
      description: 'Failed to load users',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const fetchStores = async () => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    stores.value = data || []
  } catch (err: any) {
    console.error('Error fetching stores:', err)
  }
}

const openCreateModal = () => {
  createForm.value = {
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'staff',
    managedStoreIds: []
  }
  showCreateModal.value = true
}

const createUser = async () => {
  loading.value = true
  try {
    // Create user via Supabase Auth Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: createForm.value.email,
      password: createForm.value.password,
      email_confirm: true,
      user_metadata: {
        full_name: createForm.value.fullName,
        phone: createForm.value.phone,
        role: createForm.value.role,
        managed_store_ids: createForm.value.managedStoreIds
      }
    })

    if (authError) throw authError

    // Update profile with role and managed stores
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: createForm.value.fullName,
        phone_number: createForm.value.phone,
        role: createForm.value.role,
        managed_store_ids: createForm.value.managedStoreIds.length > 0 ? createForm.value.managedStoreIds : null
      })
      .eq('id', authData.user.id)

    if (profileError) throw profileError

    toast.add({
      title: 'User Created',
      description: `${createForm.value.fullName} has been added successfully`,
      color: 'success'
    })

    showCreateModal.value = false
    await fetchUsers()

  } catch (err: any) {
    console.error('Error creating user:', err)
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to create user',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const openEditModal = (user: any) => {
  editingUser.value = user
  editForm.value = {
    fullName: user.full_name || '',
    phone: user.phone_number || '',
    role: user.role || 'staff',
    managedStoreIds: user.managed_store_ids || []
  }
  showEditModal.value = true
}

const updateUser = async () => {
  if (!editingUser.value) return

  loading.value = true
  try {
    const oldStoreIds = editingUser.value.managed_store_ids || []
    const newStoreIds = editForm.value.managedStoreIds

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.value.fullName,
        phone_number: editForm.value.phone,
        role: editForm.value.role,
        managed_store_ids: newStoreIds.length > 0 ? newStoreIds : null
      })
      .eq('id', editingUser.value.id)

    if (updateError) throw updateError

    // Log manager assignment change if stores changed
    if (JSON.stringify(oldStoreIds.sort()) !== JSON.stringify(newStoreIds.sort())) {
      await auditLog.logManagerAssignment(
        editingUser.value.id,
        oldStoreIds,
        newStoreIds,
        editForm.value.fullName
      )
    }

    toast.add({
      title: 'User Updated',
      description: 'User assignment has been updated successfully',
      color: 'success'
    })

    showEditModal.value = false
    await fetchUsers()

  } catch (err: any) {
    console.error('Error updating user:', err)
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to update user',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const getStoreName = (storeId: string) => {
  return stores.value.find(s => s.id === storeId)?.name || 'Unknown Store'
}

const getRoleBadgeColor = (role: string) => {
  const colors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
    branch_manager: 'bg-blue-100 text-blue-800 border-blue-200',
    staff: 'bg-green-100 text-green-800 border-green-200',
    customer: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
}

const getRoleLabel = (role: string) => {
  const option = roleOptions.find(r => r.value === role)
  return option?.label || role
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Staff Management</h1>
            <p class="text-sm text-gray-600 mt-1">Manage users, roles, and store assignments</p>
          </div>
          <button
            @click="openCreateModal"
            class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create User
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name, email, or phone..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <!-- Role Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
            <select
              v-model="roleFilter"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Roles</option>
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Stores</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ user.full_name || 'No Name' }}</p>
                    <p class="text-xs text-gray-500">{{ user.phone_number || 'No phone' }}</p>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span :class="`inline-flex px-2 py-1 text-xs font-medium rounded border ${getRoleBadgeColor(user.role)}`">
                    {{ getRoleLabel(user.role) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div v-if="user.managed_store_ids && user.managed_store_ids.length > 0" class="flex flex-wrap gap-1">
                    <span
                      v-for="storeId in user.managed_store_ids"
                      :key="storeId"
                      class="inline-flex px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                    >
                      {{ getStoreName(storeId) }}
                    </span>
                  </div>
                  <span v-else class="text-sm text-gray-400">No stores assigned</span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {{ formatDate(user.created_at) }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    @click="openEditModal(user)"
                    class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit Assignment
                  </button>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Create New User</h3>
        </div>

        <div class="p-6 space-y-4">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              v-model="createForm.email"
              type="email"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="user@homeaffairs.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              v-model="createForm.password"
              type="password"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Minimum 6 characters"
            />
          </div>

          <!-- Full Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              v-model="createForm.fullName"
              type="text"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="John Doe"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              v-model="createForm.phone"
              type="tel"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="+234 XXX XXX XXXX"
            />
          </div>

          <!-- Role -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              v-model="createForm.role"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }} - {{ option.description }}
              </option>
            </select>
          </div>

          <!-- Store Assignment (for branch managers) -->
          <div v-if="createForm.role === 'branch_manager'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Assign Stores *</label>
            <div class="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
              <label
                v-for="store in stores"
                :key="store.id"
                class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="store.id"
                  v-model="createForm.managedStoreIds"
                  class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">{{ store.name }}</p>
                  <p class="text-xs text-gray-500">{{ store.address }}</p>
                </div>
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">Select one or more stores for this manager to oversee</p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            @click="showCreateModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="createUser"
            :disabled="loading || !createForm.email || !createForm.password || !createForm.fullName"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Creating...' : 'Create User' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal && editingUser" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Update User Assignment</h3>
          <p class="text-sm text-gray-600">{{ editingUser.full_name }}</p>
        </div>

        <div class="p-6 space-y-4">
          <!-- Full Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              v-model="editForm.fullName"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              v-model="editForm.phone"
              type="tel"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <!-- Role -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              v-model="editForm.role"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Store Assignment -->
          <div v-if="editForm.role === 'branch_manager'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Assign Stores</label>
            <div class="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
              <label
                v-for="store in stores"
                :key="store.id"
                class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="store.id"
                  v-model="editForm.managedStoreIds"
                  class="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">{{ store.name }}</p>
                  <p class="text-xs text-gray-500">{{ store.code }}</p>
                </div>
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">Manager can oversee multiple stores ("floater" managers)</p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            @click="showEditModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="updateUser"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Updating...' : 'Update Assignment' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
