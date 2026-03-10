<template>
  <div
    class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12"
  >
    <div class="w-full max-w-lg text-center">
      <div
        class="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4"
      >
        <svg
          class="w-8 h-8 text-white"
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

      <h1 class="text-2xl font-bold text-gray-900">Thank you!</h1>
      <p class="mt-2 text-sm text-gray-600">
        Your rider application has been submitted successfully.
      </p>

      <div
        class="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <p class="text-sm text-gray-700">
          Please check back in <span class="font-semibold">24 hours</span> while
          our branch manager reviews your documents.
        </p>
        <p class="mt-2 text-xs text-gray-500">
          If you need help, contact support.
        </p>

        <div class="mt-6 flex flex-col gap-3">
          <NuxtLink
            to="/"
            class="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Back to home
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});
</script>
