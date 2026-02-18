<template>
  <svg
    class="w-5 h-5"
    :class="[colorClass]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <!-- Envelope icon -->
    <path
      v-if="name === 'envelope'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
    <!-- Phone icon -->
    <path
      v-else-if="name === 'phone'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
    <!-- Check circle icon -->
    <path
      v-else-if="name === 'check-circle'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <!-- Exclamation circle icon -->
    <path
      v-else-if="name === 'exclamation-circle'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <!-- Information circle icon -->
    <path
      v-else-if="name === 'information-circle'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

withDefaults(
  defineProps<{
    name: string;
    color?: "gray" | "white";
  }>(),
  {
    color: "gray",
  },
);

const colorClass = computed(() => {
  return {
    gray: "text-gray-400",
    white: "text-white",
  };
});
</script>
