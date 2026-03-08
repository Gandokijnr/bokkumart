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

        <div class="space-y-3">
          <div
            v-for="order in getOrdersByStatus(column.status)"
            :key="order.id"
            class="relative cursor-pointer rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md overflow-hidden"
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
              <span class="font-mono text-xs font-bold text-gray-900">
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

            <p class="mt-1 text-sm font-medium text-gray-900">
              {{ order.customer_name || "N/A" }}
            </p>
            <p class="text-xs text-gray-500">{{ order.store_name }}</p>

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
                  @click.stop="updateStatus(order, getNextStatus(order))"
                  :disabled="processing.has(order.id)"
                  class="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
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
              v-for="order in filteredOrders"
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
                    @click="updateStatus(order, getNextStatus(order))"
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
    </div>

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

        <div
          v-if="showVerifyCollection"
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-bold text-amber-900">Verify Customer Collection</p>
              <p class="mt-1 text-sm text-amber-800">
                Please scan the customer's QR code or enter their 6-digit
                verification code.
              </p>
            </div>
            <button
              @click="closeVerifyCollection()"
              class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              Close
            </button>
          </div>

          <div class="mt-3 grid gap-3">
            <div class="rounded-lg bg-white p-3">
              <p class="text-xs font-semibold text-gray-700">Manual Code</p>
              <input
                v-model="verifyCode"
                inputmode="numeric"
                maxlength="6"
                placeholder="Enter 6-digit code"
                class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <button
                @click="verifyCollection()"
                :disabled="
                  verifyingCollection || !verifyCode || verifyCode.length < 4
                "
                class="mt-2 w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{
                  verifyingCollection
                    ? "Verifying..."
                    : "Verify & Mark Collected"
                }}
              </button>
              <p
                v-if="verifyError"
                class="mt-2 text-xs font-semibold text-red-600"
              >
                {{ verifyError }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="showVerifyDeliveryPin"
          class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-bold text-emerald-900">Verify Delivery PIN</p>
              <p class="mt-1 text-sm text-emerald-800">
                Enter the customer's delivery PIN to complete this delivery.
              </p>
            </div>
            <button
              @click="closeVerifyDeliveryPin()"
              class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Close
            </button>
          </div>

          <div class="mt-3 grid gap-3">
            <div class="rounded-lg bg-white p-3">
              <p class="text-xs font-semibold text-gray-700">Delivery PIN</p>
              <input
                v-model="deliveryPin"
                inputmode="numeric"
                maxlength="6"
                placeholder="Enter PIN"
                class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button
                @click="verifyDeliveryPin()"
                :disabled="
                  verifyingDeliveryPin || !deliveryPin || deliveryPin.length < 4
                "
                class="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{
                  verifyingDeliveryPin
                    ? "Verifying..."
                    : "Verify & Mark Delivered"
                }}
              </button>
              <p
                v-if="deliveryPinError"
                class="mt-2 text-xs font-semibold text-red-600"
              >
                {{ deliveryPinError }}
              </p>
            </div>
          </div>
        </div>

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
            <div v-if="activeStepAction" class="flex-1">
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
  </div>
</template>

<script setup lang="ts">
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types";
import { useUserStore } from "~/stores/user";
import {
  getStatusLabel,
  type FulfillmentType,
} from "~/composables/useUserOrders";
import { useToast } from "~/composables/useToast";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

const supabase = useSupabaseClient();
const toast = useToast();
const userStore = useUserStore();

// Get current user role
const currentUserRole = computed(() => userStore.profile?.role || "customer");
const currentUserStoreId = computed(() => userStore.profile?.store_id);

const orders = ref<any[]>([]);
const stores = ref<any[]>([]);
const processing = ref<Set<string>>(new Set());
const realtimeChannel = ref<RealtimeChannel | null>(null);

const searchQuery = ref("");
const storeFilter = ref("");
const paymentFilter = ref("");
const viewMode = ref<"kanban" | "table">("kanban");

const selectedOrder = ref<any>(null);

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
  return orders.value.filter((order) => {
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
  if (currentUserRole.value === "branch_manager" && currentUserStoreId.value) {
    // Branch managers only see orders for their assigned store
    query = query.eq("store_id", currentUserStoreId.value);
  }
  // Super admins see all orders (no additional filter)

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
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true);
  if (data) stores.value = data;
};

const updateStatus = async (order: any, newStatus: string) => {
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

onMounted(() => {
  fetchOrders();
  fetchStores();
  setupRealtime();
});

onUnmounted(() => {
  realtimeChannel.value?.unsubscribe();
});
</script>
