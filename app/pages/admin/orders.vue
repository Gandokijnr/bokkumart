<template>
  <div>
    <div
      v-if="arrivalAlerts.length"
      class="mb-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="font-bold text-emerald-900">Pickup Priority Lane</p>
          <p class="mt-1 text-sm text-emerald-800">
            A customer has arrived for pickup. Bring the bag to the Online
            Pickup Point.
          </p>
        </div>
        <button
          @click="arrivalAlerts = []"
          class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
        >
          Clear
        </button>
      </div>

      <div class="mt-3 space-y-2">
        <div
          v-for="a in arrivalAlerts"
          :key="a.orderId"
          class="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
        >
          <div class="min-w-0">
            <p class="font-semibold text-gray-900 truncate">
              {{ a.customerName || "Customer" }} arrived for Order #{{
                a.orderId.slice(-8).toUpperCase()
              }}
            </p>
            <p class="text-xs text-gray-500">
              {{
                new Date(a.arrivedAt).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }}
            </p>
          </div>
          <button
            @click="
              arrivalAlerts = arrivalAlerts.filter(
                (x) => x.orderId !== a.orderId,
              )
            "
            class="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div
      class="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
    >
      <div class="flex-1 min-w-[200px]">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search orders..."
          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
        />
      </div>

      <!-- Store Filter - Hidden for branch managers, shows only their store -->
      <ClientOnly>
        <select
          v-if="currentUserRole !== 'branch_manager'"
          v-model="storeFilter"
          class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        >
          <option value="">All Stores</option>
          <option v-for="store in stores" :key="store.id" :value="store.id">
            {{ store.name }}
          </option>
        </select>
        <div
          v-else-if="currentUserStoreId"
          class="rounded-lg border border-gray-300 px-3 py-2 bg-gray-100 text-gray-700 text-sm"
        >
          {{
            stores.find((s) => s.id === currentUserStoreId)?.name || "My Branch"
          }}
        </div>
        <div
          v-else
          class="rounded-lg border border-red-300 px-3 py-2 bg-red-50 text-red-700 text-sm font-medium"
        >
          No branch assigned - contact admin
        </div>
      </ClientOnly>

      <select
        v-model="paymentFilter"
        class="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
      >
        <option value="">All Payment Methods</option>
        <option value="prepaid">Prepaid</option>
      </select>

      <div class="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
        <button
          @click="viewMode = 'kanban'"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            viewMode === 'kanban'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          "
        >
          Kanban
        </button>
        <button
          @click="viewMode = 'table'"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            viewMode === 'table'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          "
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
        :class="{ 'bg-red-50': column.status === 'pending' }"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">{{ column.title }}</h3>
          <span
            class="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-700"
          >
            {{ getOrdersByStatus(column.status).length }}
          </span>
        </div>

        <div class="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
          <div
            v-for="order in getOrdersByStatus(column.status)"
            :key="order.id"
            class="relative cursor-pointer rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md overflow-hidden max-h-[350px] overflow-y-auto"
            :class="{
              'border-l-4 border-red-500': order.fraudRisk?.isHighRisk,
              'ring-2 ring-emerald-300':
                order.delivery_method === 'pickup' &&
                order.metadata?.pickup_arrived_at,
            }"
            @click="openOrderDetails(order)"
          >
            <div
              class="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-gray-100/80 px-2 py-1 text-[10px] font-semibold text-gray-600 backdrop-blur"
              :title="customerViewLabel(order)"
              @click.stop
            >
              <span aria-hidden="true">👁️</span>
              <span>Client Sees</span>
            </div>

            <div
              v-if="riderViewLabel(order)"
              class="absolute right-2 top-9 z-10 inline-flex items-center gap-1 rounded-md bg-gray-100/80 px-2 py-1 text-[10px] font-semibold text-gray-600 backdrop-blur"
              :title="'This is the likely status currently displayed on the rider\'s app.'"
              @click.stop
            >
              <span aria-hidden="true">👁️</span>
              <span>{{ riderViewLabel(order) }}</span>
            </div>

            <div class="flex items-start justify-between">
              <span
                class="font-mono text-xs font-bold text-gray-900 truncate max-w-[70px]"
              >
                #{{ order.id.slice(-8).toUpperCase() }}
              </span>
              <div class="flex items-center gap-2">
                <span
                  v-if="
                    order.delivery_method === 'pickup' &&
                    order.metadata?.pickup_arrived_at
                  "
                  class="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700"
                  :title="
                    'Customer arrived at ' +
                    new Date(order.metadata.pickup_arrived_at).toLocaleString(
                      'en-NG',
                    )
                  "
                >
                  ARRIVED
                </span>
              </div>
            </div>

            <p
              class="mt-1 text-sm font-medium text-gray-900 truncate"
              :title="order.customer_name || 'N/A'"
            >
              {{ order.customer_name || "N/A" }}
            </p>
            <p class="text-xs text-gray-500 truncate" :title="order.store_name">
              {{ order.store_name }}
            </p>

            <div class="mt-2 flex items-center justify-between">
              <span class="font-bold text-gray-900"
                >₦{{ formatNumber(order.total_amount) }}</span
              >
              <span class="text-xs text-gray-500">{{
                getTimeElapsed(order.created_at)
              }}</span>
            </div>

            <div
              v-if="
                column.status !== 'cancelled' && column.status !== 'delivered'
              "
              class="mt-2"
            >
              <div class="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  class="h-1.5 rounded-full bg-red-600 transition-all"
                  :style="{ width: getProgressPercentage(column.status) + '%' }"
                ></div>
              </div>
              <div class="mt-2 flex gap-2">
                <button
                  @click.stop="handleStatusUpdateWithVerify(order)"
                  :disabled="processing.has(order.id)"
                  class="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 truncate"
                  :title="getNextStatusLabel(order)"
                >
                  {{
                    processing.has(order.id) ? "..." : getNextStatusLabel(order)
                  }}
                </button>
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
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Order ID
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Customer
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Store
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Amount
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Payment
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Time
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="order in paginatedTableOrders"
              :key="order.id"
              class="hover:bg-gray-50"
              :class="{
                'bg-red-50': order.fraudRisk?.isHighRisk,
                'bg-emerald-50':
                  order.delivery_method === 'pickup' &&
                  order.metadata?.pickup_arrived_at,
              }"
            >
              <td class="px-4 py-3 font-mono text-sm font-bold text-gray-900">
                #{{ order.id.slice(-8).toUpperCase() }}
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">
                  {{ order.customer_name || "N/A" }}
                </p>
                <p class="text-xs text-gray-500">
                  {{
                    order.delivery_details?.contactPhone || order.customer_phone
                  }}
                </p>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                {{ order.store_name }}
              </td>
              <td class="px-4 py-3 text-sm font-bold text-gray-900">
                ₦{{ formatNumber(order.total_amount) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-1 text-xs font-bold bg-green-100 text-green-700"
                >
                  Prepaid
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-full px-2 py-1 text-xs font-bold"
                    :class="getStatusBadgeClass(order.status)"
                  >
                    {{ order.status.replace("_", " ") }}
                  </span>
                  <span
                    v-if="
                      order.delivery_method === 'pickup' &&
                      order.metadata?.pickup_arrived_at
                    "
                    class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700"
                    :title="
                      'Customer arrived at ' +
                      new Date(order.metadata.pickup_arrived_at).toLocaleString(
                        'en-NG',
                      )
                    "
                  >
                    Customer Arrived
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ getTimeElapsed(order.created_at) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    @click="handleStatusUpdateWithVerify(order)"
                    :disabled="
                      processing.has(order.id) ||
                      order.status === 'delivered' ||
                      order.status === 'cancelled'
                    "
                    class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {{ getNextStatusLabel(order) }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table Pagination -->
      <div
        v-if="viewMode === 'table' && filteredOrders.length > 0"
        class="flex items-center justify-between px-4 py-3 border-t border-gray-200"
      >
        <div class="text-sm text-gray-500">
          Showing {{ (tablePage - 1) * tablePageSize + 1 }} -
          {{ Math.min(tablePage * tablePageSize, filteredOrders.length) }} of
          {{ filteredOrders.length }} orders
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="tablePage--"
            :disabled="tablePage <= 1"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span class="text-sm text-gray-600">
            Page {{ tablePage }} of {{ totalTablePages }}
          </span>
          <button
            @click="tablePage++"
            :disabled="tablePage >= totalTablePages"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Standalone Verification Modal (for Kanban/Table views) -->
    <OrderVerificationModal
      v-model="showVerifyModal"
      :type="
        verifyModalOrder?.delivery_method === 'pickup' ? 'pickup' : 'delivery'
      "
      :order-id="verifyModalOrder?.id"
      :loading="verifyingModal"
      :error="verifyModalError"
      @cancel="closeVerifyModal"
      @verify="onVerifyModalSubmit"
    />

    <!-- Order Details Modal -->
    <div
      v-if="selectedOrder"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">
            Order #{{ selectedOrder.id.slice(-8).toUpperCase() }}
          </h3>
          <button
            @click="selectedOrder = null"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <OrderVerificationModal
          v-model="showVerifyCollection"
          type="pickup"
          :order-id="selectedOrder?.id"
          :loading="verifyingCollection"
          :error="verifyError"
          @cancel="closeVerifyCollection"
          @verify="onVerifyCollectionSubmit"
        />

        <OrderVerificationModal
          v-model="showVerifyDeliveryPin"
          type="delivery"
          :order-id="selectedOrder?.id"
          :loading="verifyingDeliveryPin"
          :error="deliveryPinError"
          @cancel="closeVerifyDeliveryPin"
          @verify="onVerifyDeliverySubmit"
        />

        <div class="mt-4 space-y-4">
          <div class="rounded-lg bg-gray-50 p-4">
            <h4 class="font-semibold text-gray-900">Customer</h4>
            <p class="text-gray-700">
              {{ selectedOrder.customer_name || "N/A" }}
            </p>
            <a
              :href="`tel:${selectedOrder.delivery_details?.contactPhone || selectedOrder.customer_phone}`"
              class="text-red-600 hover:underline"
            >
              {{
                selectedOrder.delivery_details?.contactPhone ||
                selectedOrder.customer_phone ||
                "N/A"
              }}
            </a>
          </div>

          <div class="rounded-lg bg-gray-50 p-4">
            <h4 class="font-semibold text-gray-900">Store & Delivery</h4>
            <p class="text-gray-700">
              {{ selectedOrder.store_name }}
              <span
                v-if="selectedOrder.store_delivery_mode"
                class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-2"
              >
                {{ selectedOrder.store_delivery_mode }}
              </span>
            </p>
            <p class="text-gray-700 mt-2">
              {{ selectedOrder.delivery_method }}
              <span
                v-if="
                  selectedOrder.delivery_method === 'pickup' &&
                  selectedOrder.pickup_time
                "
              >
                at {{ selectedOrder.pickup_time }}
              </span>
            </p>
            <p
              v-if="selectedOrder.delivery_details?.address?.street"
              class="text-sm text-gray-500"
            >
              {{ selectedOrder.delivery_details?.address?.street }}
            </p>
            <p
              v-if="selectedOrder.delivery_details?.address?.landmark"
              class="text-sm text-gray-500"
            >
              Landmark: {{ selectedOrder.delivery_details.address.landmark }}
            </p>

            <div
              v-if="
                selectedOrder.delivery_method === 'delivery' &&
                selectedOrder?.metadata?.out_for_delivery_whatsapp_url
              "
              class="mt-3"
            >
              <a
                :href="selectedOrder.metadata.out_for_delivery_whatsapp_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
              >
                Notify Customer (WhatsApp)
              </a>
              <p class="mt-1 text-xs text-gray-500">
                Sends “Out for Delivery” update with rider contact.
              </p>
            </div>
          </div>

          <div class="rounded-lg bg-gray-50 p-4">
            <h4 class="font-semibold text-gray-900">
              Items ({{ selectedOrder.item_count }})
            </h4>
            <div v-if="selectedOrder.items" class="mt-2 space-y-2">
              <div
                v-for="(item, idx) in selectedOrder.items"
                :key="idx"
                class="flex items-center justify-between text-sm"
              >
                <span>{{ item.name }} x{{ item.quantity }}</span>
                <span class="font-medium"
                  >₦{{ formatNumber(item.total_price * item.quantity) }}</span
                >
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
            <!-- Driver Assignment Component for orders ready to assign -->
            <div
              v-if="
                selectedOrder.status === 'completed_in_pos' &&
                selectedOrder.delivery_method === 'delivery'
              "
              class="flex-1"
            >
              <DriverAssignment
                :order-id="selectedOrder.id"
                :store-id="selectedOrder.store_id"
                label="Select Driver"
                assign-button-text="Assign Driver"
                no-drivers-title="No Online Drivers"
                no-drivers-message="No drivers are currently online in this store. Please ask a driver to go online or use the Dispatch page."
                @assigned="fetchOrders"
              />
            </div>

            <div v-else-if="activeStepAction" class="flex-1">
              <button
                @click="handleActiveStepAction()"
                :disabled="processing.has(selectedOrder.id)"
                class="w-full rounded-xl py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                :class="activeStepAction.buttonClass"
              >
                <span class="inline-flex items-center justify-center gap-2">
                  <span aria-hidden="true">{{ activeStepAction.icon }}</span>
                  <span>{{ activeStepAction.label }}</span>
                </span>
              </button>
              <p
                v-if="activeStepAction.subtext"
                class="mt-1 text-xs text-gray-500"
              >
                {{ activeStepAction.subtext }}
              </p>
            </div>

            <button
              v-if="
                selectedOrder.status !== 'delivered' &&
                selectedOrder.status !== 'cancelled'
              "
              @click="cancelOrder(selectedOrder)"
              class="rounded-xl border-2 border-red-600 px-6 py-3 font-bold text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rider Assignment Modal (shown after POS completion for delivery orders) -->
    <div
      v-if="showAssignRiderModal && assignRiderOrder"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">Assign Rider</h3>
          <button
            @click="closeAssignRiderModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="mt-4">
          <p class="text-sm text-gray-600 mb-4">
            Order
            <span class="font-mono font-bold"
              >#{{ assignRiderOrder.id.slice(-8).toUpperCase() }}</span
            >
            is ready for delivery. Please select a rider to assign.
          </p>

          <DriverAssignment
            :order-id="assignRiderOrder.id"
            :store-id="assignRiderOrder.store_id"
            label="Select Driver"
            assign-button-text="Assign & Dispatch"
            no-drivers-title="No Online Drivers"
            no-drivers-message="No drivers are currently online in this store. Please ask a driver to go online."
            @assigned="onRiderAssigned"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types";
import { useUserStore } from "~/stores/user";
import { useAdminStore } from "~/stores/admin";
import {
  getStatusLabel,
  type FulfillmentType,
} from "~/composables/useUserOrders";
import { useToast } from "~/composables/useToast";
import OrderVerificationModal from "~/components/OrderVerificationModal.vue";
import DriverAssignment from "~/components/DriverAssignment.vue";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

const supabase = useSupabaseClient();
const toast = useToast();
const userStore = useUserStore();
const adminStore = useAdminStore();

// Get current user role
const currentUserRole = computed(() => userStore.profile?.role || "customer");

// Get all store IDs for the current branch manager (supports multiple branches)
const currentUserStoreIds = computed(() => {
  const storeIds: string[] = [];

  // First try profile.store_id
  if (userStore.profile?.store_id) {
    storeIds.push(userStore.profile.store_id);
  }

  // Add all managed stores (for branch managers with managed_store_ids)
  if (userStore.managedStores?.length > 0) {
    for (const store of userStore.managedStores) {
      if (store?.id && !storeIds.includes(store.id)) {
        storeIds.push(store.id);
      }
    }
  }

  return storeIds;
});

// Backwards compatibility - returns first store ID or null
const currentUserStoreId = computed(() => {
  return currentUserStoreIds.value[0] ?? null;
});

// Super admin branch filter from admin store
const adminStoreFilter = computed(() => adminStore.currentStoreId);

const orders = ref<any[]>([]);
const stores = ref<any[]>([]);
const processing = ref<Set<string>>(new Set());
const realtimeChannel = ref<RealtimeChannel | null>(null);

const searchQuery = ref("");
const storeFilter = ref("");
const paymentFilter = ref("");
const viewMode = ref<"kanban" | "table">("kanban");

// Pagination state for table view
const tablePage = ref(1);
const tablePageSize = ref(20);

const selectedOrder = ref<any>(null);

// Verification modal for kanban/table views (outside order details modal)
const verifyModalOrder = ref<any>(null);
const verifyModalNextStatus = ref<string>("");
const showVerifyModal = ref(false);
const verifyModalCode = ref("");
const verifyModalError = ref("");
const verifyingModal = ref(false);

const sensitiveActionConfirm = ref<{
  orderId: string;
  nextStatus: string;
  armedUntil: number;
} | null>(null);

const showVerifyCollection = ref(false);
const verifyCode = ref("");
const verifyError = ref("");
const verifyingCollection = ref(false);

const showVerifyDeliveryPin = ref(false);
const deliveryPin = ref("");
const deliveryPinError = ref("");
const verifyingDeliveryPin = ref(false);

// Rider assignment modal state
const showAssignRiderModal = ref(false);
const assignRiderOrder = ref<any>(null);

const verifyVideoEl = ref<HTMLVideoElement | null>(null);
const scannerActive = ref(false);
const scannerError = ref("");
const verifyStream = ref<MediaStream | null>(null);
const verifyScanTimer = ref<any>(null);

const activeStepAction = computed(() => {
  const order = selectedOrder.value;
  if (!order) return null;

  const status = String(order.status || "");
  const fulfillment = String(order.delivery_method || "delivery");

  if (status === "cancelled" || status === "refunded" || status === "delivered")
    return null;

  const isPickup = fulfillment === "pickup";

  type ActionType = "logistics" | "completion" | "urgent";
  const base = {
    nextStatus: getNextStatus(order),
    type: "logistics" as ActionType,
    icon: "➡️",
    label: getNextStatusLabel(order),
    subtext: "" as string | null,
    sensitive: false,
    buttonClass: "bg-indigo-600 hover:bg-indigo-700",
  };

  if (isPickup) {
    if (status === "pending") {
      return {
        ...base,
        label: "Confirm Order",
        icon: "✅",
        nextStatus: "confirmed",
        type: "logistics",
        buttonClass: "bg-indigo-600 hover:bg-indigo-700",
      };
    }

    if (status === "confirmed") {
      return {
        ...base,
        label: "Send to POS",
        icon: "🖥️",
        nextStatus: "ready_for_pos",
        type: "logistics",
        subtext: "Staff prepares items; send to POS.",
        buttonClass: "bg-cyan-600 hover:bg-cyan-700",
      };
    }

    if (status === "ready_for_pos") {
      return {
        ...base,
        label: "Mark POS Done",
        icon: "✅",
        nextStatus: "completed_in_pos",
        type: "logistics",
        subtext: "RetailMan POS completed. Ready for pickup.",
        buttonClass: "bg-teal-600 hover:bg-teal-700",
      };
    }

    if (status === "completed_in_pos") {
      return {
        ...base,
        label: "Mark as Ready",
        icon: "📦",
        nextStatus: "picked_up",
        type: "logistics",
        buttonClass: "bg-indigo-600 hover:bg-indigo-700",
      };
    }

    // “Ready” state for pickup (picked_up/arrived) -> business transaction: Collected
    if (status === "picked_up" || status === "arrived") {
      return {
        ...base,
        label: "Mark as Collected",
        icon: "🛍️",
        nextStatus: "delivered",
        type: "completion",
        sensitive: true,
        subtext: "Verify customer's Claim PIN before clicking.",
        buttonClass: "bg-green-600 hover:bg-green-700",
      };
    }
  }

  // Delivery flow
  if (status === "pending") {
    return {
      ...base,
      label: "Confirm Order",
      icon: "✅",
      nextStatus: "confirmed",
      type: "logistics",
      buttonClass: "bg-indigo-600 hover:bg-indigo-700",
    };
  }

  if (status === "confirmed") {
    return {
      ...base,
      label: "Send to POS",
      icon: "🖥️",
      nextStatus: "ready_for_pos",
      type: "logistics",
      subtext: "Staff prepares items; send to POS.",
      buttonClass: "bg-cyan-600 hover:bg-cyan-700",
    };
  }

  if (status === "ready_for_pos") {
    return {
      ...base,
      label: "Mark POS Done",
      icon: "✅",
      nextStatus: "completed_in_pos",
      type: "logistics",
      subtext: "RetailMan POS completed. Ready for rider.",
      buttonClass: "bg-teal-600 hover:bg-teal-700",
    };
  }

  if (status === "completed_in_pos") {
    return {
      ...base,
      label: "Assign Rider",
      icon: "🚚",
      nextStatus: "assigned",
      type: "logistics",
      subtext: "Seal thermal bag and assign rider.",
      buttonClass: "bg-indigo-600 hover:bg-indigo-700",
      requiresRiderAssignment: true,
    };
  }

  if (status === "assigned") {
    return {
      ...base,
      label: "Hand to Rider",
      icon: "🤝",
      nextStatus: "picked_up",
      type: "logistics",
      buttonClass: "bg-indigo-600 hover:bg-indigo-700",
    };
  }

  if (status === "picked_up") {
    return {
      ...base,
      label: "Mark Arrived",
      icon: "📍",
      nextStatus: "arrived",
      type: "logistics",
      buttonClass: "bg-yellow-600 hover:bg-yellow-700",
    };
  }

  if (status === "arrived") {
    return {
      ...base,
      label: "Confirm Delivery",
      icon: "✅",
      nextStatus: "delivered",
      type: "completion",
      sensitive: true,
      subtext: "Verify delivery PIN / confirmation before clicking.",
      buttonClass: "bg-emerald-600 hover:bg-emerald-700",
    };
  }

  return { ...base, buttonClass: "bg-indigo-600 hover:bg-indigo-700" };
});

const handleActiveStepAction = async () => {
  if (!selectedOrder.value || !activeStepAction.value) return;

  const orderId = String(selectedOrder.value.id);
  const nextStatus = String(activeStepAction.value.nextStatus);

  const isPickup =
    String(selectedOrder.value?.delivery_method || "") === "pickup";
  if (isPickup && nextStatus === "delivered") {
    openVerifyCollection();
    return;
  }

  const isDelivery =
    String(selectedOrder.value?.delivery_method || "") === "delivery";
  if (isDelivery && nextStatus === "delivered") {
    openVerifyDeliveryPin();
    return;
  }

  // Show rider assignment modal for delivery orders at completed_in_pos
  if (isDelivery && selectedOrder.value?.status === "completed_in_pos") {
    openAssignRiderModal(selectedOrder.value);
    return;
  }

  if (activeStepAction.value.sensitive) {
    const now = Date.now();
    const armed = sensitiveActionConfirm.value;

    if (
      !armed ||
      armed.orderId !== orderId ||
      armed.nextStatus !== nextStatus ||
      armed.armedUntil < now
    ) {
      sensitiveActionConfirm.value = {
        orderId,
        nextStatus,
        armedUntil: now + 7000,
      };
      toast.add({
        title: "Confirm Action",
        description:
          "Click again within 7 seconds to confirm this completion step.",
        color: "warning",
      });
      return;
    }

    sensitiveActionConfirm.value = null;
  }

  await updateStatus(selectedOrder.value, nextStatus);
};

const openVerifyCollection = () => {
  showVerifyCollection.value = true;
  verifyCode.value = "";
  verifyError.value = "";
  scannerError.value = "";
};

const closeVerifyCollection = () => {
  showVerifyCollection.value = false;
  verifyError.value = "";
  scannerError.value = "";
  stopVerifyScanner();
};

const openVerifyDeliveryPin = () => {
  showVerifyDeliveryPin.value = true;
  deliveryPin.value = "";
  deliveryPinError.value = "";
};

const closeVerifyDeliveryPin = () => {
  showVerifyDeliveryPin.value = false;
  deliveryPinError.value = "";
};

// Rider assignment modal functions
const openAssignRiderModal = (order: any) => {
  assignRiderOrder.value = order;
  showAssignRiderModal.value = true;
};

const closeAssignRiderModal = () => {
  showAssignRiderModal.value = false;
  assignRiderOrder.value = null;
};

// Handler for when driver is assigned from modal
const onRiderAssigned = () => {
  closeAssignRiderModal();
  fetchOrders();
};

const stopVerifyScanner = () => {
  scannerActive.value = false;

  if (verifyScanTimer.value) {
    clearInterval(verifyScanTimer.value);
    verifyScanTimer.value = null;
  }

  if (verifyVideoEl.value) {
    try {
      verifyVideoEl.value.pause();
      (verifyVideoEl.value as any).srcObject = null;
    } catch {
      // ignore
    }
  }

  if (verifyStream.value) {
    for (const track of verifyStream.value.getTracks()) {
      try {
        track.stop();
      } catch {
        // ignore
      }
    }
    verifyStream.value = null;
  }
};

const startVerifyScanner = async () => {
  scannerError.value = "";

  if (!import.meta.client) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    scannerError.value = "Camera not available in this browser.";
    return;
  }

  if (!(window as any).BarcodeDetector) {
    scannerError.value =
      "QR scanning is not supported on this device. Use manual entry.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    verifyStream.value = stream;
    if (verifyVideoEl.value) {
      (verifyVideoEl.value as any).srcObject = stream;
      await verifyVideoEl.value.play();
    }

    const detector = new (window as any).BarcodeDetector({
      formats: ["qr_code"],
    });
    scannerActive.value = true;

    verifyScanTimer.value = setInterval(async () => {
      try {
        if (!verifyVideoEl.value || !scannerActive.value) return;
        const barcodes = await detector.detect(verifyVideoEl.value);
        const first =
          Array.isArray(barcodes) && barcodes.length ? barcodes[0] : null;
        const raw = first?.rawValue ? String(first.rawValue) : "";
        if (!raw) return;

        const digits = raw.replace(/\D/g, "");
        const code = digits.length >= 6 ? digits.slice(0, 6) : raw.trim();
        verifyCode.value = code;
        await verifyCollection();
      } catch {
        // ignore scanning transient errors
      }
    }, 600);
  } catch (e: any) {
    scannerError.value = e?.message || "Failed to start camera.";
    stopVerifyScanner();
  }
};

const verifyCollection = async () => {
  if (!selectedOrder.value) return;

  verifyError.value = "";

  const orderId = String(selectedOrder.value.id);
  const code = String(verifyCode.value || "").trim();

  if (!code) {
    verifyError.value = "Please enter the verification code.";
    return;
  }

  verifyingCollection.value = true;
  try {
    // Refresh session to ensure we have a valid token
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn("Session refresh failed, attempting with current session");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    await $fetch("/api/admin/verify-collection", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: { orderId, code },
    });

    stopVerifyScanner();
    showVerifyCollection.value = false;
    await updateStatus(selectedOrder.value, "delivered");
  } catch (e: any) {
    verifyError.value = e?.statusMessage || e?.message || "Validation failed";
  } finally {
    verifyingCollection.value = false;
  }
};

const verifyDeliveryPin = async () => {
  if (!selectedOrder.value) return;

  deliveryPinError.value = "";

  const orderId = String(selectedOrder.value.id);
  const pin = String(deliveryPin.value || "").trim();

  if (!pin) {
    deliveryPinError.value = "Please enter the delivery PIN.";
    return;
  }

  verifyingDeliveryPin.value = true;
  try {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn("Session refresh failed, attempting with current session");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    await $fetch("/api/orders/verify-delivery-pin", {
      method: "POST" as any,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: { orderId, pin },
    });

    showVerifyDeliveryPin.value = false;
    await updateStatus(selectedOrder.value, "delivered");
  } catch (e: any) {
    deliveryPinError.value =
      e?.statusMessage || e?.message || "Validation failed";
  } finally {
    verifyingDeliveryPin.value = false;
  }
};

// Standalone verification modal functions for kanban/table views
const openVerifyModal = (order: any, nextStatus: string) => {
  verifyModalOrder.value = order;
  verifyModalNextStatus.value = nextStatus;
  showVerifyModal.value = true;
  verifyModalError.value = "";
};

const closeVerifyModal = () => {
  showVerifyModal.value = false;
  verifyModalOrder.value = null;
  verifyModalNextStatus.value = "";
  verifyModalError.value = "";
};

// Handler for standalone modal verification (kanban/table views)
async function onVerifyModalSubmit(code: string) {
  if (!verifyModalOrder.value) return;

  verifyModalError.value = "";
  const order = verifyModalOrder.value;
  const isPickup = order.delivery_method === "pickup";

  verifyingModal.value = true;
  try {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn("Session refresh failed, attempting with current session");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (isPickup) {
      await $fetch("/api/admin/verify-collection", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { orderId: order.id, code },
      });
    } else {
      await $fetch("/api/orders/verify-delivery-pin", {
        method: "POST" as any,
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { orderId: order.id, pin: code },
      });
    }

    showVerifyModal.value = false;
    // For pickup: pass verification code to updateStatus
    // For delivery: verify-delivery-pin API already updates status, just refresh
    if (isPickup) {
      await updateStatus(order, "delivered", code);
    } else {
      await fetchOrders();
    }
  } catch (e: any) {
    verifyModalError.value =
      e?.statusMessage || e?.message || "Verification failed";
  } finally {
    verifyingModal.value = false;
  }
}

// Handler for order details collection verification
async function onVerifyCollectionSubmit(code: string) {
  if (!selectedOrder.value) return;

  verifyError.value = "";
  const orderId = String(selectedOrder.value.id);

  verifyingCollection.value = true;
  try {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn("Session refresh failed, attempting with current session");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    await $fetch("/api/admin/verify-collection", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { orderId, code },
    });

    stopVerifyScanner();
    showVerifyCollection.value = false;
    await updateStatus(selectedOrder.value, "delivered", code);
  } catch (e: any) {
    verifyError.value = e?.statusMessage || e?.message || "Validation failed";
  } finally {
    verifyingCollection.value = false;
  }
}

// Handler for order details delivery verification
async function onVerifyDeliverySubmit(pin: string) {
  if (!selectedOrder.value) return;

  deliveryPinError.value = "";
  const orderId = String(selectedOrder.value.id);

  verifyingDeliveryPin.value = true;
  try {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn("Session refresh failed, attempting with current session");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    await $fetch("/api/orders/verify-delivery-pin", {
      method: "POST" as any,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { orderId, pin },
    });

    showVerifyDeliveryPin.value = false;
    // verify-delivery-pin API already updates status to delivered
    await fetchOrders();
  } catch (e: any) {
    deliveryPinError.value =
      e?.statusMessage || e?.message || "Validation failed";
  } finally {
    verifyingDeliveryPin.value = false;
  }
}

// Helper to check if verification is required before status update
const shouldVerifyBeforeComplete = (order: any, nextStatus: string) => {
  return nextStatus === "delivered";
};

// Wrapper for kanban/table status updates that shows verification modal when needed
const handleStatusUpdateWithVerify = (order: any) => {
  const nextStatus = getNextStatus(order);
  const isDelivery = order.delivery_method === "delivery";

  // Show rider assignment modal for delivery orders at completed_in_pos
  if (isDelivery && order.status === "completed_in_pos") {
    openAssignRiderModal(order);
    return;
  }

  if (shouldVerifyBeforeComplete(order, nextStatus)) {
    openVerifyModal(order, nextStatus);
    return;
  }

  // No verification needed - proceed with normal update
  updateStatus(order, nextStatus);
};

const kanbanColumns = [
  { status: "pending", title: "Pending Orders" },
  { status: "confirmed", title: "Confirmed" },
  { status: "ready_for_pos", title: "Ready for POS" },
  { status: "completed_in_pos", title: "POS Completed" },
  { status: "assigned", title: "Assigned" },
  { status: "picked_up", title: "Picked Up" },
  { status: "arrived", title: "Arrived" },
];

const getNextStatus = (orderOrStatus: any) => {
  const currentStatus =
    typeof orderOrStatus === "string" ? orderOrStatus : orderOrStatus?.status;
  const deliveryMethod =
    typeof orderOrStatus === "string" ? null : orderOrStatus?.delivery_method;

  // Pickup branch: also goes through POS stages for consistent sales tracking
  if (deliveryMethod === "pickup") {
    const workflowPickup: Record<string, string> = {
      pending: "confirmed",
      confirmed: "ready_for_pos",
      ready_for_pos: "completed_in_pos",
      completed_in_pos: "picked_up",
      picked_up: "arrived",
      arrived: "delivered",
    };
    return workflowPickup[currentStatus] || currentStatus;
  }

  // Delivery branch (with POS stages)
  const workflowDelivery: Record<string, string> = {
    pending: "confirmed",
    confirmed: "ready_for_pos",
    ready_for_pos: "completed_in_pos",
    completed_in_pos: "assigned",
    assigned: "picked_up",
    picked_up: "arrived",
    arrived: "delivered",
  };
  return workflowDelivery[currentStatus] || currentStatus;
};

const getNextStatusLabel = (orderOrStatus: any) => {
  const currentStatus =
    typeof orderOrStatus === "string" ? orderOrStatus : orderOrStatus?.status;
  const deliveryMethod =
    typeof orderOrStatus === "string" ? null : orderOrStatus?.delivery_method;
  const nextStatus = getNextStatus(orderOrStatus);

  if (nextStatus === currentStatus) return "Update";

  if (deliveryMethod === "pickup") {
    const labelsPickup: Record<string, string> = {
      pending: "Confirm Order",
      confirmed: "Send to POS",
      ready_for_pos: "Mark POS Done",
      completed_in_pos: "Mark as Ready",
      picked_up: "Mark Arrived",
      arrived: "Mark Collected",
    };
    return labelsPickup[currentStatus] || "Update";
  }

  const labelsDelivery: Record<string, string> = {
    pending: "Confirm Order",
    confirmed: "Send to POS",
    ready_for_pos: "Mark POS Done",
    completed_in_pos: "Assign Rider",
    assigned: "Hand to Rider",
    picked_up: "Mark Arrived",
    arrived: "Mark Delivered",
  };
  return labelsDelivery[currentStatus] || "Update";
};

const filteredOrders = computed(() => {
  // First apply super admin branch filter if set
  let baseOrders = orders.value;
  if (userStore.isSuperAdmin && adminStoreFilter.value) {
    baseOrders = baseOrders.filter(
      (o) => o.store_id === adminStoreFilter.value,
    );
  }

  return baseOrders.filter((order) => {
    const matchesSearch =
      !searchQuery.value ||
      order.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      order.customer_name
        ?.toLowerCase()
        .includes(searchQuery.value.toLowerCase()) ||
      order.delivery_details?.contactPhone?.includes(searchQuery.value);

    const matchesStore =
      !storeFilter.value || order.store_id === storeFilter.value;
    const matchesPayment =
      !paymentFilter.value || order.payment_method === paymentFilter.value;

    return matchesSearch && matchesStore && matchesPayment;
  });
});

// Paginated orders for table view
const paginatedTableOrders = computed(() => {
  const start = (tablePage.value - 1) * tablePageSize.value;
  const end = start + tablePageSize.value;
  return filteredOrders.value.slice(start, end);
});

const totalTablePages = computed(() => {
  return Math.ceil(filteredOrders.value.length / tablePageSize.value);
});

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("en-NG").format(num);
};

const getTimeElapsed = (createdAt: string) => {
  const minutes = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60000,
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const getOrdersByStatus = (status: string) => {
  return filteredOrders.value.filter((o) => o.status === status);
};

// getNextStatus and getNextStatusLabel are now context-aware (pickup vs delivery)

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700",
    confirmed: "bg-blue-100 text-blue-700",
    ready_for_pos: "bg-cyan-100 text-cyan-700",
    completed_in_pos: "bg-teal-100 text-teal-700",
    assigned: "bg-purple-100 text-purple-700",
    picked_up: "bg-yellow-100 text-yellow-700",
    arrived: "bg-indigo-100 text-indigo-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return classes[status] || "bg-gray-100 text-gray-700";
};

const getProgressPercentage = (status: string) => {
  const percentages: Record<string, number> = {
    pending: 10,
    confirmed: 20,
    ready_for_pos: 35,
    completed_in_pos: 50,
    assigned: 60,
    picked_up: 75,
    arrived: 90,
  };
  return percentages[status] || 0;
};

const fetchOrders = async () => {
  // Build base query
  let query = supabase
    .from("orders")
    .select(
      `
      *,
      stores!store_id(name, delivery_mode)
    `,
    )
    .in("status", [
      "pending",
      "confirmed",
      "ready_for_pos",
      "completed_in_pos",
      "assigned",
      "picked_up",
      "arrived",
    ])
    .order("created_at", { ascending: true });

  // Apply role-based filtering
  console.log(
    "[Orders] Role:",
    currentUserRole.value,
    "Store IDs:",
    currentUserStoreIds.value,
  );

  if (currentUserRole.value === "branch_manager") {
    if (currentUserStoreIds.value.length > 0) {
      // Branch managers see orders for ALL their assigned stores
      console.log(
        "[Orders] Applying branch manager filter for stores:",
        currentUserStoreIds.value,
      );
      query = query.in("store_id", currentUserStoreIds.value);
    } else {
      // No store assigned - show warning and return empty (should not happen)
      console.error("[Orders] Branch manager has no store_id assigned!");
      toast.add({
        title: "Configuration Error",
        description:
          "Your account is not assigned to a branch. Please contact the administrator.",
        color: "error",
      });
      orders.value = [];
      return;
    }
  }

  // Super admins: apply branch filter if selected in admin store
  if (userStore.isSuperAdmin && adminStore.currentStoreId) {
    query = query.eq("store_id", adminStore.currentStoreId);
  }
  // Super admins see all orders when no branch filter is set

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }

  // Get unique store IDs and user IDs for lookup
  const storeIds = [
    ...new Set((data as any[])?.map((o: any) => o.store_id).filter(Boolean)),
  ];
  const userIds = [
    ...new Set((data as any[])?.map((o: any) => o.user_id).filter(Boolean)),
  ];

  // Fetch store names (skip if no orders)
  const storeMap: Record<string, any> = {};
  if (storeIds.length > 0) {
    const { data: storesData } = (await supabase
      .from("stores")
      .select("id, name, delivery_mode")
      .in("id", storeIds)) as any;
    for (const s of storesData || []) {
      storeMap[s.id] = s;
    }
  }

  // Fetch user profiles (skip if no orders)
  const profileMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profilesData } = (await supabase
      .from("profiles")
      .select("id, full_name, phone_number")
      .in("id", userIds)) as any;
    Object.assign(
      profileMap,
      Object.fromEntries((profilesData || []).map((p: any) => [p.id, p])),
    );
  }

  orders.value = (data || []).map((order: any) => ({
    ...order,
    store_name: storeMap[order.store_id]?.name || order.stores?.name,
    store_delivery_mode: storeMap[order.store_id]?.delivery_mode,
    customer_name: order.contact_name || profileMap[order.user_id]?.full_name,
    customer_phone:
      order.contact_phone || profileMap[order.user_id]?.phone_number,
    item_count: Array.isArray(order.items) ? order.items.length : 0,
  }));
};

const fetchStores = async () => {
  // Branch managers: fetch ALL their assigned stores
  if (
    currentUserRole.value === "branch_manager" &&
    currentUserStoreIds.value.length > 0
  ) {
    const { data } = await supabase
      .from("stores")
      .select("id, name")
      .in("id", currentUserStoreIds.value)
      .eq("is_active", true);
    if (data) stores.value = data;
    // Only auto-set filter if manager has exactly ONE store
    // For multi-store managers, leave filter empty to show all orders
    if (currentUserStoreIds.value.length === 1) {
      storeFilter.value = currentUserStoreId.value || "";
    }
    return;
  }

  // Super admins and others: fetch all stores
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true);
  if (data) stores.value = data;
};

const updateStatus = async (
  order: any,
  newStatus: string,
  verificationCode?: string,
) => {
  processing.value.add(order.id);

  let updateError: any = null;
  try {
    // Refresh session to ensure we have a valid token
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn("Session refresh failed, attempting with current session");
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error("Your session has expired. Please log in again.");
    }

    await $fetch("/api/admin/update-order-status", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        orderId: order.id,
        status: newStatus,
        verificationCode,
      },
    });
  } catch (err: any) {
    updateError = err;
    console.error("Error updating order status via admin API:", {
      orderId: order.id,
      newStatus,
      err,
    });
  }

  if (!updateError) {
    await fetchOrders();
    if (selectedOrder.value?.id === order.id) {
      selectedOrder.value.status = newStatus;
    }

    const shortId = order?.id ? String(order.id).slice(-6).toUpperCase() : "";
    toast.add({
      title: "Status Updated",
      description: shortId
        ? `Order #${shortId} updated successfully.`
        : "Order updated successfully.",
      color: "success",
    });
  } else {
    const shortId = order?.id ? String(order.id).slice(-6).toUpperCase() : "";
    toast.add({
      title: "Update Failed",
      description: shortId
        ? `Could not update Order #${shortId}.`
        : "Could not update order.",
      color: "error",
    });
  }

  processing.value.delete(order.id);
};

const cancelOrder = async (order: any) => {
  processing.value.add(order.id);

  const { error } = await (supabase as any)
    .from("orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    console.error("Error cancelling order:", { orderId: order.id, error });
  }

  if (!error) {
    await fetchOrders();
    selectedOrder.value = null;
  }

  processing.value.delete(order.id);
};

const openOrderDetails = (order: any) => {
  selectedOrder.value = order;
};

const customerViewLabel = (order: any) => {
  const fulfillmentType = (order?.delivery_method ||
    "delivery") as FulfillmentType;
  const label = getStatusLabel(order?.status, fulfillmentType);
  return `Client Sees: ${label}`;
};

const riderViewLabel = (order: any) => {
  if (order?.delivery_method !== "delivery") return null;

  const status = String(order?.status || "");
  const isPOD = String(order?.payment_method || "") === "pod";

  // Align with driverStore.nextActionText / driver dashboard wording
  if (status === "assigned") return "Rider Sees: Confirm Pickup at Store";
  if (status === "picked_up") return "Rider Sees: Arrived at Customer";
  if (status === "arrived")
    return `Rider Sees: ${isPOD ? "Confirm Payment & Close Order" : "Enter Delivery PIN"}`;
  return null;
};

const arrivalAlerts = ref<
  { orderId: string; customerName?: string; arrivedAt: string }[]
>([]);
const alertedArrivalOrderIds = ref<Set<string>>(new Set());

const playArrivalBeep = () => {
  if (!import.meta.client) return;
  try {
    const AudioContextCtor =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);

    oscillator.onended = () => {
      try {
        ctx.close();
      } catch {}
    };
  } catch (e) {
    console.error("Failed to play arrival beep:", e);
  }
};

const handlePickupArrivalAlert = (order: any) => {
  const arrivedAt = order?.metadata?.pickup_arrived_at;
  if (!arrivedAt) return;
  if (alertedArrivalOrderIds.value.has(order.id)) return;

  alertedArrivalOrderIds.value.add(order.id);
  arrivalAlerts.value.unshift({
    orderId: order.id,
    customerName: order.customer_name,
    arrivedAt,
  });

  if (arrivalAlerts.value.length > 5) {
    arrivalAlerts.value = arrivalAlerts.value.slice(0, 5);
  }

  playArrivalBeep();
};

const setupRealtime = () => {
  realtimeChannel.value = supabase
    .channel("active-orders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload: any) => {
        const oldArrivedAt = payload?.old?.metadata?.pickup_arrived_at;
        const newArrivedAt = payload?.new?.metadata?.pickup_arrived_at;
        if (!oldArrivedAt && newArrivedAt) {
          handlePickupArrivalAlert(payload.new);
        }
        fetchOrders();
      },
    )
    .subscribe();
};

// Watch for admin store branch filter changes (for super admin)
watch(
  () => adminStore.currentStoreId,
  (newStoreId) => {
    if (userStore.isSuperAdmin) {
      console.log(
        "Super Admin branch filter changed:",
        newStoreId || "All Stores",
      );
      fetchOrders();
    }
  },
  { immediate: true },
);

onMounted(() => {
  fetchOrders();
  fetchStores();
  setupRealtime();
});

onUnmounted(() => {
  realtimeChannel.value?.unsubscribe();
});
</script>
