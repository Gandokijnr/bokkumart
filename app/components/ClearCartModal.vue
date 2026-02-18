<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="$emit('cancel')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6">
      <div
        class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 sm:mb-4"
      >
        <svg
          class="h-6 w-6 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </div>
      <h3 class="mb-2 text-base font-bold text-gray-900 sm:text-lg">
        Clear your cart?
      </h3>
      <p class="mb-5 text-xs text-gray-600 sm:mb-6 sm:text-sm">
        This will remove all items from your cart. This action cannot be undone.
      </p>
      <div class="flex gap-2.5 sm:gap-3">
        <button
          @click="$emit('cancel')"
          class="flex-1 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 sm:py-3"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          class="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 sm:py-3"
        >
          Clear Cart
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();
</script>
