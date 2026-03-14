<template>
  <div
    class="flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-3 sm:gap-4 sm:p-4"
  >
    <div
      class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0052CC] text-white sm:h-12 sm:w-12"
    >
      <svg
        class="h-5 w-5 sm:h-6 sm:w-6"
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
    </div>
    <div class="flex-1">
      <p class="text-sm font-bold text-gray-900 sm:text-base">
        Shopping from: {{ storeName || "BokkuMart Store" }}
      </p>
      <p class="text-xs text-gray-600 sm:text-sm">
        All items reserved for 10 minutes
      </p>
    </div>
    <div v-if="timeRemaining > 0" class="flex-shrink-0">
      <span
        class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 sm:px-3"
      >
        <svg
          class="mr-1 h-3 w-3"
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
        <span>{{ formatTime(timeRemaining) }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  storeName: string | null;
  timeRemaining: number;
}>();

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
</script>
