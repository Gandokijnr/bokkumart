<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Profile Header -->
      <div class="mb-8 rounded-2xl bg-gradient-to-r from-red-700 to-red-800 p-6 text-white shadow-lg sm:p-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl backdrop-blur-sm">
              {{ userInitials }}
            </div>
            <div>
              <h1 class="text-2xl font-bold">{{ profile?.full_name || 'Welcome Back' }}</h1>
              <p class="text-red-100">{{ user?.email }}</p>
            </div>
          </div>

          <!-- Profile Completion -->
          <div class="sm:text-right">
            <p class="text-sm text-red-100">Profile Completion</p>
            <div class="mt-1 flex items-center gap-2">
              <div class="h-2 w-32 overflow-hidden rounded-full bg-white/20">
                <div class="h-full rounded-full bg-yellow-400 transition-all" :style="{ width: profileCompletion + '%' }"></div>
              </div>
              <span class="text-sm font-bold text-yellow-400">{{ profileCompletion }}%</span>
            </div>
          </div>
        </div>

        <!-- Loyalty Tier Badge -->
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <span class="rounded-full bg-yellow-400/20 px-4 py-1.5 text-sm font-semibold text-yellow-300 backdrop-blur-sm">
            {{ loyaltyTier }} Member
          </span>
          <span v-if="loyaltyProgress.pointsToNextTier > 0" class="text-sm text-red-100">
            Only {{ formatCurrency(loyaltyProgress.pointsToNextTier) }} away from {{ loyaltyProgress.nextTier }}
          </span>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="mb-6 overflow-x-auto">
        <nav class="flex gap-2 border-b border-gray-200 pb-px">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors"
            :class="activeTab === tab.id 
              ? 'border-b-2 border-red-700 text-red-700' 
              : 'text-gray-500 hover:text-gray-700'"
          >
            <span>{{ tab.icon }}</span>
            {{ tab.label }}
            <span 
              v-if="tab.badge"
              class="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white"
            >
              {{ tab.badge }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="min-h-[400px]">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <!-- Quick Stats -->
          <div class="grid gap-4 sm:grid-cols-3">
            <!-- Loyalty Points Card -->
            <div class="rounded-2xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400 text-xl">🏆</div>
                <div>
                  <p class="text-sm text-gray-600">Loyalty Points</p>
                  <p class="text-2xl font-bold text-gray-900">{{ profile?.loyalty_points || 0 }}</p>
                </div>
              </div>
              <div class="mt-4">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-500">Progress to Free Delivery</span>
                  <span class="font-medium text-yellow-600">{{ loyaltyProgress.progressPercentage }}%</span>
                </div>
                <div class="mt-2 h-2 overflow-hidden rounded-full bg-yellow-200">
                  <div 
                    class="h-full rounded-full bg-yellow-500 transition-all duration-500"
                    :style="{ width: loyaltyProgress.progressPercentage + '%' }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Last Order Card -->
            <div class="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-5 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 text-xl text-white">📦</div>
                <div>
                  <p class="text-sm text-gray-600">Last Order</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ lastOrder ? formatOrderDate(lastOrder.created_at) : 'No orders yet' }}
                  </p>
                </div>
              </div>
              <div v-if="lastOrder" class="mt-3 flex items-center gap-2">
                <span 
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  :class="getStatusBadge(lastOrder.status).bg + ' ' + getStatusBadge(lastOrder.status).color"
                >
                  {{ getStatusBadge(lastOrder.status).label }}
                </span>
                <NuxtLink 
                  :to="`/order/pending-${lastOrder.id}`"
                  class="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  View Details →
                </NuxtLink>
              </div>
            </div>

            <!-- Primary Address Card -->
            <div class="rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl">📍</div>
                <div>
                  <p class="text-sm text-gray-600">Primary Address</p>
                  <p class="text-sm font-medium text-gray-900">
                    {{ primaryAddress ? getLabelDisplay(primaryAddress.label) : 'No address set' }}
                  </p>
                </div>
              </div>
              <p v-if="primaryAddress" class="mt-2 line-clamp-2 text-xs text-gray-500">
                {{ formatAddress(primaryAddress) }}
              </p>
              <button 
                v-else
                @click="activeTab = 'addresses'"
                class="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Add Address →
              </button>
            </div>
          </div>

          <!-- Active Orders -->
          <div v-if="activeOrders.length > 0" class="rounded-2xl border-2 border-red-200 bg-white p-6 shadow-sm">
            <h3 class="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs">⏱️</span>
              Active Orders ({{ activeOrders.length }})
            </h3>
            <div class="space-y-3">
              <div 
                v-for="order in activeOrders.slice(0, 2)" 
                :key="order.id"
                class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div>
                  <p class="font-bold text-gray-900">Order #{{ order.id.slice(-8) }}</p>
                  <p class="text-sm text-gray-500">{{ order.items.length }} items • {{ formatCurrency(order.total_amount) }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span 
                    class="rounded-full px-3 py-1 text-xs font-medium"
                    :class="getStatusBadge(order.status).bg + ' ' + getStatusBadge(order.status).color"
                  >
                    {{ getStatusBadge(order.status).label }}
                  </span>
                  <button 
                    @click="viewOrderDetails(order)"
                    class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Track
                  </button>
                </div>
              </div>
            </div>
            <button 
              v-if="activeOrders.length > 2"
              @click="activeTab = 'orders'"
              class="mt-4 w-full rounded-xl border-2 border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              View All Active Orders →
            </button>
          </div>
        </div>

        <!-- Order History Tab -->
        <div v-if="activeTab === 'orders'" class="space-y-4">
          <!-- Error State -->
          <div v-if="ordersError" class="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
            <p class="text-red-700">{{ ordersError }}</p>
            <button 
              @click="fetchOrders()"
              class="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>

          <div v-else-if="ordersPending" class="space-y-4">
            <div v-for="n in 3" :key="n" class="rounded-2xl bg-gray-100 p-6">
              <div class="flex gap-4">
                <div class="h-16 w-16 animate-pulse rounded-lg bg-gray-200"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
                  <div class="h-4 w-1/4 animate-pulse rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="orders.length === 0" class="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center">
            <div class="mb-4 text-6xl">🛒</div>
            <h3 class="text-lg font-semibold text-gray-900">No orders yet</h3>
            <p class="mt-2 text-sm text-gray-500">Start shopping to see your order history here</p>
            <button 
              @click="navigateTo('/shop')"
              class="mt-6 rounded-xl bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
            >
              Start Shopping
            </button>
          </div>

          <div v-else class="space-y-4">
            <div 
              v-for="order in orders" 
              :key="order.id"
              class="rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex gap-4">
                  <div class="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                    📦
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-bold text-gray-900">Order #{{ order.id.slice(-8) }}</p>
                      <span 
                        class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        :class="getStatusBadge(order.status).bg + ' ' + getStatusBadge(order.status).color"
                      >
                        {{ getStatusBadge(order.status).label }}
                      </span>
                    </div>
                    <p class="mt-1 text-sm text-gray-500">
                      {{ formatOrderDate(order.created_at) }} • {{ order.items.length }} items
                    </p>
                    <p class="mt-1 font-medium text-red-600">{{ formatCurrency(order.total_amount) }}</p>
                    <p v-if="order.updated_at !== order.created_at" class="mt-1 text-xs text-gray-400">
                      Updated {{ formatTimeAgo(order.updated_at) }}
                    </p>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button 
                    v-if="order.status === 'delivered'"
                    @click="reorder(order)"
                    :disabled="reorderingOrderId === order.id"
                    class="flex items-center gap-2 rounded-xl border-2 border-red-600 bg-white px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <span v-if="reorderingOrderId === order.id" class="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></span>
                    {{ reorderingOrderId === order.id ? 'Adding...' : 'Buy Again' }}
                  </button>
                  <button 
                    @click="viewOrderDetails(order)"
                    class="rounded-xl bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                  >
                    Details
                  </button>
                </div>
              </div>
              
              <!-- Status Progress Tracker -->
              <div class="mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between">
                  <div 
                    v-for="(step, index) in getOrderStatusSteps(order.status)" 
                    :key="step.key"
                    class="flex flex-col items-center flex-1"
                    :class="{ 'opacity-50': !step.active && !step.completed }"
                  >
                    <div 
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                      :class="step.completed ? 'bg-green-500 text-white' : step.active ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'"
                    >
                      <span v-if="step.completed">✓</span>
                      <span v-else>{{ index + 1 }}</span>
                    </div>
                    <span class="mt-1 text-xs font-medium" :class="step.active || step.completed ? 'text-gray-900' : 'text-gray-400'">
                      {{ step.label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Addresses Tab -->
        <div v-if="activeTab === 'addresses'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900">Saved Addresses</h3>
            <button 
              @click="showAddressForm = true"
              class="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
            >
              <span>+</span> Add New
            </button>
          </div>

          <div v-if="addressesPending" class="grid gap-4 sm:grid-cols-2">
            <div v-for="n in 2" :key="n" class="h-40 animate-pulse rounded-2xl bg-gray-200"></div>
          </div>

          <div v-else-if="addresses.length === 0" class="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center">
            <div class="mb-4 text-6xl">📍</div>
            <h3 class="text-lg font-semibold text-gray-900">No addresses saved</h3>
            <p class="mt-2 text-sm text-gray-500">Add your home, work, or other addresses for quick checkout</p>
          </div>

          <div v-else class="grid gap-4 sm:grid-cols-2">
            <div 
              v-for="address in addresses" 
              :key="address.id"
              class="relative rounded-2xl border-2 p-5 transition-all"
              :class="address.is_primary 
                ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100' 
                : 'border-gray-200 bg-white hover:border-red-300'"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ address.label === 'home' ? '🏠' : address.label === 'work' ? '💼' : '📍' }}</span>
                  <span class="font-semibold capitalize text-gray-900">{{ address.label }}</span>
                  <span 
                    v-if="address.is_primary"
                    class="rounded-full bg-red-400 px-2 py-0.5 text-xs font-medium text-red-900"
                  >
                    Primary
                  </span>
                </div>
                <div class="flex gap-1">
                  <button 
                    @click="editAddress(address)"
                    class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    ✏️
                  </button>
                  <button 
                    @click="confirmDeleteAddress(address)"
                    class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div class="mt-3 space-y-1 text-sm">
                <p class="font-medium text-gray-900">{{ address.street_address }}</p>
                <p class="text-gray-500">{{ address.area }}, {{ address.city }}</p>
                <p class="text-xs text-gray-400">
                  <span class="font-medium">Landmark:</span> {{ address.landmark }}
                </p>
              </div>

              <button 
                v-if="!address.is_primary"
                @click="setAsPrimary(address.id)"
                class="mt-4 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Set as Primary
              </button>
            </div>
          </div>
        </div>

        <!-- Account Settings Tab -->
        <div v-if="activeTab === 'settings'" class="mx-auto max-w-2xl">
          <div class="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
            <h3 class="mb-6 text-lg font-bold text-gray-900">Account Settings</h3>

            <div v-if="profilePending" class="space-y-4">
              <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-xl bg-gray-100"></div>
            </div>

            <form v-else @submit.prevent="saveProfile" class="space-y-6">
              <!-- Full Name -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Full Name</label>
                <input 
                  v-model="profileForm.full_name"
                  type="text"
                  class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-red-500 focus:outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              <!-- Phone Number -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div class="flex gap-2">
                  <input 
                    v-model="profileForm.phone_number"
                    type="tel"
                    class="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-red-500 focus:outline-none"
                    placeholder="+234 80X XXX XXXX"
                  />
                </div>
                <p class="mt-1 text-xs text-gray-500">Required for delivery updates</p>
              </div>

              <!-- Email (read-only) -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700">Email</label>
                <input 
                  :value="user?.email"
                  type="email"
                  disabled
                  class="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-gray-500"
                />
                <p class="mt-1 text-xs text-gray-500">Contact support to change email</p>
              </div>

              <!-- Save Button -->
              <div class="flex items-center justify-between pt-4">
                <button 
                  type="button"
                  @click="logout"
                  class="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Sign Out
                </button>
                <button 
                  type="submit"
                  :disabled="savingProfile"
                  class="flex items-center gap-2 rounded-xl bg-red-700 px-6 py-3 font-medium text-white hover:bg-red-800 disabled:opacity-50"
                >
                  <span v-if="savingProfile" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  {{ savingProfile ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>

    <!-- Address Form Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showAddressForm" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div class="absolute inset-0 bg-black/50" @click="showAddressForm = false"></div>
        
        <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h3 class="mb-6 text-xl font-bold text-gray-900">
            {{ editingAddress ? 'Edit Address' : 'Add New Address' }}
          </h3>

          <form @submit.prevent="saveAddress" class="space-y-4">
            <!-- Label -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">Address Type</label>
              <div class="flex gap-2">
                <button 
                  v-for="label in ['home', 'work', 'other']"
                  :key="label"
                  type="button"
                  @click="addressForm.label = label as AddressLabel"
                  class="flex-1 rounded-xl border-2 py-3 text-sm font-medium capitalize transition-colors"
                  :class="addressForm.label === label 
                    ? 'border-red-700 bg-red-50 text-red-700' 
                    : 'border-gray-200 hover:border-gray-300'"
                >
                  {{ label }}
                </button>
              </div>
            </div>

            <!-- Area (Lagos-specific dropdown) -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">Area / Neighborhood</label>
              <select 
                v-model="addressForm.area"
                class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-red-600 focus:outline-none"
              >
                <option value="">Select an area</option>
                <option v-for="area in LAGOS_AREAS" :key="area" :value="area">{{ area }}</option>
              </select>
            </div>

            <!-- Street Address -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">Street Address</label>
              <input 
                v-model="addressForm.street_address"
                type="text"
                placeholder="House number, street name"
                class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-red-600 focus:outline-none"
              />
            </div>

            <!-- Landmark (Lagos-critical) -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">
                Landmark / Nearest Bus Stop
                <span class="text-red-500">*</span>
              </label>
              <input 
                v-model="addressForm.landmark"
                type="text"
                placeholder="e.g., Near Total Filling Station, Opposite Shoprite"
                class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-red-600 focus:outline-none"
              />
              <p class="mt-1 text-xs text-gray-500">This helps our dispatch riders find you faster</p>
            </div>

            <!-- Primary Checkbox -->
            <label class="flex items-center gap-3">
              <input 
                v-model="addressForm.is_primary"
                type="checkbox"
                class="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span class="text-sm text-gray-700">Set as primary address</span>
            </label>

            <!-- Actions -->
            <div class="flex gap-3 pt-4">
              <button 
                type="button"
                @click="showAddressForm = false"
                class="flex-1 rounded-xl border-2 border-gray-200 py-3 font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit"
                :disabled="addressSaving"
                class="flex-1 rounded-xl bg-red-700 py-3 font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {{ addressSaving ? 'Saving...' : 'Save Address' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirmation Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="showDeleteConfirm = false"></div>
        
        <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <div class="mb-4 text-4xl">⚠️</div>
          <h3 class="mb-2 text-lg font-bold text-gray-900">Delete Address?</h3>
          <p class="mb-6 text-sm text-gray-500">This action cannot be undone.</p>
          
          <div class="flex gap-3">
            <button 
              @click="showDeleteConfirm = false"
              class="flex-1 rounded-xl border-2 border-gray-200 py-3 font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              @click="deleteAddressConfirmed"
              :disabled="addressDeleting"
              class="flex-1 rounded-xl bg-red-600 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {{ addressDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast.show"
        class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-6 py-3 text-sm font-medium text-white shadow-lg sm:bottom-8"
        :class="toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-red-700'"
      >
        <div class="flex items-center gap-2">
          <span>{{ toast.message }}</span>
        </div>
      </div>
    </Transition>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { useUserOrders, type Order, type OrderStatus } from '../composables/useUserOrders'
import { useUserAddresses, type Address, type AddressLabel, LAGOS_AREAS } from '../composables/useUserAddresses'
import type { Database } from '../types/database.types'

// Tabs configuration
const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'orders', label: 'Order History', icon: '📦', badge: 0 },
  { id: 'addresses', label: 'Addresses', icon: '📍' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

const activeTab = ref('overview')

// User data
const user = useSupabaseUser()
const supabase = useSupabaseClient<Database>()

// Profile state
const profile = ref<any>(null)
const profilePending = ref(false)
const savingProfile = ref(false)

const profileForm = ref({
  full_name: '',
  phone_number: ''
})

// Orders
const { 
  orders, 
  activeOrders, 
  lastOrder, 
  pending: ordersPending, 
  error: ordersError,
  fetchOrders, 
  getStatusBadge,
  formatOrderDate,
  subscribeToOrderUpdates,
  unsubscribeFromOrderUpdates 
} = useUserOrders()

// Addresses
const {
  addresses,
  primaryAddress,
  pending: addressesPending,
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setPrimaryAddress,
  getLabelDisplay,
  formatAddress,
  validateAddressForm
} = useUserAddresses()

// Address form state
const showAddressForm = ref(false)
const editingAddress = ref<Address | null>(null)
const addressSaving = ref(false)
const addressDeleting = ref(false)
const showDeleteConfirm = ref(false)
const addressToDelete = ref<Address | null>(null)

const addressForm = ref({
  label: 'home' as AddressLabel,
  area: '',
  street_address: '',
  city: 'Lagos',
  state: 'Lagos',
  landmark: '',
  is_primary: false
})

// Reorder state
const reorderingOrderId = ref<string | null>(null)

// Toast
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' | 'info' })

// Computed
const userInitials = computed(() => {
  const name = profile.value?.full_name || user.value?.email || ''
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const profileCompletion = computed(() => {
  let score = 0
  if (profile.value?.full_name) score += 30
  if (profile.value?.phone_number) score += 30
  if (addresses.value.length > 0) score += 40
  return score
})

const loyaltyTier = computed(() => {
  if (profileCompletion.value >= 90) return 'Platinum'
  if (profileCompletion.value >= 70) return 'Gold'
  if (profileCompletion.value >= 50) return 'Silver'
  return 'Bronze'
})

const loyaltyProgress = computed(() => {
  return {
    progressPercentage: profileCompletion.value,
    pointsToNextTier: Math.max(0, 100 - profileCompletion.value) * 500,
    nextTier: profileCompletion.value >= 90 ? 'Max' : profileCompletion.value >= 70 ? 'Platinum' : profileCompletion.value >= 50 ? 'Gold' : 'Silver'
  }
})

// Methods
const fetchProfile = async () => {
  const userId = user.value?.id || (user.value as any)?.sub
  if (!userId) return
  
  profilePending.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single() as { data: any, error: any }
  
  if (data) {
    profile.value = data
    profileForm.value.full_name = data.full_name || ''
    profileForm.value.phone_number = data.phone_number || ''
  }
  profilePending.value = false
}

const saveProfile = async () => {
  // Ensure session is active
  const { data: { session } } = await supabase.auth.getSession()
  const userId = user.value?.id || (user.value as any)?.sub || session?.user?.id || (session?.user as any)?.sub
  if (!userId) {
    showToast('You must be logged in to update your profile', 'error')
    return
  }

  if (!session) {
    showToast('Your session has expired. Please sign in again.', 'error')
    return
  }
  
  savingProfile.value = true
  try {
    const updateData: Database['public']['Tables']['profiles']['Update'] = {
      full_name: profileForm.value.full_name,
      phone_number: profileForm.value.phone_number,
      updated_at: new Date().toISOString()
    }
    
    const { error } = await (supabase
      .from('profiles')
      .update as any)(updateData)
      .eq('id', userId)
    
    if (error) {
      console.error('Profile update error:', error)
      if (error.message.includes('not authenticated') || error.message.includes('JWT')) {
        showToast('Session expired. Please sign in again.', 'error')
      } else {
        showToast(error.message || 'Failed to update profile', 'error')
      }
    } else {
      showToast('Profile updated successfully!', 'success')
      await fetchProfile()
    }
  } catch (err: any) {
    console.error('Unexpected error updating profile:', err)
    showToast('An unexpected error occurred', 'error')
  } finally {
    savingProfile.value = false
  }
}

const editAddress = (address: Address) => {
  editingAddress.value = address
  addressForm.value = {
    label: address.label,
    area: address.area,
    street_address: address.street_address,
    city: address.city,
    state: address.state,
    landmark: address.landmark,
    is_primary: address.is_primary
  }
  showAddressForm.value = true
}

const saveAddress = async () => {
  const validation = validateAddressForm(addressForm.value)
  if (!validation.valid) {
    showToast(validation.errors[0] ?? 'Validation failed', 'error')
    return
  }

  addressSaving.value = true

  if (editingAddress.value) {
    const { success, error } = await updateAddress(editingAddress.value.id, addressForm.value)
    if (success) {
      showToast('Address updated!', 'success')
      showAddressForm.value = false
      editingAddress.value = null
    } else {
      showToast(error || 'Failed to update', 'error')
    }
  } else {
    const { success, error } = await createAddress(addressForm.value)
    if (success) {
      showToast('Address added!', 'success')
      showAddressForm.value = false
      resetAddressForm()
    } else {
      showToast(error || 'Failed to add', 'error')
    }
  }

  addressSaving.value = false
}

const confirmDeleteAddress = (address: Address) => {
  addressToDelete.value = address
  showDeleteConfirm.value = true
}

const deleteAddressConfirmed = async () => {
  if (!addressToDelete.value) return
  
  addressDeleting.value = true
  const { success, error } = await deleteAddress(addressToDelete.value.id)
  if (success) {
    showToast('Address deleted', 'success')
    showDeleteConfirm.value = false
    addressToDelete.value = null
  } else {
    showToast(error || 'Failed to delete', 'error')
  }
  addressDeleting.value = false
}

const resetAddressForm = () => {
  addressForm.value = {
    label: 'home',
    area: '',
    street_address: '',
    city: 'Lagos',
    state: 'Lagos',
    landmark: '',
    is_primary: false
  }
}

const setAsPrimary = async (id: string) => {
  const { success } = await setPrimaryAddress(id)
  if (success) {
    showToast('Primary address updated', 'success')
  }
}

const reorder = async (order: Order) => {
  reorderingOrderId.value = order.id
  showToast('Items added to cart!', 'success')
  reorderingOrderId.value = null
}

const viewOrderDetails = (order: Order) => {
  navigateTo(`/order/pending-${order.id}`)
}

const logout = async () => {
  await supabase.auth.signOut()
  navigateTo('/auth')
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const getOrderStatusSteps = (status: OrderStatus) => {
  const steps = [
    { key: 'pending', label: 'Pending', completed: false, active: false },
    { key: 'confirmed', label: 'Confirmed', completed: false, active: false },
    { key: 'shipped', label: 'In Transit', completed: false, active: false },
    { key: 'delivered', label: 'Delivered', completed: false, active: false }
  ]
  
  const statusOrder = ['pending', 'processing', 'paid', 'confirmed', 'shipped', 'delivered']
  const currentIndex = statusOrder.indexOf(status)
  
  if (status === 'cancelled' || status === 'refunded') {
    return steps.map(s => ({ ...s, completed: s.key === 'pending', active: false }))
  }
  
  return steps.map((step, index) => {
    const stepIndex = statusOrder.indexOf(step.key)
    return {
      ...step,
      completed: stepIndex < currentIndex || (stepIndex === currentIndex && status === 'delivered'),
      active: stepIndex === currentIndex
    }
  })
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value).replace('NGN', '')
}

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// Watch for realtime updates
watch(() => activeOrders.value.length, (newCount, oldCount) => {
  if (newCount !== oldCount) {
    if (tabs[1]) {
      tabs[1].badge = activeOrders.value.length || undefined
    }
  }
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchProfile(),
    fetchOrders(),
    fetchAddresses()
  ])
  
  subscribeToOrderUpdates((update) => {
    showToast(`Order #${update.orderId.slice(-8)} is now ${update.newStatus}`, 'info')
  })
  
  if (tabs[1]) {
    tabs[1].badge = activeOrders.value.length || undefined
  }
})

onUnmounted(() => {
  unsubscribeFromOrderUpdates()
})

useHead({
  title: 'My Profile | HomeAffairs',
  meta: [
    { name: 'description', content: 'Manage your HomeAffairs account, orders, addresses, and loyalty rewards' }
  ]
})

// Page meta
definePageMeta({
  middleware: ['auth']
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
