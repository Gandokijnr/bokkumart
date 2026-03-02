<script setup lang="ts">
import { useBranchStore, type Branch } from "~/stores/useBranchStore";
import { useCartStore } from "~/stores/useCartStore";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  select: [branch: Branch];
}>();

const branchStore = useBranchStore();
const cartStore = useCartStore();
const supabase = useSupabaseClient();

// Local state
const selectedBranchId = ref<string | null>(
  branchStore.activeBranch?.id || null,
);
const isLoading = ref(false);
const error = ref<string | null>(null);
const showCartWarning = ref(false);
const pendingBranchId = ref<string | null>(null);

// Fetch branches when component mounts
onMounted(async () => {
  if (branchStore.branches.length === 0) {
    await branchStore.fetchBranches(supabase);
  }
});

// Watch for external modelValue changes
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      selectedBranchId.value = branchStore.activeBranch?.id || null;
    }
  },
);

// Check if branch is currently open
const isBranchOpen = (branch: Branch): boolean => {
  const now = new Date();
  const dayOfWeek = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const hours = branch.operating_hours?.[dayOfWeek];

  if (!hours || !hours.isOpen) return false;

  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHourStr, openMinStr] = hours.open.split(":");
  const [closeHourStr, closeMinStr] = hours.close.split(":");
  const openHour = Number(openHourStr);
  const openMin = Number(openMinStr);
  const closeHour = Number(closeHourStr);
  const closeMin = Number(closeMinStr);
  const openTime = (openHour || 0) * 60 + (openMin || 0);
  const closeTime = (closeHour || 0) * 60 + (closeMin || 0);

  return currentTime >= openTime && currentTime <= closeTime;
};

// Get branch status display
const getBranchStatus = (
  branch: Branch,
): { text: string; color: string; icon: string } => {
  if (isBranchOpen(branch)) {
    return {
      text: "Open Now",
      color: "text-green-600 bg-green-50",
      icon: "check",
    };
  }
  return { text: "Closed", color: "text-red-500 bg-red-50", icon: "x" };
};

// Get today's hours for a branch
const getTodayHours = (branch: Branch): string => {
  const dayOfWeek = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const hours = branch.operating_hours?.[dayOfWeek];

  if (!hours || !hours.isOpen) return "Closed today";
  return `${hours.open} - ${hours.close}`;
};

// Handle branch selection
const selectBranch = (branch: Branch) => {
  selectedBranchId.value = branch.id;
};

// Check if we need to show cart warning before switching
const handleConfirmSelection = async () => {
  if (!selectedBranchId.value) return;

  const newBranch = branchStore.getBranchById(selectedBranchId.value);
  if (!newBranch) return;

  // Check if user has items in cart from a different branch
  if (
    cartStore.items.length > 0 &&
    cartStore.currentStoreId !== selectedBranchId.value
  ) {
    showCartWarning.value = true;
    pendingBranchId.value = selectedBranchId.value;
    return;
  }

  await confirmSelection();
};

// Confirm the branch selection
const confirmSelection = async () => {
  const branchId = pendingBranchId.value || selectedBranchId.value;
  if (!branchId) return;

  const branch = branchStore.getBranchById(branchId);
  if (!branch) return;

  isLoading.value = true;

  try {
    // Clear cart if switching branches
    if (cartStore.items.length > 0 && cartStore.currentStoreId !== branchId) {
      cartStore.clearCart();
    }

    // Set the active branch
    branchStore.setActiveBranch(branch);

    // Sync with Supabase if user is logged in
    await branchStore.syncWithSupabase(supabase);

    emit("select", branch);
    emit("update:modelValue", false);

    // Refresh the page to load branch-specific products
    window.location.reload();
  } catch (err: any) {
    error.value = err.message || "Failed to select branch";
  } finally {
    isLoading.value = false;
    showCartWarning.value = false;
    pendingBranchId.value = null;
  }
};

// Cancel cart warning and stay on current branch
const cancelCartWarning = () => {
  showCartWarning.value = false;
  pendingBranchId.value = null;
  // Reset selection to current branch
  selectedBranchId.value = branchStore.activeBranch?.id || null;
};

// Close the modal (only if a branch is already selected)
const close = () => {
  if (branchStore.hasActiveBranch) {
    emit("update:modelValue", false);
  }
};

// Prevent closing if no branch is selected
const handleBackdropClick = () => {
  if (branchStore.hasActiveBranch) {
    emit("update:modelValue", false);
  }
};
</script>

<template>
  <!-- Main Store Selector Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        @click.self="handleBackdropClick"
      >
        <div
          class="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          @click.stop
        >
          <!-- Header -->
          <div
            class="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-red-600"
          >
            <div>
              <h2 class="text-xl font-bold text-white">
                {{
                  branchStore.hasActiveBranch
                    ? "Switch Store"
                    : "Welcome to HomeAffairs"
                }}
              </h2>
              <p class="mt-1 text-sm text-red-100">
                {{
                  branchStore.hasActiveBranch
                    ? "Select a different location to shop from"
                    : "Please select your preferred store to start shopping"
                }}
              </p>
            </div>
            <button
              v-if="branchStore.hasActiveBranch"
              @click="close"
              class="text-red-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto">
            <!-- Loading State -->
            <div v-if="branchStore.loading" class="p-6 space-y-4">
              <div
                v-for="i in 3"
                :key="i"
                class="h-24 w-full bg-gray-100 rounded-xl animate-pulse"
              />
            </div>

            <!-- Error State -->
            <div v-else-if="branchStore.error || error" class="p-6">
              <div
                class="rounded-xl bg-red-50 p-4 text-red-600 flex items-center gap-3"
              >
                <svg
                  class="w-6 h-6 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p class="font-medium">{{ branchStore.error || error }}</p>
                  <button
                    @click="branchStore.fetchBranches(supabase)"
                    class="mt-2 text-sm font-semibold underline hover:no-underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>

            <!-- Branch List -->
            <div v-else class="p-6 space-y-3">
              <div
                v-for="branch in branchStore.activeBranches"
                :key="branch.id"
                class="relative rounded-xl border-2 p-4 transition-all cursor-pointer"
                :class="[
                  selectedBranchId === branch.id
                    ? 'border-red-600 bg-red-50 shadow-md'
                    : 'border-gray-200 hover:border-red-300 hover:shadow-sm bg-white',
                ]"
                @click="selectBranch(branch)"
              >
                <div class="flex items-start gap-4">
                  <!-- Selection Indicator -->
                  <div
                    class="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                    :class="
                      selectedBranchId === branch.id
                        ? 'border-red-600 bg-red-600'
                        : 'border-gray-300'
                    "
                  >
                    <svg
                      v-if="selectedBranchId === branch.id"
                      class="w-4 h-4 text-white"
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
                  </div>

                  <!-- Branch Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="font-semibold text-gray-900 text-lg">
                        {{ branch.name }}
                      </h3>
                      <span
                        :class="getBranchStatus(branch).color"
                        class="px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                      >
                        <svg
                          v-if="getBranchStatus(branch).icon === 'check'"
                          class="w-3 h-3"
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
                        <svg
                          v-else
                          class="w-3 h-3"
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
                        {{ getBranchStatus(branch).text }}
                      </span>
                    </div>

                    <p class="mt-1 text-sm text-gray-600">
                      {{ branch.address }}
                    </p>

                    <div
                      class="mt-2 flex items-center gap-4 text-sm text-gray-500"
                    >
                      <span class="flex items-center gap-1">
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
                        {{ getTodayHours(branch) }}
                      </span>
                      <span v-if="branch.phone" class="flex items-center gap-1">
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
                        {{ branch.phone }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3"
          >
            <button
              v-if="branchStore.hasActiveBranch"
              @click="close"
              class="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm transition-all"
            >
              Cancel
            </button>
            <button
              :disabled="!selectedBranchId || isLoading"
              class="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-2"
              @click="handleConfirmSelection"
            >
              <svg
                v-if="isLoading"
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
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{{
                isLoading
                  ? "Switching..."
                  : branchStore.hasActiveBranch
                    ? "Switch Store"
                    : "Start Shopping"
              }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Cart Warning Dialog -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showCartWarning"
        class="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <div
          class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">
                  Switching Stores?
                </h3>
                <p class="text-sm text-gray-600">
                  This action will affect your cart
                </p>
              </div>
            </div>

            <div
              class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
            >
              <p class="text-sm text-amber-800">
                <span class="font-semibold">Warning:</span> Your cart contains
                <span class="font-bold">{{ cartStore.cartCount }}</span> item{{
                  cartStore.cartCount === 1 ? "" : "s"
                }}
                from
                <span class="font-bold">{{ cartStore.currentStoreName }}</span
                >.
              </p>
              <p class="text-sm text-amber-800 mt-2">
                Switching to a different store will
                <span class="font-bold">clear your current cart</span>. You can
                only order from one HomeAffairs branch at a time.
              </p>
            </div>

            <div class="flex gap-3">
              <button
                @click="cancelCartWarning"
                class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Keep Current Store
              </button>
              <button
                @click="confirmSelection"
                class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Clear Cart & Switch
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
