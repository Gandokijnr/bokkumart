<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header Bar -->
    <div
      class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 shadow-2xl"
    >
      <div class="max-w-2xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg"
            >
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-bold text-white">Driver Dashboard</h1>
              <ClientOnly>
                <p class="text-xs text-slate-400">
                  {{ userStore.displayName }}
                </p>
                <template #fallback>
                  <p class="text-xs text-slate-400">Guest</p>
                </template>
              </ClientOnly>
            </div>
          </div>

          <!-- Online/Offline Toggle -->
          <button
            @click="driverStore.toggleAvailability()"
            :disabled="driverStore.isAvailable && driverStore.hasActiveOrder"
            class="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
            :class="
              driverStore.isAvailable
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
            "
          >
            <span
              class="w-2 h-2 rounded-full animate-pulse"
              :class="driverStore.isAvailable ? 'bg-green-400' : 'bg-slate-500'"
            ></span>
            {{ driverStore.isAvailable ? "Online" : "Offline" }}
          </button>
        </div>

        <!-- Stats Bar -->
        <div v-if="driverStore.isAvailable" class="grid grid-cols-2 gap-3 mt-4">
          <div
            class="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30"
          >
            <p class="text-xs text-slate-400">Today's Deliveries</p>
            <p class="text-2xl font-bold text-white mt-1">
              {{ driverStore.todayDeliveries }}
            </p>
          </div>
          <div
            class="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30"
          >
            <p class="text-xs text-slate-400">Delivery Fees Earned</p>
            <p class="text-2xl font-bold text-green-400 mt-1">
              ₦{{ formatMoney(driverStore.todayDeliveryFees) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-2xl mx-auto px-4 py-6 pb-24">
      <!-- Loading State -->
      <div
        v-if="driverStore.loading && !driverStore.activeOrder"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
        ></div>
        <p class="text-slate-400 mt-4">Loading...</p>
      </div>

      <!-- No Active Order -->
      <div
        v-else-if="!driverStore.hasActiveOrder"
        class="flex flex-col items-center justify-center py-20"
      >
        <div class="relative">
          <!-- Animated Waiting Icon -->
          <div
            class="w-24 h-24 bg-slate-700 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse"
          >
            <svg
              class="w-12 h-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div
            class="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full animate-ping"
          ></div>
        </div>

        <h2 class="text-2xl font-bold text-white mt-8">
          Waiting for new orders...
        </h2>
        <p class="text-slate-400 mt-2 text-center max-w-md">
          {{
            driverStore.isAvailable
              ? "You are online and ready to receive delivery assignments."
              : "Turn your status to Online to start receiving orders."
          }}
        </p>

        <div v-if="!driverStore.isAvailable" class="mt-6">
          <button
            @click="driverStore.toggleAvailability()"
            class="px-8 py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-blue-500/50 transition-all active:scale-95"
          >
            Go Online
          </button>
        </div>
      </div>

      <!-- Active Order Card -->
      <div v-else class="space-y-4">
        <!-- The Job Card -->
        <div
          class="bg-slate-800 rounded-3xl p-6 border border-slate-700/50 shadow-2xl"
        >
          <!-- Order Header -->
          <div class="flex items-start justify-between mb-6">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span
                  class="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30"
                >
                  ACTIVE DELIVERY
                </span>
                <span
                  v-if="!isNetworkOnline"
                  class="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30"
                >
                  📡 OFFLINE
                </span>
              </div>
              <h3 class="text-2xl font-bold text-white">{{ customerName }}</h3>
              <p class="text-sm text-slate-400">Order #{{ shortOrderId }}</p>
            </div>

            <!-- Total Amount -->
            <div
              class="text-right px-4 py-3 rounded-2xl bg-slate-700/30 border border-slate-600/30"
            >
              <p class="text-xs font-medium text-slate-400">Delivery Fee</p>
              <p class="text-2xl font-bold text-white mt-1">
                ₦{{ formatMoney(driverStore.activeOrder?.delivery_fee || 0) }}
              </p>
            </div>
          </div>

          <!-- Nearest Landmark - Featured -->
          <div
            class="bg-purple-500/10 rounded-2xl p-4 mb-6 border border-purple-500/20"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0"
              >
                <svg
                  class="w-5 h-5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-xs text-purple-400 font-semibold mb-1">
                  📍 NEAREST LANDMARK
                </p>
                <p class="text-lg font-bold text-white leading-tight">
                  {{ nearestLandmark }}
                </p>
                <p v-if="deliveryAddress" class="text-sm text-slate-400 mt-2">
                  {{ deliveryAddress }}
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-3 mb-6">
            <!-- Call Customer -->
            <a
              :href="`tel:${customerPhone}`"
              class="flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-4 px-4 rounded-2xl border border-green-500/30 transition-all active:scale-95"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Call Customer
            </a>

            <!-- Open Maps -->
            <button
              @click="openMaps"
              class="flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold py-4 px-4 rounded-2xl border border-blue-500/30 transition-all active:scale-95"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Open Maps
            </button>
          </div>

          <!-- Status Stepper -->
          <div
            class="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-700/30"
          >
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold text-slate-400">
                DELIVERY PROGRESS
              </p>
              <p class="text-xs text-blue-400">{{ statusProgress }}%</p>
            </div>

            <!-- Progress Bar -->
            <div class="w-full bg-slate-700/30 rounded-full h-2 mb-4">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                :style="{ width: statusProgress + '%' }"
              ></div>
            </div>

            <!-- Steps -->
            <div class="flex items-center justify-between">
              <div
                v-for="step in deliverySteps"
                :key="step.status"
                class="flex flex-col items-center flex-1"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                  :class="
                    isStepComplete(step.status)
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-slate-800 border-slate-600'
                  "
                >
                  <svg
                    v-if="isStepComplete(step.status)"
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span v-else class="text-xs text-slate-500">{{
                    step.icon
                  }}</span>
                </div>
                <p
                  class="text-[10px] text-slate-400 mt-1 text-center leading-tight"
                >
                  {{ step.label }}
                </p>
              </div>
            </div>
          </div>

          <!-- Main Action Area -->
          <div class="space-y-3">
            <!-- Confirm Pickup Button (assigned status) -->
            <button
              v-if="currentOrderStatus === 'assigned'"
              @click="handleConfirmPickup"
              :disabled="driverStore.loading"
              class="w-full py-5 bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-blue-500/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span
                v-if="!driverStore.loading"
                class="flex items-center justify-center gap-2"
              >
                <svg
                  class="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Confirm Pickup at Store
              </span>
              <span v-else>Processing...</span>
            </button>

            <!-- Mark as Arrived Section (picked_up status) -->
            <div
              v-else-if="currentOrderStatus === 'picked_up'"
              class="space-y-3"
            >
              <!-- Slide to Confirm Arrival (Safety mechanism) -->
              <SlideToConfirm
                ref="slideToConfirmRef"
                label="SLIDE TO MARK ARRIVED"
                :confirm-delay="1500"
                @confirm="handleMarkArrived"
              />

              <!-- "I'm Outside" - Call/WhatsApp Actions -->
              <div class="grid grid-cols-2 gap-3">
                <a
                  v-if="customerPhone"
                  :href="`tel:${customerPhone}`"
                  class="flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-3 px-4 rounded-xl border border-green-500/30 transition-all active:scale-95"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call Customer
                </a>
                <a
                  v-if="customerPhone"
                  :href="`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`"
                  target="_blank"
                  class="flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold py-3 px-4 rounded-xl border border-emerald-500/30 transition-all active:scale-95"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.3A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                    />
                  </svg>
                  WhatsApp
                </a>
              </div>

              <!-- Quick Message Hint -->
              <p class="text-xs text-slate-500 text-center">
                Can't find the location? Call or message the customer instantly
              </p>
            </div>

            <!-- Enter PIN Button (arrived status) -->
            <button
              v-else-if="currentOrderStatus === 'arrived'"
              @click="showPinModal = true"
              :disabled="driverStore.loading"
              class="w-full py-5 font-bold text-lg rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-green-500 text-white shadow-green-500/30"
            >
              <span class="flex items-center justify-center gap-2">
                <svg
                  class="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Enter Delivery PIN
              </span>
            </button>
          </div>
        </div>

        <!-- Order Items -->
        <div class="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30">
          <h4 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            Order Items
          </h4>
          <div class="space-y-2">
            <div
              v-for="(item, index) in orderItems"
              :key="index"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-slate-300"
                >{{ item.name }}
                <span class="text-slate-500">×{{ item.quantity }}</span></span
              >
              <span class="text-slate-400 font-mono"
                >₦{{
                  formatMoney((item.total_price || 0) * (item.quantity || 1))
                }}</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Order History Section -->
      <div
        v-if="driverStore.orderHistory.length > 0"
        class="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30 mt-6"
      >
        <h4 class="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Recent Deliveries ({{ driverStore.orderHistory.length }})
        </h4>
        <div class="space-y-3">
          <div
            v-for="order in driverStore.orderHistory"
            :key="order.id"
            class="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-white">
                #{{ order.id?.slice(0, 8).toUpperCase() }}
              </span>
              <span class="text-xs text-green-400 font-medium">Delivered</span>
            </div>
            <div
              class="flex items-center justify-between text-xs text-slate-400"
            >
              <span>{{ order.customer?.full_name || "Customer" }}</span>
              <span class="text-green-400 font-mono">
                +₦{{ formatMoney(order.delivery_fee || 0) }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              {{
                order.delivered_at
                  ? new Date(order.delivered_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"
              }}
            </p>
          </div>
        </div>
        <button
          v-if="hasMoreOrders"
          @click="loadMoreOrders"
          :disabled="isLoadingMore"
          class="w-full mt-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            v-if="isLoadingMore"
            class="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span v-else
            >Load More ({{ driverStore.orderHistory.length }} loaded)</span
          >
        </button>
        <p
          v-else-if="driverStore.orderHistory.length >= 10"
          class="text-xs text-slate-500 text-center mt-4"
        >
          All deliveries loaded ({{ driverStore.orderHistory.length }} total)
        </p>
      </div>
    </div>

    <!-- PIN Verification Modal -->
    <div
      v-if="showPinModal"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click.self="showPinModal = false"
    >
      <div
        class="bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-700 shadow-2xl"
      >
        <div class="text-center mb-6">
          <div
            class="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-white mb-2">Enter Delivery PIN</h3>
          <p class="text-slate-400 text-sm">
            Ask the customer for their 4-digit confirmation code
          </p>
        </div>

        <!-- PIN Input -->
        <div class="flex gap-3 mb-6 justify-center">
          <input
            v-for="i in 4"
            :key="i"
            type="text"
            maxlength="1"
            v-model="pinDigits[i - 1]"
            @input="handlePinInput($event, i - 1)"
            @keydown.backspace="handlePinBackspace($event, i - 1)"
            :ref="(el) => (pinInputs[i - 1] = el)"
            class="w-14 h-16 text-center text-2xl font-bold bg-slate-800 border-2 border-slate-700 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        <!-- Error Message -->
        <div
          v-if="pinError"
          class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
        >
          <p class="text-sm text-red-400 text-center">{{ pinError }}</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-4 mt-8">
          <button
            @click="showPinModal = false"
            :disabled="driverStore.loading"
            class="flex-1 py-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl border border-slate-600/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            @click="submitPin"
            :disabled="!isPinComplete || driverStore.loading"
            class="flex-1 py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ driverStore.loading ? "Verifying..." : "Confirm" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useDriverStore } from "~/stores/driver";
import { useUserStore } from "~/stores/user";
import SlideToConfirm from "~/components/SlideToConfirm.vue";

definePageMeta({
  middleware: "driver",
  layout: false,
});

const driverStore = useDriverStore();
const userStore = useUserStore();

// PIN Modal State
const showPinModal = ref(false);
const pinDigits = ref(["", "", "", ""]);
const pinInputs = ref<any[]>([]);
const pinError = ref("");

// Slide to Confirm Ref
const slideToConfirmRef = ref<InstanceType<typeof SlideToConfirm> | null>(null);

// Network status
const isNetworkOnline = ref(
  typeof navigator !== "undefined" ? navigator.onLine : true,
);

// Pagination state for order history
const orderHistoryOffset = ref(0);
const orderHistoryLimit = 10;
const isLoadingMore = ref(false);
const hasMoreOrders = ref(true);

// Delivery workflow steps
const deliverySteps = [
  { status: "assigned", label: "Assigned", icon: "📋" },
  { status: "picked_up", label: "Picked Up", icon: "📦" },
  { status: "arrived", label: "Arrived", icon: "📍" },
  { status: "delivered", label: "Delivered", icon: "✅" },
];

// Computed Properties
const customerName = computed(() => {
  return driverStore.activeOrder?.customer?.full_name || "Customer";
});

const customerPhone = computed(() => {
  return (
    driverStore.activeOrder?.customer?.phone_number ||
    driverStore.activeOrder?.delivery_details?.contactPhone ||
    ""
  );
});

const shortOrderId = computed(() => {
  if (!driverStore.activeOrder?.id) return "";
  return driverStore.activeOrder.id.slice(0, 8).toUpperCase();
});

const nearestLandmark = computed(() => {
  return (
    driverStore.activeOrder?.nearest_landmark ||
    driverStore.activeOrder?.delivery_details?.address?.landmark ||
    "No landmark provided"
  );
});

const deliveryAddress = computed(() => {
  const details = driverStore.activeOrder?.delivery_details;
  if (!details?.address) return "";

  const { houseNumber, street, area } = details.address;
  const parts = [houseNumber, street, area].filter(Boolean);
  return parts.join(", ");
});

const orderItems = computed(() => {
  return driverStore.activeOrder?.items || [];
});

const statusProgress = computed(() => {
  const status = currentOrderStatus.value;
  switch (status) {
    case "assigned":
      return 25;
    case "picked_up":
      return 50;
    case "arrived":
      return 75;
    case "delivered":
      return 100;
    default:
      return 0;
  }
});

const isPinComplete = computed(() => {
  return pinDigits.value.every((digit) => digit.length === 1);
});

// Current order status from store
const currentOrderStatus = computed(() => {
  return driverStore.currentOrderStatus;
});

// WhatsApp message pre-filled
const whatsappMessage = computed(() => {
  const orderId = shortOrderId.value;
  return `Hi, this is your HomeAffairs delivery driver. I'm outside with your order #${orderId}. Could you please guide me to your location?`;
});

// Methods
function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-NG").format(amount);
}

function isStepComplete(status: string): boolean {
  const currentStatus = currentOrderStatus.value;
  const steps = ["assigned", "picked_up", "arrived", "delivered"];
  const currentIndex = steps.indexOf(currentStatus || "");
  const stepIndex = steps.indexOf(status);
  return stepIndex <= currentIndex;
}

async function loadMoreOrders() {
  if (isLoadingMore.value || !hasMoreOrders.value) return;

  isLoadingMore.value = true;
  const previousLength = driverStore.orderHistory.length;

  try {
    await driverStore.fetchOrderHistory(
      orderHistoryLimit,
      orderHistoryOffset.value,
      true, // append mode
    );

    // Check if we got fewer results than requested (reached end)
    const newItemsCount = driverStore.orderHistory.length - previousLength;
    if (newItemsCount < orderHistoryLimit) {
      hasMoreOrders.value = false;
    }

    // Update offset for next load
    orderHistoryOffset.value += orderHistoryLimit;
  } catch (err) {
    console.error("Failed to load more orders:", err);
  } finally {
    isLoadingMore.value = false;
  }
}

function openMaps() {
  const loc = driverStore.customerLocation;
  if (loc?.lat != null && loc?.lng != null) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${loc.lat},${loc.lng}`)}`,
      "_blank",
    );
    return;
  }

  const query = encodeURIComponent(nearestLandmark.value);
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${query}`,
    "_blank",
  );
}

// Handle Confirm Pickup (assigned status)
async function handleConfirmPickup() {
  await driverStore.updateOrderStatus("picked_up");
}

// Handle Mark Arrived with slide confirmation (picked_up status)
async function handleMarkArrived() {
  await driverStore.updateOrderStatus("arrived");
}

function handlePinInput(event: Event, index: number) {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  // Allow alphanumeric (A-Z, 0-9) and normalize to uppercase
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 1);

  input.value = normalized;
  pinDigits.value[index] = normalized;

  // Auto-focus next input
  if (value && index < 3) {
    pinInputs.value[index + 1]?.focus();
  }

  // Clear error on input
  pinError.value = "";
}

function handlePinBackspace(event: KeyboardEvent, index: number) {
  if (!pinDigits.value[index] && index > 0) {
    event.preventDefault();
    pinInputs.value[index - 1]?.focus();
  }
}

async function submitPin() {
  const pin = pinDigits.value.join("").toUpperCase();

  if (pin.length !== 4) {
    pinError.value = "Please enter the 4-character code";
    return;
  }

  const result = await driverStore.verifyDeliveryPIN(pin);

  if (result === "success") {
    showPinModal.value = false;
    pinDigits.value = ["", "", "", ""];
    pinError.value = "";
    return;
  }

  if (result === "queued") {
    showPinModal.value = false;
    pinDigits.value = ["", "", "", ""];
    pinError.value = "";
    return;
  }

  pinError.value = "Incorrect PIN. Please try again.";
  pinDigits.value = ["", "", "", ""];
  pinInputs.value[0]?.focus();
}

// Lifecycle
onMounted(async () => {
  await driverStore.initialize();
  driverStore.loadOfflineActions();

  // Initialize pagination offset after initial fetch
  orderHistoryOffset.value = orderHistoryLimit;

  // Network status listeners
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
});

onUnmounted(() => {
  driverStore.cleanup();
  window.removeEventListener("online", updateNetworkStatus);
  window.removeEventListener("offline", updateNetworkStatus);
});

function updateNetworkStatus() {
  isNetworkOnline.value = navigator.onLine;
}
</script>
