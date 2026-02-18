<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Database } from "~/types/database.types";

const props = defineProps<{
  storeId?: string;
  entityId?: string;
  entityType?: "product" | "store_inventory" | "store" | "profile";
  limit?: number;
}>();

const auditLog = useAuditLog();

// State
const logs = ref<Database["public"]["Tables"]["audit_logs"]["Row"][]>([]);
const loading = ref(false);
const filterActionType = ref<string>("all");
const startDate = ref("");
const endDate = ref("");

// Computed
const filteredLogs = computed(() => {
  let filtered = logs.value;

  if (filterActionType.value !== "all") {
    filtered = filtered.filter(
      (log) => log.action_type === filterActionType.value,
    );
  }

  return filtered;
});

const actionTypeOptions = [
  { value: "all", label: "All Actions" },
  { value: "price_change", label: "Price Changes" },
  { value: "inventory_update", label: "Inventory Updates" },
  { value: "stock_adjustment", label: "Stock Adjustments" },
  { value: "product_visibility_change", label: "Visibility Changes" },
  { value: "manager_assignment", label: "Manager Assignments" },
];

// Lifecycle
onMounted(async () => {
  await fetchLogs();
});

// Methods
const fetchLogs = async () => {
  loading.value = true;
  try {
    if (props.entityId && props.entityType) {
      // Fetch logs for specific entity
      logs.value = await auditLog.fetchEntityAuditHistory(
        props.entityType,
        props.entityId,
        props.limit || 50,
      );
    } else {
      // Fetch general logs
      logs.value = await auditLog.fetchAuditLogs({
        storeId: props.storeId,
        startDate: startDate.value || undefined,
        endDate: endDate.value || undefined,
        limit: props.limit || 100,
      });
    }
  } finally {
    loading.value = false;
  }
};

const getActionColor = (actionType: string) => {
  const colors: Record<string, string> = {
    price_change: "text-orange-600 bg-orange-50",
    inventory_update: "text-blue-600 bg-blue-50",
    stock_adjustment: "text-purple-600 bg-purple-50",
    product_visibility_change: "text-gray-600 bg-gray-50",
    manager_assignment: "text-green-600 bg-green-50",
    role_change: "text-red-600 bg-red-50",
  };
  return colors[actionType] || "text-gray-600 bg-gray-50";
};

const getActionIcon = (actionType: string) => {
  const icons: Record<string, string> = {
    price_change:
      "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    inventory_update:
      "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    stock_adjustment:
      "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    product_visibility_change:
      "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    manager_assignment:
      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  };
  return (
    icons[actionType] ||
    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  );
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatValue = (value: any) => {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return value;
};
</script>

<template>
  <div class="space-y-4">
    <!-- Filters (only show if not entity-specific) -->
    <div
      v-if="!entityId"
      class="bg-white rounded-lg border border-gray-200 p-4"
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Action Type</label
          >
          <select
            v-model="filterActionType"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option
              v-for="option in actionTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Start Date</label
          >
          <input
            v-model="startDate"
            type="date"
            @change="fetchLogs"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >End Date</label
          >
          <input
            v-model="endDate"
            type="date"
            @change="fetchLogs"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>
    </div>

    <!-- Audit Log Timeline -->
    <div class="bg-white rounded-lg border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Audit History</h3>
        <p class="text-sm text-gray-500">
          Activity log of all changes and actions
        </p>
      </div>

      <div v-if="loading" class="px-6 py-12 text-center">
        <div class="flex items-center justify-center gap-2 text-gray-500">
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
          <span class="text-sm">Loading audit logs...</span>
        </div>
      </div>

      <div
        v-else-if="filteredLogs.length === 0"
        class="px-6 py-12 text-center text-gray-500"
      >
        <svg
          class="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="text-sm">No audit logs found</p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div
              :class="`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(log.action_type)}`"
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
                  :d="getActionIcon(log.action_type)"
                />
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">
                    {{ log.description }}
                  </p>
                  <div
                    class="flex items-center gap-3 mt-1 text-xs text-gray-500"
                  >
                    <span v-if="log.user_name">{{ log.user_name }}</span>
                    <span v-if="log.store_name">• {{ log.store_name }}</span>
                    <span>• {{ formatDate(log.created_at) }}</span>
                  </div>
                </div>

                <!-- Action Type Badge -->
                <span
                  :class="`inline-flex px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action_type)}`"
                >
                  {{
                    log.action_type
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  }}
                </span>
              </div>

              <!-- Old/New Values (expandable) -->
              <details v-if="log.old_value || log.new_value" class="mt-2">
                <summary
                  class="text-xs text-blue-600 cursor-pointer hover:text-blue-800"
                >
                  View details
                </summary>
                <div
                  class="mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-xs space-y-2"
                >
                  <div v-if="log.old_value">
                    <span class="font-medium text-gray-700">Before:</span>
                    <pre class="mt-1 text-gray-600 overflow-x-auto">{{
                      formatValue(log.old_value)
                    }}</pre>
                  </div>
                  <div v-if="log.new_value">
                    <span class="font-medium text-gray-700">After:</span>
                    <pre class="mt-1 text-gray-600 overflow-x-auto">{{
                      formatValue(log.new_value)
                    }}</pre>
                  </div>
                  <div
                    v-if="log.metadata && Object.keys(log.metadata).length > 0"
                  >
                    <span class="font-medium text-gray-700">Metadata:</span>
                    <pre class="mt-1 text-gray-600 overflow-x-auto">{{
                      formatValue(log.metadata)
                    }}</pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
