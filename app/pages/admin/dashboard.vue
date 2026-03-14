<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import {
  useAdminStore,
  type AdminOrder,
  type AdminOrderStatus,
} from "~/stores/admin";
import { useUserStore } from "~/stores/user";
import { useInfiniteScroll } from "~/composables/useInfiniteScroll";
import { useDashboard } from "~/composables/useDashboard";
import OrderVerificationModal from "~/components/OrderVerificationModal.vue";

// Page meta
useHead({
  title: "Admin ERP Dashboard - BokkuMart",
});

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

// Stores
const adminStore = useAdminStore();
const userStore = useUserStore();
const dashboard = useDashboard();
const toast = useToast();

// Tab state
const activeTab = ref<"pulse" | "processing" | "delivery" | "completed">(
  "pulse",
);

// Branch switching (for Super Admin)
const showBranchSwitcher = ref(false);

// Verification modal state
const showVerifyModal = ref(false);
const verifyingOrder = ref<AdminOrder | null>(null);
const verificationForm = ref({
  verifiedAddress: false,
  verifiedAmount: false,
  verifiedSubstitutions: false,
  substitutionApproved: false,
  substitutionDetails: "",
  notes: "",
});

// Rider dispatch modal
const showRiderModal = ref(false);
const riderOrder = ref<AdminOrder | null>(null);
const riderForm = ref({
  name: "",
  phone: "",
  estimatedArrival: "",
});

// Customer blacklist modal
const showBlacklistModal = ref(false);
const blacklistUserId = ref("");
const blacklistForm = ref<{
  type:
    | "pod_disabled"
    | "account_suspended"
    | "order_limit"
    | "manual_verification_required";
  reason: string;
  details: string;
  expiresAt: string;
}>({
  type: "manual_verification_required",
  reason: "",
  details: "",
  expiresAt: "",
});

// Order notes
const orderNotes = ref<Record<string, string>>({});

// Computed
const stats = computed(() => adminStore.dashboardStats);
const isAdmin = computed(() => userStore.isAdmin);
const isManager = computed(() => userStore.isManager);
const currentStoreName = computed(() => {
  const store = adminStore.availableStores.find(
    (s) => s.id === adminStore.currentStoreId,
  );
  return store?.name || "All Stores";
});

const filteredOrders = computed(() => {
  switch (activeTab.value) {
    case "processing":
      return adminStore.processingOrders;
    case "delivery":
      return adminStore.deliveryOrders;
    case "completed":
      return adminStore.completedOrders;
    default:
      return adminStore.filteredOrders.slice(0, 10);
  }
});

const handleLowStockClick = () => {
  if (dashboard.effectiveRole.value === "branch_manager") {
    navigateTo({
      path: "/admin/branch-inventory",
      query: { status: "low_stock" },
    });
    return;
  }

  navigateTo({ path: "/admin/inventory", query: { status: "low_stock" } });
};

// Refs for infinite scroll
const ordersContainer = ref<HTMLElement | null>(null);
const isLoadingMore = ref(false);

// Lifecycle
onMounted(async () => {
  await adminStore.initialize();

  // For staff/branch managers: auto-set store from profile if not already set
  const role = userStore.profile?.role;
  const userStoreId = userStore.profile?.store_id;
  if (
    (role === "staff" || role === "branch_manager") &&
    userStoreId &&
    !adminStore.currentStoreId
  ) {
    adminStore.setCurrentStore(userStoreId);
  }

  await dashboard.startDashboard();

  // Setup infinite scroll after DOM is ready
  await nextTick();
  setupInfiniteScroll();
});

// Infinite scroll setup
function setupInfiniteScroll() {
  if (!ordersContainer.value) return;

  const { isLoading, hasMore, loadMore, updateHasMore } = useInfiniteScroll(
    ordersContainer,
    async () => {
      if (activeTab.value === "pulse") return;
      isLoadingMore.value = true;
      try {
        const hasMoreOrders = await adminStore.fetchMoreOrders();
        updateHasMore(hasMoreOrders);
      } finally {
        isLoadingMore.value = false;
      }
    },
    { threshold: 300, rootMargin: "300px" },
  );
}

onUnmounted(() => {
  adminStore.cleanup();
  dashboard.stopAll();
});

// Methods
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    processing: "bg-blue-100 text-blue-800 border-blue-200",
    paid: "bg-green-100 text-green-800 border-green-200",
    confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    picked_up: "bg-indigo-100 text-indigo-800 border-indigo-200",
    delivered: "bg-gray-100 text-gray-800 border-gray-200",
    cancelled: "bg-blue-100 text-blue-800 border-blue-200",
    refunded: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    paid: "Paid",
    confirmed: "Confirmed",
    picked_up: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };
  return labels[status] || status;
}

// Branch switching
async function switchBranch(storeId: string | null) {
  adminStore.setCurrentStore(storeId);
  showBranchSwitcher.value = false;
  toast.add({
    title: "Branch Switched",
    description: storeId
      ? `Viewing ${currentStoreName.value}`
      : "Viewing all branches",
    color: "success",
  });
}

// Order claiming
async function handleClaimOrder(orderId: string) {
  const success = await adminStore.claimOrder(orderId);
  if (!success) {
    toast.add({
      title: "Already Claimed",
      description: "This order was claimed by another staff member",
      color: "warning",
    });
  }
}

async function handleReleaseOrder(orderId: string) {
  await adminStore.releaseOrder(orderId);
}

// Verification workflow
function openVerifyModal(order: AdminOrder) {
  verifyingOrder.value = order;
  verificationForm.value = {
    verifiedAddress: false,
    verifiedAmount: false,
    verifiedSubstitutions: false,
    substitutionApproved: false,
    substitutionDetails: "",
    notes: "",
  };
  showVerifyModal.value = true;
}

async function handleVerifyOrder() {
  if (!verifyingOrder.value) return;

  const success = await adminStore.verifyOrder(verifyingOrder.value.id, {
    verifiedAddress: verificationForm.value.verifiedAddress,
    verifiedAmount: verificationForm.value.verifiedAmount,
    verifiedSubstitutions: verificationForm.value.verifiedSubstitutions,
    substitutionApproved: verificationForm.value.substitutionApproved,
    substitutionDetails: verificationForm.value.substitutionDetails,
    notes: verificationForm.value.notes,
  });

  if (success) {
    showVerifyModal.value = false;
    verifyingOrder.value = null;
    toast.add({
      title: "Order Verified",
      description: "Order confirmed and ready for processing",
      color: "success",
    });
  }
}

async function handleRejectOrder(orderId: string, reason: string) {
  await adminStore.rejectOrder(orderId, reason);
  toast.add({
    title: "Order Rejected",
    description: "Order has been cancelled",
    color: "warning",
  });
}

// Rider dispatch
function openRiderModal(order: AdminOrder) {
  riderOrder.value = order;
  riderForm.value = { name: "", phone: "", estimatedArrival: "" };
  showRiderModal.value = true;
}

async function handleDispatchRider() {
  if (!riderOrder.value) return;

  const dispatchId = await adminStore.dispatchRider(riderOrder.value.id, {
    name: riderForm.value.name,
    phone: riderForm.value.phone,
    estimatedArrival: riderForm.value.estimatedArrival || undefined,
  });

  if (dispatchId) {
    showRiderModal.value = false;
    riderOrder.value = null;
    toast.add({
      title: "Rider Dispatched",
      description: "Rider assigned to order",
      color: "success",
    });
  }
}

// Customer blacklist
function openBlacklistModal(userId: string) {
  blacklistUserId.value = userId;
  blacklistForm.value = {
    type: "pod_disabled",
    reason: "",
    details: "",
    expiresAt: "",
  };
  showBlacklistModal.value = true;
}

async function handleAddRestriction() {
  const restrictionId = await adminStore.addCustomerRestriction(
    blacklistUserId.value,
    {
      type: blacklistForm.value.type,
      reason: blacklistForm.value.reason,
      details: blacklistForm.value.details || undefined,
      expiresAt: blacklistForm.value.expiresAt || undefined,
    },
  );

  if (restrictionId) {
    showBlacklistModal.value = false;
    toast.add({
      title: "Restriction Added",
      description: "Customer restriction applied",
      color: "warning",
    });
  }
}

// Call customer (tel: link)
function callCustomer(phone: string | null) {
  if (phone) {
    window.open(`tel:${phone}`, "_self");
  }
}

// One-click call with logging
async function handleCall(order: AdminOrder) {
  // Log the call attempt (will silently fail if migration not applied)
  await adminStore.logInteraction(order.id, "call_attempt", null, {
    notes: "One-click call initiated",
  });

  // Open tel: link
  if (order.contact_phone) {
    callCustomer(order.contact_phone);
  }
}

// Handle status change from dropdown
async function handleStatusChange(orderId: string, newStatus: string) {
  const success = await adminStore.updateOrderStatus(
    orderId,
    newStatus as AdminOrderStatus,
  );
  if (success) {
    toast.add({
      title: "Status Updated",
      description: `Order status changed to ${getStatusLabel(newStatus)}`,
      color: "success",
    });
  } else {
    toast.add({
      title: "Update Failed",
      description: "Could not update order status. Check console for details.",
      color: "error",
    });
  }
}

// Save notes
async function saveNote(orderId: string) {
  const note = orderNotes.value[orderId];
  if (!note?.trim()) return;

  await adminStore.logInteraction(orderId, "note_added", null, {
    notes: note,
  });

  orderNotes.value[orderId] = "";
  toast.add({
    title: "Note Saved",
    color: "success",
  });
}

// Collection verification modal
const showCollectionModal = ref(false);
const collectionOrder = ref<AdminOrder | null>(null);
const collectionPinError = ref("");
const verifyingCollection = ref(false);

function openVerifyCollection(order: AdminOrder) {
  collectionOrder.value = order;
  collectionPinError.value = "";
  showCollectionModal.value = true;
}

function closeVerifyCollection() {
  showCollectionModal.value = false;
  collectionOrder.value = null;
  collectionPinError.value = "";
}

async function handleVerifyCollectionPin(pin: string) {
  if (!collectionOrder.value) return;

  verifyingCollection.value = true;
  collectionPinError.value = "";
  try {
    const success = await adminStore.verifyCollection(
      collectionOrder.value.id,
      pin,
    );

    if (success) {
      showCollectionModal.value = false;
      collectionOrder.value = null;
      toast.add({
        title: "Collection Verified",
        description: "Order marked as collected",
        color: "success",
      });
    } else {
      collectionPinError.value = "Invalid PIN. Please try again.";
    }
  } catch (e: any) {
    collectionPinError.value = e?.message || "Verification failed";
  } finally {
    verifyingCollection.value = false;
  }
}

// Delivery PIN verification modal
const showDeliveryPinModal = ref(false);
const deliveryPinOrder = ref<AdminOrder | null>(null);
const deliveryPinError = ref("");
const verifyingDeliveryPin = ref(false);

function openVerifyDeliveryPin(order: AdminOrder) {
  deliveryPinOrder.value = order;
  deliveryPinError.value = "";
  showDeliveryPinModal.value = true;
}

function closeVerifyDeliveryPin() {
  showDeliveryPinModal.value = false;
  deliveryPinOrder.value = null;
  deliveryPinError.value = "";
}

async function handleVerifyDeliveryPinCode(pin: string) {
  if (!deliveryPinOrder.value) return;

  verifyingDeliveryPin.value = true;
  deliveryPinError.value = "";
  try {
    const success = await adminStore.verifyDelivery(
      deliveryPinOrder.value.id,
      pin,
    );

    if (success) {
      showDeliveryPinModal.value = false;
      deliveryPinOrder.value = null;
      toast.add({
        title: "Delivery Verified",
        description: "Order marked as delivered",
        color: "success",
      });
    } else {
      deliveryPinError.value = "Invalid PIN. Please try again.";
    }
  } catch (e: any) {
    deliveryPinError.value = e?.message || "Verification failed";
  } finally {
    verifyingDeliveryPin.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo & Title -->
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"
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
              <h1 class="text-xl font-bold text-gray-900">Admin ERP</h1>
              <p class="text-xs text-gray-500">Operations Dashboard</p>
            </div>
          </div>

          <!-- Branch Switcher (Super Admin only) -->
          <div class="flex items-center gap-3">
            <button
              v-if="isAdmin"
              @click="showBranchSwitcher = true"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg
                class="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span class="text-sm font-medium text-gray-700">{{
                currentStoreName
              }}</span>
              <svg
                class="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div v-else class="text-sm text-gray-600">
              {{ currentStoreName }}
            </div>

            <!-- Refresh button -->
            <button
              @click="adminStore.fetchOrders()"
              :disabled="adminStore.loading"
              class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              :class="{ 'animate-spin': adminStore.loading }"
            >
              <svg
                class="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-t border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex space-x-1 -mb-px">
            <button
              v-for="tab in [
                { key: 'pulse', label: 'Pulse', icon: 'activity' },
                {
                  key: 'processing',
                  label: 'Processing',
                  icon: 'package',
                  count: adminStore.processingOrders.length,
                },
                {
                  key: 'delivery',
                  label: 'Delivery',
                  icon: 'truck',
                  count: adminStore.deliveryOrders.length,
                },
                { key: 'completed', label: 'Completed', icon: 'check' },
              ]"
              :key="tab.key"
              @click="activeTab = tab.key as any"
              class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
              :class="[
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  v-if="tab.icon === 'activity'"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
                <path
                  v-else-if="tab.icon === 'package'"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
                <path
                  v-else-if="tab.icon === 'truck'"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {{ tab.label }}
              <span
                v-if="tab.count"
                class="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700"
              >
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- PULSE DASHBOARD -->
      <div v-if="activeTab === 'pulse'" class="space-y-6">
        <!-- Stats Cards -->
        <AdminStatsCards
          mode="dashboard"
          :stats="dashboard.stats.value"
          :loading="dashboard.loading.value"
          :show-revenue="dashboard.showRevenue.value"
          :format-naira="dashboard.formatNaira"
          @low-stock-click="handleLowStockClick"
        />

        <OperationalKpiCards
          :kpis="dashboard.operationalKpis.value"
          :loading="dashboard.operationalLoading.value"
          :format-naira="dashboard.formatNaira"
        />

        <!-- Recent Orders Preview -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div class="divide-y divide-gray-200">
            <div
              v-for="order in filteredOrders.slice(0, 5)"
              :key="order.id"
              class="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <span class="text-sm font-medium text-gray-900">
                    #{{ order.id.slice(-6).toUpperCase() }}
                  </span>
                  <span
                    :class="`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(order.status)}`"
                  >
                    {{ getStatusLabel(order.status) }}
                  </span>
                  <span class="text-sm text-gray-600">{{
                    order.contact_name || "Unknown"
                  }}</span>
                  <span class="text-sm text-gray-500">{{
                    formatCurrency(order.total_amount)
                  }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500">{{
                    formatTimeAgo(order.created_at)
                  }}</span>
                  <button
                    v-if="order.status === 'awaiting_call' && !order.claimed_by"
                    @click="handleClaimOrder(order.id)"
                    class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Claim
                  </button>
                  <button
                    v-else-if="order.claimed_by"
                    @click="handleReleaseOrder(order.id)"
                    class="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Release
                  </button>
                </div>
              </div>
            </div>
            <div
              v-if="filteredOrders.length === 0"
              class="px-6 py-8 text-center text-gray-500"
            >
              No orders to display
            </div>
          </div>
        </div>
      </div>

      <!-- ORDER TABS (Verification, Processing, Delivery, Completed) -->
      <div
        v-else
        ref="ordersContainer"
        class="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2"
      >
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          :class="{ 'ring-2 ring-blue-500': order.claimed_by }"
        >
          <!-- Order Header -->
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <span class="text-lg font-bold text-gray-900">
                  #{{ order.id.slice(-6).toUpperCase() }}
                </span>
                <span
                  :class="`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(order.status)}`"
                >
                  {{ getStatusLabel(order.status) }}
                </span>
                <span class="text-sm text-gray-600">{{
                  order.store?.name
                }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="order.claimed_by"
                  class="text-xs text-blue-600 font-medium"
                >
                  Claimed
                </span>
                <span class="text-sm text-gray-500">{{
                  formatTimeAgo(order.created_at)
                }}</span>
              </div>
            </div>
          </div>

          <!-- Order Body -->
          <div class="p-6">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Customer Info -->
              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-2">Customer</h3>
                <p class="text-base font-medium text-gray-900">
                  {{ order.contact_name || "Unknown" }}
                </p>
                <p class="text-sm text-gray-600">{{ order.contact_phone }}</p>
                <p class="text-xs text-gray-500 mt-1">
                  User ID: {{ order.user_id?.slice(-8) }}
                </p>
                <button
                  v-if="order.contact_phone"
                  @click="handleCall(order)"
                  class="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call Customer
                </button>
              </div>

              <!-- Order Details -->
              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-2">
                  Order Details
                </h3>
                <p class="text-sm text-gray-900">
                  <span class="font-medium">Total:</span>
                  {{ formatCurrency(order.total_amount) }}
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Subtotal:</span>
                  {{ formatCurrency(order.subtotal) }}
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Service Fee:</span>
                  {{ formatCurrency(order.metadata?.service_fee || 0) }}
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Delivery Fee:</span>
                  {{ formatCurrency(order.delivery_fee) }}
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Payment:</span>
                  {{
                    order.paystack_reference
                      ? "Online (Paystack)"
                      : order.payment_method || "Unknown"
                  }}
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Method:</span>
                  {{
                    order.delivery_method === "pickup"
                      ? "Store Pickup"
                      : "Home Delivery"
                  }}
                </p>
                <p class="text-sm text-gray-600">
                  <span class="font-medium">Store:</span>
                  {{ order.store?.name || "Unknown" }}
                </p>
              </div>

              <!-- Actions -->
              <div class="flex flex-col gap-2">
                <!-- Pending/Processing: Claim/Verify/Reject -->
                <div
                  v-if="
                    order.status === 'pending' || order.status === 'processing'
                  "
                  class="flex gap-2"
                >
                  <button
                    v-if="!order.claimed_by"
                    @click="handleClaimOrder(order.id)"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Claim Order
                  </button>
                  <template v-else>
                    <button
                      @click="openVerifyModal(order)"
                      class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Verify
                    </button>
                    <button
                      @click="
                        handleRejectOrder(order.id, 'customer_not_available')
                      "
                      class="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Reject
                    </button>
                  </template>
                </div>

                <!-- Confirmed: Send to POS -->
                <div
                  v-else-if="order.status === 'confirmed'"
                  class="flex gap-2"
                >
                  <button
                    @click="
                      adminStore.updateOrderStatus(order.id, 'ready_for_pos')
                    "
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Send to POS
                  </button>
                </div>

                <!-- Ready for POS: Mark POS Done -->
                <div
                  v-else-if="order.status === 'ready_for_pos'"
                  class="flex gap-2"
                >
                  <button
                    @click="
                      adminStore.updateOrderStatus(order.id, 'completed_in_pos')
                    "
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Mark POS Done
                  </button>
                </div>

                <!-- POS Completed: Assign Rider (delivery) or Ready (pickup) -->
                <div
                  v-else-if="order.status === 'completed_in_pos'"
                  class="flex gap-2"
                >
                  <button
                    v-if="order.delivery_method === 'delivery'"
                    @click="adminStore.updateOrderStatus(order.id, 'assigned')"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Assign Rider
                  </button>
                  <button
                    v-else
                    @click="adminStore.updateOrderStatus(order.id, 'picked_up')"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Mark Ready
                  </button>
                </div>

                <!-- Assigned: Hand to Rider -->
                <div v-else-if="order.status === 'assigned'" class="flex gap-2">
                  <button
                    @click="adminStore.updateOrderStatus(order.id, 'picked_up')"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Hand to Rider
                  </button>
                </div>

                <!-- Picked Up: Mark Arrived -->
                <div
                  v-else-if="order.status === 'picked_up'"
                  class="flex gap-2"
                >
                  <button
                    @click="adminStore.updateOrderStatus(order.id, 'arrived')"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Mark Arrived
                  </button>
                </div>

                <!-- Arrived: Complete Delivery/Collection -->
                <div v-else-if="order.status === 'arrived'" class="flex gap-2">
                  <button
                    v-if="order.delivery_method === 'pickup'"
                    @click="openVerifyCollection(order)"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark Collected
                  </button>
                  <button
                    v-else
                    @click="openVerifyDeliveryPin(order)"
                    class="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Confirm Delivery
                  </button>
                </div>

                <!-- Release button for claimed orders -->
                <button
                  v-if="order.claimed_by"
                  @click="handleReleaseOrder(order.id)"
                  class="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Release Order
                </button>

                <!-- Blacklist button -->
                <button
                  v-if="isAdmin || isManager"
                  @click="openBlacklistModal(order.user_id)"
                  class="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  Flag Customer
                </button>
              </div>
            </div>

            <!-- Quick Note Input -->
            <div class="mt-4 pt-4 border-t border-gray-200">
              <div class="flex gap-2">
                <input
                  v-model="orderNotes[order.id]"
                  type="text"
                  placeholder="Add a note..."
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  @click="saveNote(order.id)"
                  class="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div
          v-if="isLoadingMore || adminStore.loading"
          class="flex items-center justify-center py-6"
        >
          <div class="flex items-center gap-2 text-gray-500">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span class="text-sm">Loading more orders...</span>
          </div>
        </div>

        <!-- End of list indicator -->
        <div
          v-else-if="
            !adminStore.pagination.hasMore && filteredOrders.length > 0
          "
          class="text-center py-6"
        >
          <span class="text-sm text-gray-500">No more orders</span>
        </div>

        <!-- Empty State -->
        <div v-if="filteredOrders.length === 0" class="text-center py-12">
          <svg
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 class="text-lg font-medium text-gray-900">
            No orders in this queue
          </h3>
          <p class="text-gray-500">All caught up!</p>
        </div>
      </div>
    </div>

    <!-- Branch Switcher Modal -->
    <div
      v-if="showBranchSwitcher"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Switch Branch</h3>
          <p class="text-sm text-gray-600">Select a branch to view</p>
        </div>
        <div class="p-6 space-y-2">
          <button
            @click="switchBranch(null)"
            class="w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors"
            :class="{ 'bg-blue-50 text-blue-700': !adminStore.currentStoreId }"
          >
            <span class="font-medium">All Stores</span>
          </button>
          <button
            v-for="store in adminStore.availableStores"
            :key="store.id"
            @click="switchBranch(store.id)"
            class="w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors"
            :class="{
              'bg-blue-50 text-blue-700': adminStore.currentStoreId === store.id,
            }"
          >
            <span class="font-medium">{{ store.name }}</span>
            <span class="text-sm text-gray-500 ml-2">({{ store.code }})</span>
          </button>
        </div>
        <div class="px-6 py-4 border-t border-gray-200">
          <button
            @click="showBranchSwitcher = false"
            class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Verification Modal -->
    <div
      v-if="showVerifyModal && verifyingOrder"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Verify Order</h3>
          <p class="text-sm text-gray-600">
            #{{ verifyingOrder.id.slice(-6).toUpperCase() }}
          </p>
        </div>
        <div class="p-6 space-y-4">
          <div class="space-y-3">
            <label class="flex items-start gap-3">
              <input
                v-model="verificationForm.verifiedAddress"
                type="checkbox"
                class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span class="font-medium text-gray-900"
                  >Delivery Address Verified</span
                >
                <p class="text-sm text-gray-500">
                  Customer confirmed the delivery address
                </p>
              </div>
            </label>
            <label class="flex items-start gap-3">
              <input
                v-model="verificationForm.verifiedAmount"
                type="checkbox"
                class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span class="font-medium text-gray-900"
                  >Total Amount Verified</span
                >
                <p class="text-sm text-gray-500">
                  Customer confirmed the order total
                </p>
              </div>
            </label>
            <label class="flex items-start gap-3">
              <input
                v-model="verificationForm.verifiedSubstitutions"
                type="checkbox"
                class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span class="font-medium text-gray-900"
                  >Substitutions Verified</span
                >
                <p class="text-sm text-gray-500">
                  Discussed alternative products if needed
                </p>
              </div>
            </label>
          </div>

          <div
            v-if="verificationForm.verifiedSubstitutions"
            class="pl-7 space-y-2"
          >
            <label class="flex items-center gap-2">
              <input
                v-model="verificationForm.substitutionApproved"
                type="checkbox"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700"
                >Customer approved substitutions</span
              >
            </label>
            <textarea
              v-model="verificationForm.substitutionDetails"
              placeholder="Enter substitution details..."
              rows="2"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <textarea
            v-model="verificationForm.notes"
            placeholder="Additional notes (optional)..."
            rows="3"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            @click="handleVerifyOrder"
            :disabled="
              !verificationForm.verifiedAddress ||
              !verificationForm.verifiedAmount
            "
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Confirm Order
          </button>
          <button
            @click="showVerifyModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Rider Dispatch Modal -->
    <div
      v-if="showRiderModal && riderOrder"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Dispatch Rider</h3>
          <p class="text-sm text-gray-600">
            Order #{{ riderOrder.id.slice(-6).toUpperCase() }}
          </p>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Rider Name</label
            >
            <input
              v-model="riderForm.name"
              type="text"
              placeholder="Enter rider name"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Rider Phone</label
            >
            <input
              v-model="riderForm.phone"
              type="tel"
              placeholder="Enter rider phone number"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Estimated Arrival</label
            >
            <input
              v-model="riderForm.estimatedArrival"
              type="datetime-local"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            @click="handleDispatchRider"
            :disabled="!riderForm.name"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Dispatch
          </button>
          <button
            @click="showRiderModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Collection Verification Modal -->
    <OrderVerificationModal
      v-model="showCollectionModal"
      type="pickup"
      :order-id="collectionOrder?.id"
      :loading="verifyingCollection"
      :error="collectionPinError"
      :max-length="4"
      :min-length="4"
      :order-id-length="6"
      @cancel="closeVerifyCollection"
      @verify="handleVerifyCollectionPin"
    />

    <!-- Delivery PIN Verification Modal -->
    <OrderVerificationModal
      v-model="showDeliveryPinModal"
      type="delivery"
      :order-id="deliveryPinOrder?.id"
      :loading="verifyingDeliveryPin"
      :error="deliveryPinError"
      :max-length="4"
      :min-length="4"
      :order-id-length="6"
      @cancel="closeVerifyDeliveryPin"
      @verify="handleVerifyDeliveryPinCode"
    />
  </div>
</template>
