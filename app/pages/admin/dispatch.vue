<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div class="mb-6">
        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
              Dispatch
            </h1>
            <p class="mt-1 text-sm text-gray-600">
              Assign ready orders to online drivers. Drivers must accept within
              2 minutes.
            </p>
          </div>

          <button
            type="button"
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            :disabled="loading"
            @click="refresh"
          >
            {{ loading ? "Refreshing..." : "Refresh" }}
          </button>
        </div>

        <div
          v-if="error"
          class="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700"
        >
          {{ error }}
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Left: Ready Orders -->
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm font-semibold text-gray-900">
                Ready for Pickup
              </p>
              <p class="mt-1 text-xs text-gray-500">
                Tip: Sort by Area to batch rider trips.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <select
                v-model="orderSort"
                class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="time">Sort: Oldest</option>
                <option value="area">Sort: Area</option>
              </select>

              <button
                type="button"
                class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="selectAllOrders"
              >
                Select all
              </button>

              <button
                type="button"
                class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="clearSelectedOrders"
              >
                Clear
              </button>
            </div>
          </div>

          <div class="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
            <div
              v-for="o in sortedReadyOrders"
              :key="o.id"
              class="rounded-2xl border border-gray-200 bg-white p-4"
              :class="{
                'ring-2 ring-indigo-500': selectedOrderIds.has(o.id),
                'border-blue-300 bg-blue-50': isExpired(o),
              }"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <input
                      type="checkbox"
                      :checked="selectedOrderIds.has(o.id)"
                      @change="toggleOrderSelection(o.id)"
                      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <p
                      class="font-mono text-xs font-bold text-gray-900 truncate"
                      :title="'#' + o.id.slice(-8).toUpperCase()"
                    >
                      #{{ o.id.slice(-8).toUpperCase() }}
                    </p>
                    <span
                      v-if="isExpired(o)"
                      class="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-800 truncate"
                      title="Needs reassignment"
                    >
                      Needs reassignment
                    </span>
                  </div>

                  <p
                    class="mt-2 text-sm font-semibold text-gray-900 truncate"
                    :title="o.customer_name || 'Customer'"
                  >
                    {{ o.customer_name || "Customer" }}
                  </p>
                  <p
                    class="mt-1 text-sm text-gray-700 truncate"
                    :title="o.area || 'Unknown area'"
                  >
                    {{ o.area || "Unknown area" }}
                  </p>
                  <p
                    class="mt-1 text-xs text-gray-500 truncate"
                    :title="'Status: ' + o.status"
                  >
                    Status: {{ o.status }}
                  </p>
                </div>

                <div class="flex flex-col items-end gap-2">
                  <button
                    v-if="o.driver_id"
                    type="button"
                    class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    :disabled="actionLoadingId === o.id"
                    @click="releaseOrder(o)"
                  >
                    Release
                  </button>

                  <button
                    type="button"
                    class="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    :disabled="
                      availableDrivers.length === 0 ||
                      selectedOrderIds.size === 0 ||
                      actionLoadingId !== null
                    "
                    @click="openAssignModal(o)"
                  >
                    Assign
                  </button>
                </div>
              </div>

              <div
                v-if="o.assigned_expires_at"
                class="mt-3 text-xs text-gray-600"
              >
                Accept deadline:
                <span class="font-semibold">{{
                  formatDateTime(o.assigned_expires_at)
                }}</span>
              </div>
            </div>

            <div
              v-if="!loading && readyOrders.length === 0"
              class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
            >
              No orders are ready for pickup.
            </div>
          </div>
        </div>

        <!-- Right: Drivers -->
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900">Drivers</p>
              <p class="mt-1 text-xs text-gray-500">
                Available + idle drivers can be assigned.
              </p>
            </div>

            <div
              class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
            >
              {{ availableDrivers.length }} available
            </div>
          </div>

          <div class="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
            <div
              v-for="d in drivers"
              :key="d.id"
              class="rounded-2xl border border-gray-200 bg-white p-4"
              :class="
                d.driver_status === 'available'
                  ? 'border-emerald-200 bg-emerald-50'
                  : d.driver_status === 'on_delivery'
                    ? 'border-amber-200 bg-amber-50'
                    : ''
              "
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p
                    class="text-sm font-semibold text-gray-900 truncate"
                    :title="d.full_name || 'Driver'"
                  >
                    {{ d.full_name || "Driver" }}
                  </p>
                  <p
                    class="mt-1 text-xs text-gray-500 truncate"
                    :title="d.phone_number || 'No phone'"
                  >
                    {{ d.phone_number || "No phone" }}
                  </p>
                </div>

                <div class="text-right">
                  <span
                    class="inline-flex rounded-full px-2 py-1 text-xs font-semibold truncate"
                    :class="
                      d.driver_status === 'available'
                        ? 'bg-emerald-200 text-emerald-900'
                        : d.driver_status === 'on_delivery'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-gray-200 text-gray-700'
                    "
                    :title="d.driver_status"
                  >
                    {{ d.driver_status }}
                  </span>
                </div>
              </div>

              <div class="mt-3 text-xs text-gray-600 truncate">
                Active assigned orders:
                <span class="font-semibold">{{ d.active_count }}</span>
              </div>
            </div>

            <div
              v-if="!loading && drivers.length === 0"
              class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
            >
              No drivers found.
            </div>
          </div>
        </div>
      </div>

      <!-- Assign Modal -->
      <div
        v-if="showAssignModal"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      >
        <div class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-base font-bold text-gray-900">Assign Driver</p>
              <p class="mt-1 text-sm text-gray-600">
                Assign {{ selectedOrderIds.size }} selected order(s) to a
                driver.
              </p>
            </div>
            <button
              class="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              @click="closeAssignModal"
            >
              ✕
            </button>
          </div>

          <div class="mt-4">
            <label class="mb-2 block text-sm font-medium text-gray-700"
              >Choose driver</label
            >
            <select
              v-model="selectedDriverId"
              class="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-600 focus:outline-none"
            >
              <option value="" disabled>Select a driver</option>
              <option v-for="d in availableDrivers" :key="d.id" :value="d.id">
                {{ (d.full_name || "Driver").slice(0, 30)
                }}{{ (d.full_name || "Driver").length > 30 ? "..." : "" }} ({{
                  d.active_count
                }}
                active)
              </option>
            </select>
          </div>

          <div class="mt-5 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="closeAssignModal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              :disabled="!selectedDriverId || actionLoadingId !== null"
              @click="assignSelected"
            >
              Assign
            </button>
          </div>

          <p class="mt-3 text-xs text-gray-500">
            Acceptance flow: driver has 2 minutes to accept, otherwise the order
            is highlighted for reassignment.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { Database } from "~/types/database.types";

useHead({ title: "Dispatch - BokkuMart" });

definePageMeta({
  layout: "admin",
  middleware: ["staff"],
});

type DriverStatus = "available" | "offline" | "on_delivery";

type DispatchOrder = {
  id: string;
  status: string;
  delivery_details: any;
  delivery_address: any;
  assigned_expires_at: string | null;
  driver_id: string | null;
  created_at: string;
  customer_name?: string | null;
  area?: string | null;
};

type DriverRow = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: string;
  driver_status: DriverStatus;
};

type DriverCard = DriverRow & { active_count: number };

const supabase = useSupabaseClient<Database>();

const loading = ref(false);
const error = ref<string | null>(null);
const actionLoadingId = ref<string | null>(null);

const orderSort = ref<"time" | "area">("time");

const readyOrders = ref<DispatchOrder[]>([]);
const drivers = ref<DriverCard[]>([]);

const selectedOrderIds = ref<Set<string>>(new Set());

const showAssignModal = ref(false);
const selectedDriverId = ref<string>("");

let ordersChannel: any = null;
let driversChannel: any = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;

const availableDrivers = computed(() => {
  return drivers.value
    .filter((d) => d.driver_status === "available" && d.active_count === 0)
    .sort((a, b) => a.active_count - b.active_count);
});

const sortedReadyOrders = computed(() => {
  const list = [...readyOrders.value];
  if (orderSort.value === "area") {
    return list.sort((a, b) => (a.area || "").localeCompare(b.area || ""));
  }
  return list.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
});

const isExpired = (o: DispatchOrder) => {
  if (!o.assigned_expires_at) return false;
  return Date.now() > new Date(o.assigned_expires_at).getTime();
};

const toggleOrderSelection = (orderId: string) => {
  const next = new Set(selectedOrderIds.value);
  if (next.has(orderId)) next.delete(orderId);
  else next.add(orderId);
  selectedOrderIds.value = next;
};

const selectAllOrders = () => {
  selectedOrderIds.value = new Set(readyOrders.value.map((o) => o.id));
};

const clearSelectedOrders = () => {
  selectedOrderIds.value = new Set();
};

const openAssignModal = (o: DispatchOrder) => {
  // ensure at least one order is selected
  if (!selectedOrderIds.value.has(o.id)) {
    toggleOrderSelection(o.id);
  }
  selectedDriverId.value = "";
  showAssignModal.value = true;
};

const closeAssignModal = () => {
  showAssignModal.value = false;
  selectedDriverId.value = "";
};

const formatDateTime = (dateString: string) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseArea = (o: any) => {
  const addr =
    o.delivery_details?.address ||
    o.delivery_address?.address ||
    o.delivery_address ||
    null;
  return addr?.area ? String(addr.area) : null;
};

const refreshOrders = async () => {
  const { data, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, status, delivery_details, delivery_address, driver_id, assigned_expires_at, created_at",
    )
    .eq("status", "ready_for_pickup")
    .order("created_at", { ascending: true });

  if (ordersError) throw ordersError;

  readyOrders.value = (data || []).map((o: any) => ({
    ...o,
    area: parseArea(o),
  }));
};

const refreshDrivers = async () => {
  const { data, error: driversError } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, role, driver_status")
    .eq("role", "driver")
    .order("updated_at", { ascending: false });

  if (driversError) throw driversError;

  const driverRows = (data || []) as any[];

  // Count active orders for each driver (simple approach)
  const driverIds = driverRows.map((d) => d.id);
  let countsMap = new Map<string, number>();

  if (driverIds.length > 0) {
    const { data: activeOrders, error: activeError } = await supabase
      .from("orders")
      .select("id, driver_id, status")
      .in("driver_id", driverIds)
      .in("status", ["ready_for_pickup", "out_for_delivery"]);

    if (activeError) throw activeError;

    for (const o of (activeOrders || []) as any[]) {
      const id = o.driver_id;
      countsMap.set(id, (countsMap.get(id) || 0) + 1);
    }
  }

  drivers.value = driverRows.map((d: any) => ({
    id: d.id,
    full_name: d.full_name,
    phone_number: d.phone_number,
    role: d.role,
    driver_status: (d.driver_status || "offline") as DriverStatus,
    active_count: countsMap.get(d.id) || 0,
  }));
};

const refresh = async () => {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([refreshOrders(), refreshDrivers()]);
  } catch (e: any) {
    error.value = e?.message || "Failed to load dispatch screen";
  } finally {
    loading.value = false;
  }
};

const assignSelected = async () => {
  if (!selectedDriverId.value) return;
  if (selectedOrderIds.value.size === 0) return;

  actionLoadingId.value = "assign";
  error.value = null;

  try {
    const orderIds = Array.from(selectedOrderIds.value);

    const { error: rpcError } = await supabase.rpc("dispatch_assign_orders", {
      p_order_ids: orderIds,
      p_driver_id: selectedDriverId.value,
    } as any);

    if (rpcError) throw rpcError;

    closeAssignModal();
    clearSelectedOrders();
    await refresh();
  } catch (e: any) {
    error.value = e?.message || "Failed to assign orders";
  } finally {
    actionLoadingId.value = null;
  }
};

const releaseOrder = async (o: DispatchOrder) => {
  actionLoadingId.value = o.id;
  error.value = null;

  try {
    const { error: rpcError } = await supabase.rpc("dispatch_release_order", {
      p_order_id: o.id,
    } as any);

    if (rpcError) throw rpcError;

    await refresh();
  } catch (e: any) {
    error.value = e?.message || "Failed to release order";
  } finally {
    actionLoadingId.value = null;
  }
};

const setupRealtime = () => {
  ordersChannel = supabase
    .channel("dispatch-orders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      async () => {
        await refreshOrders();
      },
    )
    .subscribe();

  driversChannel = supabase
    .channel("dispatch-drivers")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      async (payload: any) => {
        if (
          (payload?.new as any)?.role === "driver" ||
          (payload?.old as any)?.role === "driver"
        ) {
          await refreshDrivers();
        }
      },
    )
    .subscribe();

  // Tick to re-evaluate expiry highlights
  tickTimer = setInterval(() => {
    // No-op: computed uses Date.now(); forcing reactive update via refresh is expensive
    // This timer exists to keep the UI responsive if you later add a "now" ref.
  }, 30000);
};

onMounted(async () => {
  await refresh();
  setupRealtime();
});

onUnmounted(() => {
  if (ordersChannel) supabase.removeChannel(ordersChannel);
  if (driversChannel) supabase.removeChannel(driversChannel);
  if (tickTimer) clearInterval(tickTimer);
});
</script>
