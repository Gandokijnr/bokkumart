<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="onCancel"
    >
      <div
        class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        :class="borderColorClass"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900">
            {{ title }}
          </h3>
          <button @click="onCancel" class="text-gray-400 hover:text-gray-600">
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
          <div class="rounded-lg border p-3" :class="infoBoxClass">
            <p class="text-sm" :class="infoTextClass">
              <span v-if="orderId">
                Order <strong>#{{ formattedOrderId }}</strong> -
              </span>
              {{ description }}
            </p>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700">
              {{ inputLabel }}
            </label>
            <input
              ref="codeInput"
              v-model="localCode"
              type="text"
              :maxlength="maxLength"
              :placeholder="inputPlaceholder"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
              :class="{ 'border-red-500': localError }"
              @keyup.enter="onVerify"
            />
            <p
              v-if="localError"
              class="mt-2 text-sm font-semibold text-red-600"
            >
              {{ localError }}
            </p>
          </div>

          <div class="mt-4 flex gap-3">
            <button
              @click="onCancel"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {{ cancelText }}
            </button>
            <button
              @click="onVerify"
              :disabled="!canVerify || loading"
              :class="verifyButtonClass"
              class="flex-1 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span v-if="loading">{{ loadingText }}</span>
              <span v-else>{{ verifyButtonText }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";

type VerificationType = "pickup" | "delivery";

interface Props {
  modelValue: boolean;
  type: VerificationType;
  orderId?: string;
  orderIdLength?: number;
  loading?: boolean;
  error?: string;
  maxLength?: number;
  minLength?: number;
  cancelText?: string;
  verifyText?: string;
  loadingText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  orderId: undefined,
  orderIdLength: 8,
  loading: false,
  error: "",
  maxLength: 6,
  minLength: 4,
  cancelText: "Cancel",
  verifyText: undefined, // Will be computed based on type
  loadingText: "Verifying...",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "verify", code: string): void;
  (e: "cancel"): void;
}>();

const localCode = ref("");
const localError = ref("");
const codeInput = ref<HTMLInputElement | null>(null);

// Reset code when modal opens
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      localCode.value = "";
      localError.value = "";
      nextTick(() => {
        codeInput.value?.focus();
      });
    }
  },
);

// Sync external error
watch(
  () => props.error,
  (newError) => {
    localError.value = newError;
  },
  { immediate: true },
);

const isPickup = computed(() => props.type === "pickup");
const isDelivery = computed(() => props.type === "delivery");

const title = computed(() => {
  if (isPickup.value) return "Verify Pickup Collection";
  return "Verify Delivery";
});

const description = computed(() => {
  if (isPickup.value)
    return "Enter the customer's collection code to complete pickup.";
  return "Enter the customer's delivery PIN to complete delivery.";
});

const inputLabel = computed(() => {
  if (isPickup.value) return "Collection Code";
  return "Delivery PIN";
});

const inputPlaceholder = computed(() => {
  if (isPickup.value) return "Enter code";
  return "Enter PIN";
});

const verifyButtonText = computed(() => {
  if (props.verifyText) return props.verifyText;
  if (isPickup.value) return "Verify & Complete Pickup";
  return "Verify & Complete Delivery";
});

const formattedOrderId = computed(() => {
  if (!props.orderId) return "";
  return props.orderId.slice(-props.orderIdLength).toUpperCase();
});

const borderColorClass = computed(() => {
  return isPickup.value
    ? "border-t-4 border-amber-500"
    : "border-t-4 border-emerald-500";
});

const infoBoxClass = computed(() => {
  return isPickup.value
    ? "border-amber-200 bg-amber-50"
    : "border-emerald-200 bg-emerald-50";
});

const infoTextClass = computed(() => {
  return isPickup.value ? "text-amber-800" : "text-emerald-800";
});

const verifyButtonClass = computed(() => {
  return isPickup.value
    ? "bg-amber-600 hover:bg-amber-700"
    : "bg-emerald-600 hover:bg-emerald-700";
});

const canVerify = computed(() => {
  const code = localCode.value.trim();
  return code.length >= props.minLength && code.length <= props.maxLength;
});

function onCancel() {
  emit("cancel");
  emit("update:modelValue", false);
}

function onVerify() {
  if (!canVerify.value) {
    localError.value = `Please enter a valid code (${props.minLength}-${props.maxLength} characters).`;
    return;
  }
  localError.value = "";
  emit("verify", localCode.value.trim());
}
</script>
