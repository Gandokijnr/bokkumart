<template>
  <div class="driver-assignment">
    <!-- Driver Selection UI -->
    <div
      v-if="drivers.length > 0"
      class="rounded-lg border-2 border-indigo-100 bg-indigo-50 p-3"
    >
      <label class="block text-sm font-medium text-indigo-900 mb-2">
        {{ label }}
      </label>
      <select
        v-model="selectedDriverId"
        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      >
        <option value="">Choose a driver...</option>
        <option v-for="driver in drivers" :key="driver.id" :value="driver.id">
          {{ driver.full_name || "Unnamed Driver" }}
          {{ driver.phone_number ? `(${driver.phone_number})` : "" }}
        </option>
      </select>
      <button
        v-if="selectedDriverId"
        @click="handleAssign"
        :disabled="assigning"
        class="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span v-if="assigning">Assigning...</span>
        <span v-else>{{ assignButtonText }}</span>
      </button>
    </div>

    <!-- No drivers available message -->
    <div v-else class="rounded-lg border-2 border-amber-200 bg-amber-50 p-3">
      <p class="text-sm font-medium text-amber-900">
        {{ noDriversTitle }}
      </p>
      <p class="text-xs text-amber-700 mt-1">
        {{ noDriversMessage }}
      </p>
    </div>

    <!-- Error message -->
    <div
      v-if="error"
      class="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types";
import { useUserStore } from "~/stores/user";
import { useToast } from "~/composables/useToast";

interface Driver {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  driver_status: "offline" | "available" | "on_delivery";
  store_id: string | null;
}

interface Props {
  orderId: string;
  storeId: string;
  label?: string;
  assignButtonText?: string;
  noDriversTitle?: string;
  noDriversMessage?: string;
  autoFetch?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: "Select Driver",
  assignButtonText: "Assign Driver",
  noDriversTitle: "No Online Drivers",
  noDriversMessage: "No drivers are currently online in this store.",
  autoFetch: true,
});

const emit = defineEmits<{
  (e: "assigned", driver: Driver): void;
  (e: "error", message: string): void;
}>();

const supabase = useSupabaseClient<Database>();
const toast = useToast();
const userStore = useUserStore();

const drivers = ref<Driver[]>([]);
const selectedDriverId = ref<string>("");
const assigning = ref(false);
const error = ref<string>("");

const currentUserRole = computed(() => userStore.profile?.role || "customer");
const currentUserStoreId = computed(() => userStore.profile?.store_id);

const fetchDrivers = async () => {
  error.value = "";

  // Build base query for available drivers
  let query = supabase
    .from("profiles")
    .select("id, full_name, phone_number, driver_status, store_id")
    .eq("role", "driver")
    .eq("driver_status", "available");

  // Apply role-based filtering for branch managers and staff
  if (
    (currentUserRole.value === "branch_manager" ||
      currentUserRole.value === "staff") &&
    currentUserStoreId.value
  ) {
    // Branch managers and staff only see drivers in their store
    query = query.eq("store_id", currentUserStoreId.value);
  }

  const { data, error: fetchError } = await query.order("full_name", {
    ascending: true,
  });

  if (fetchError) {
    console.error("Error fetching drivers:", fetchError);
    error.value = "Failed to load drivers";
    return;
  }

  drivers.value = (data || []) as Driver[];
};

const assignDriver = async (driverId: string) => {
  if (!driverId || !props.orderId) return;

  const driver = drivers.value.find((d) => d.id === driverId);
  if (!driver) {
    error.value = "Selected driver not found";
    emit("error", error.value);
    return;
  }

  assigning.value = true;
  error.value = "";

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

    await $fetch("/api/admin/dispatch-branch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        orderId: props.orderId,
        storeId: props.storeId,
        riderName: driver.full_name || "Driver",
        riderPhone: driver.phone_number,
        dispatchedBy: userStore.profile?.id,
      },
    });

    const shortId = props.orderId
      ? String(props.orderId).slice(-6).toUpperCase()
      : "";
    toast.add({
      title: "Driver Assigned",
      description: shortId
        ? `Order #${shortId} assigned to ${driver.full_name || "Driver"}.`
        : `Order assigned to ${driver.full_name || "Driver"}.`,
      color: "success",
    });

    selectedDriverId.value = "";
    emit("assigned", driver);

    // Refresh driver list to get updated availability
    await fetchDrivers();
  } catch (err: any) {
    console.error("Error assigning driver:", err);
    error.value =
      err?.statusMessage || err?.message || "Could not assign driver.";
    emit("error", error.value);

    toast.add({
      title: "Assignment Failed",
      description: error.value,
      color: "error",
    });
  } finally {
    assigning.value = false;
  }
};

const handleAssign = () => {
  if (selectedDriverId.value) {
    assignDriver(selectedDriverId.value);
  }
};

const refresh = () => {
  return fetchDrivers();
};

// Expose methods for parent component
defineExpose({
  refresh,
  fetchDrivers,
});

onMounted(() => {
  if (props.autoFetch) {
    fetchDrivers();
  }
});

// Reset selection when order changes
watch(
  () => props.orderId,
  () => {
    selectedDriverId.value = "";
    error.value = "";
  },
);
</script>
