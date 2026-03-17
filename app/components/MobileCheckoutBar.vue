<template>
  <div
    v-if="show"
    class="fixed left-0 right-0 z-[110] border-t-2 border-gray-200 bg-white p-3 shadow-lg lg:hidden sm:p-4"
    style="
      bottom: calc(64px + env(safe-area-inset-bottom, 0px));
      padding-bottom: max(12px, env(safe-area-inset-bottom));
    "
  >
    <div class="mb-2.5 flex items-center justify-between sm:mb-3">
      <span class="text-xs text-gray-600 sm:text-sm">Total</span>
      <span class="text-lg font-bold text-blue-600 sm:text-xl">{{
        formatPrice(total)
      }}</span>
    </div>
    <button
      @click="$emit('checkout')"
      :disabled="disabled"
      class="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50 sm:py-3.5"
    >
      {{ disabled ? "Update Cart" : "Proceed to Checkout" }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  total: number;
  disabled: boolean;
}>();

const emit = defineEmits<{
  checkout: [];
}>();

function formatPrice(price: number): string {
  return "₦" + price.toLocaleString("en-NG");
}
</script>
