<template>
  <div class="max-w-4xl mx-auto">
    <h2 class="mb-6 text-2xl font-bold text-gray-900">Store Settings</h2>

    <!-- Store Selection -->
    <div class="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <label class="mb-2 block text-sm font-medium text-gray-700"
        >Select Store</label
      >
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
            <h3 class="text-xl font-bold text-gray-900">
              {{ selectedStore.name }}
            </h3>
            <p class="mt-1 text-gray-600">{{ selectedStore.address }}</p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="rounded-full px-2 py-1 text-xs font-bold"
                :class="
                  selectedStore?.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                "
              >
                {{ selectedStore?.is_active ? "Active" : "Inactive" }}
              </span>
              <span class="text-xs text-gray-500"
                >ID: {{ selectedStore?.id?.slice(-8) }}</span
              >
            </div>
          </div>
          <button
            @click="toggleStoreStatus"
            :class="
              selectedStore?.is_active
                ? 'rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200'
                : 'rounded-lg bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-200'
            "
          >
            {{
              selectedStore?.is_active ? "Deactivate Store" : "Activate Store"
            }}
          </button>
        </div>
      </div>

      <!-- Paystack Subaccount Routing -->
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <h4 class="mb-4 font-bold text-gray-900">Paystack Routing</h4>

        <p v-if="!isSuperAdmin" class="mb-4 text-sm text-gray-600">
          Super Admin only. You can view routing status here, but only a Super
          Admin can edit these settings.
        </p>

        <p class="mb-4 text-xs text-gray-500">
          Role detected: {{ detectedRoleLabel }}
        </p>

        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div class="grid gap-3 md:grid-cols-2">
            <p class="text-sm text-gray-700 md:col-span-2">
              <span class="font-medium">Current Subaccount:</span>
              <span class="ml-2 font-mono text-gray-900">{{
                selectedStore?.paystack_subaccount_code || "Not configured"
              }}</span>
            </p>

            <p class="text-sm text-gray-700">
              <span class="font-medium">Settlement Bank:</span>
              <span class="ml-2 text-gray-900">{{
                selectedStore?.paystack_settlement_bank_name || "Not set"
              }}</span>
            </p>

            <p class="text-sm text-gray-700">
              <span class="font-medium">Settlement Account:</span>
              <span class="ml-2 font-mono text-gray-900">{{
                selectedStore?.paystack_settlement_account_number || "Not set"
              }}</span>
            </p>

            <p class="text-sm text-gray-700">
              <span class="font-medium">Platform Percentage (%):</span>
              <span class="ml-2 text-gray-900">{{
                selectedStore?.platform_percentage ?? "Not set"
              }}</span>
            </p>

            <p class="text-sm text-gray-700">
              <span class="font-medium">Fixed Commission (₦):</span>
              <span class="ml-2 text-gray-900">{{
                selectedStore?.fixed_commission ?? "Not set"
              }}</span>
            </p>
          </div>
        </div>

        <template v-if="isSuperAdmin">
          <AccountResolver
            v-model="paystackAccountData"
            :resolved-account-name="paystackOnboarding.resolvedAccountName"
            @resolved="
              paystackOnboarding.resolvedAccountName = $event;
              paystackOnboarding.error = '';
              paystackOnboarding.success = '';
            "
            @error="paystackOnboarding.error = $event"
          />

          <div class="mt-4 flex gap-3">
            <button
              @click="createPaystackSubaccount"
              :disabled="
                paystackOnboarding.loading ||
                !selectedStoreId ||
                !paystackAccountData.bankCode ||
                paystackAccountData.accountNumber.length !== 10 ||
                !paystackOnboarding.resolvedAccountName
              "
              class="rounded-lg bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {{
                paystackOnboarding.loading
                  ? "Saving..."
                  : "Create / Save Subaccount"
              }}
            </button>
          </div>
        </template>

        <p v-if="paystackOnboarding.error" class="mt-3 text-sm text-red-600">
          {{ paystackOnboarding.error }}
        </p>
        <p
          v-if="paystackOnboarding.success"
          class="mt-3 text-sm text-green-700"
        >
          {{ paystackOnboarding.success }}
        </p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-xl bg-white p-4 shadow-sm text-center">
          <p class="text-2xl font-bold text-gray-900">
            {{ storeStats.ordersToday }}
          </p>
          <p class="text-sm text-gray-600">Orders Today</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm text-center">
          <p class="text-2xl font-bold text-gray-900">
            {{ storeStats.pendingVerification }}
          </p>
          <p class="text-sm text-gray-600">Pending Verification</p>
        </div>
        <div class="rounded-xl bg-white p-4 shadow-sm text-center">
          <p class="text-2xl font-bold text-gray-900">
            {{ storeStats.lowStockItems }}
          </p>
          <p class="text-sm text-gray-600">Low Stock Items</p>
        </div>
      </div>

      <!-- Operating Hours -->
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <h4 class="mb-4 font-bold text-gray-900">Operating Hours</h4>
        <div class="space-y-3">
          <div
            v-for="day in weekDays"
            :key="day.key"
            class="flex items-center gap-4"
          >
            <span class="w-24 text-sm font-medium text-gray-700">{{
              day.label
            }}</span>
            <div class="flex items-center gap-2">
              <input
                :value="operatingHours[day.key]?.open || '08:00'"
                @input="
                  (e) =>
                    updateHours(
                      day.key,
                      'open',
                      (e.target as HTMLInputElement).value,
                    )
                "
                type="time"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <span class="text-gray-500">to</span>
              <input
                :value="operatingHours[day.key]?.close || '20:00'"
                @input="
                  (e) =>
                    updateHours(
                      day.key,
                      'close',
                      (e.target as HTMLInputElement).value,
                    )
                "
                type="time"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <label class="ml-4 flex items-center gap-2">
                <input
                  :checked="operatingHours[day.key]?.isOpen || false"
                  @change="
                    (e) =>
                      updateHours(
                        day.key,
                        'isOpen',
                        (e.target as HTMLInputElement).checked,
                      )
                  "
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
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Delivery Mode</label
            >
            <select
              v-model="selectedStore.delivery_mode"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            >
              <option value="manual">Manual (Staff assigns riders)</option>
              <option value="automatic">Automatic (Auto-assign riders)</option>
            </select>
            <p class="mt-1 text-xs text-gray-500">
              {{
                selectedStore.delivery_mode === "automatic"
                  ? "Riders will be automatically assigned based on proximity"
                  : "Staff will manually assign riders to orders"
              }}
            </p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Pickup Gate/Door</label
            >
            <input
              v-model="selectedStore.metadata.pickupGate"
              type="text"
              placeholder="e.g. Gate 1, South Entrance"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
            <p class="mt-1 text-xs text-gray-500">
              Where riders should pick up orders
            </p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Base Delivery Fee (₦)</label
            >
            <input
              v-model="settings.deliveryFee"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Free Delivery Threshold (₦)</label
            >
            <input
              v-model="settings.freeDeliveryThreshold"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Min Order Amount (₦)</label
            >
            <input
              v-model="settings.minOrderAmount"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Max Delivery Distance (km)</label
            >
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
            <span class="text-sm text-gray-700"
              >Send notifications for new orders</span
            >
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
            <span class="text-sm text-gray-700"
              >Notify on order cancellations</span
            >
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
          <div
            v-for="staff in storeStaff"
            :key="staff.id"
            class="flex items-center justify-between py-3"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"
              >
                <span class="font-bold text-red-600">{{
                  (staff.full_name || staff.id)?.[0]?.toUpperCase()
                }}</span>
              </div>
              <div>
                <p class="font-medium text-gray-900">
                  {{ staff.full_name || staff.id }}
                </p>
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
          <p
            v-if="storeStaff.length === 0"
            class="py-4 text-center text-gray-500"
          >
            No staff assigned to this store
          </p>
        </div>
      </div>
    </div>

    <!-- Add Staff Modal -->
    <div
      v-if="showAddStaffModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 class="text-lg font-bold text-gray-900">Add Staff Member</h3>
        <div class="mt-4 space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Email Address</label
            >
            <input
              v-model="newStaffEmail"
              type="email"
              placeholder="staff@example.com"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700"
              >Role</label
            >
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
import { useUserStore } from "~/stores/user";
import { getSafeErrorMessage } from "~/utils/errorHandler";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userStore = useUserStore();

const stores = ref<any[]>([]);
const selectedStoreId = ref("");
const selectedStore = computed(() =>
  stores.value.find((s) => s.id === selectedStoreId.value),
);

const currentUserRole = ref<string>("");
const currentUserRoleError = ref<string>("");

const loadCurrentUserRole = async () => {
  const uid = (user.value as any)?.id;
  if (!uid) {
    currentUserRole.value = "";
    currentUserRoleError.value = "";
    return;
  }

  currentUserRoleError.value = "";

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .single();

  if (error) {
    currentUserRoleError.value = error.message || "Failed to load role";
  }

  const fromProfiles = String((data as any)?.role || "");
  const fromUserMetadata = String(
    (user.value as any)?.user_metadata?.role || "",
  );
  const fromAppMetadata = String((user.value as any)?.app_metadata?.role || "");
  const fromUserStore = String((userStore as any)?.profile?.role || "");

  currentUserRole.value =
    fromProfiles || fromUserStore || fromUserMetadata || fromAppMetadata;
};

const isSuperAdmin = computed(() => {
  return (
    currentUserRole.value === "super_admin" ||
    String((userStore as any)?.profile?.role || "") === "super_admin"
  );
});

const detectedRoleLabel = computed(() => {
  const uid = String((user.value as any)?.id || "");
  const role =
    currentUserRole.value || String((userStore as any)?.profile?.role || "");
  const err = currentUserRoleError.value;
  return `${role || "(none)"}${err ? ` (role lookup error: ${err})` : ""}${uid ? ` | uid: ${uid.slice(-8)}` : ""}`;
});

const paystackOnboarding = ref({
  bankCode: "",
  accountNumber: "",
  accountName: "",
  resolvedAccountName: "",
  resolving: false,
  loading: false,
  error: "",
  success: "",
});

// Sync account data with paystackOnboarding for AccountResolver component
const paystackAccountData = computed({
  get: () => ({
    bankCode: paystackOnboarding.value.bankCode,
    accountNumber: paystackOnboarding.value.accountNumber,
    accountName: paystackOnboarding.value.accountName,
  }),
  set: (val) => {
    paystackOnboarding.value.bankCode = val.bankCode;
    paystackOnboarding.value.accountNumber = val.accountNumber;
    paystackOnboarding.value.accountName = val.accountName;
  },
});

const storeStats = ref({
  ordersToday: 0,
  pendingVerification: 0,
  lowStockItems: 0,
});

const storeStaff = ref<any[]>([]);
const showAddStaffModal = ref(false);
const newStaffEmail = ref("");
const newStaffRole = ref("staff");

const weekDays = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const updateHours = (
  day: string,
  field: "open" | "close" | "isOpen",
  value: any,
) => {
  const hours = operatingHours.value[day];
  if (hours) (hours as any)[field] = value;
};

const operatingHours = ref<
  Record<string, { open: string; close: string; isOpen: boolean }>
>({
  monday: { open: "08:00", close: "20:00", isOpen: true },
  tuesday: { open: "08:00", close: "20:00", isOpen: true },
  wednesday: { open: "08:00", close: "20:00", isOpen: true },
  thursday: { open: "08:00", close: "20:00", isOpen: true },
  friday: { open: "08:00", close: "20:00", isOpen: true },
  saturday: { open: "09:00", close: "18:00", isOpen: true },
  sunday: { open: "10:00", close: "16:00", isOpen: false },
});

const settings = ref({
  deliveryFee: 500,
  freeDeliveryThreshold: 5000,
  minOrderAmount: 1000,
  maxDeliveryDistance: 10,
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyCancellations: true,
});

const fetchStores = async () => {
  const { data } = await supabase.from("stores").select("*").order("name");
  if (data) stores.value = data;
};

const createPaystackSubaccount = async () => {
  if (!selectedStoreId.value) return;
  if (!isSuperAdmin.value) {
    paystackOnboarding.value.error = "Not authorized";
    return;
  }
  paystackOnboarding.value.loading = true;
  paystackOnboarding.value.error = "";
  paystackOnboarding.value.success = "";
  try {
    const { data: sessionData } = await (supabase as any).auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Session expired. Please log in again.");

    const res = (await $fetch("/api/admin/create-paystack-subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        store_id: selectedStoreId.value,
        settlement_bank_code: paystackAccountData.value.bankCode,
        account_number: paystackAccountData.value.accountNumber,
        account_name:
          paystackAccountData.value.accountName ||
          paystackOnboarding.value.resolvedAccountName,
      },
    })) as any;

    paystackOnboarding.value.success = `Subaccount saved: ${res?.subaccount_code || "OK"}`;
    await fetchStores();
  } catch (e: any) {
    // Use centralized error handler for safe, user-friendly messages
    paystackOnboarding.value.error = getSafeErrorMessage(e);
  } finally {
    paystackOnboarding.value.loading = false;
  }
};

const loadStoreSettings = async () => {
  if (!selectedStoreId.value) return;

  // Fetch store stats
  const today = new Date().toISOString().split("T")[0];

  const { count: ordersToday } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("store_id", selectedStoreId.value)
    .gte("created_at", today);

  const { count: pendingVerification } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("store_id", selectedStoreId.value)
    .eq("status", "awaiting_call");

  const { count: lowStockItems } = await supabase
    .from("store_inventory")
    .select("*", { count: "exact", head: true })
    .eq("store_id", selectedStoreId.value)
    .lte("available_stock", 5)
    .gt("available_stock", 0);

  storeStats.value = {
    ordersToday: ordersToday || 0,
    pendingVerification: pendingVerification || 0,
    lowStockItems: lowStockItems || 0,
  };

  // Load staff
  const { data: staffData } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("store_id", selectedStoreId.value);

  if (staffData) storeStaff.value = staffData;

  // Load operating hours from store metadata
  if (selectedStore.value?.metadata?.operatingHours) {
    operatingHours.value = {
      ...operatingHours.value,
      ...selectedStore.value.metadata.operatingHours,
    };
  }
};

const toggleStoreStatus = async () => {
  if (!selectedStore.value) return;

  const newStatus = !selectedStore.value.is_active;

  const { error } = await (supabase as any)
    .from("stores")
    .update({ is_active: newStatus })
    .eq("id", selectedStoreId.value);

  if (!error) {
    selectedStore.value.is_active = newStatus;
  }
};

const saveOperatingHours = async () => {
  const { error } = await (supabase as any)
    .from("stores")
    .update({
      metadata: {
        ...selectedStore.value?.metadata,
        operatingHours: operatingHours.value,
      },
    })
    .eq("id", selectedStoreId.value);

  if (!error) {
    alert("Operating hours saved");
  }
};

const saveDeliverySettings = async () => {
  const { error } = await (supabase as any)
    .from("stores")
    .update({
      delivery_mode: selectedStore.value?.delivery_mode,
      metadata: {
        ...selectedStore.value?.metadata,
        deliverySettings: settings.value,
      },
    })
    .eq("id", selectedStoreId.value);

  if (!error) {
    alert("Delivery settings saved");
  }
};

const addStaff = async () => {
  alert(
    "Staff assignment by email is unavailable because profiles.email is not present in the database schema. Please assign staff via an admin tool that can look up users by email (service role) or add an email field/view to profiles.",
  );
};

const removeStaff = async (staffId: string) => {
  if (!confirm("Remove this staff member?")) return;

  const { error } = await (supabase as any)
    .from("profiles")
    .update({ store_id: null })
    .eq("id", staffId);

  if (!error) {
    loadStoreSettings();
  }
};

onMounted(() => {
  fetchStores();
  loadCurrentUserRole();
});

watch(
  () => (user.value as any)?.id,
  () => {
    loadCurrentUserRole();
  },
);
</script>
