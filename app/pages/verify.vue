<script setup lang="ts">
// Redirect /verify?reference=xxx to /checkout/verify?reference=xxx
// This handles Paystack callbacks that may omit the /checkout prefix
const route = useRoute();
const query = { ...route.query };
navigateTo({ path: "/checkout/verify", query }, { replace: true });
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="text-center">
      <div
        class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-red-600"
      ></div>
      <p class="mt-4 text-gray-600">Redirecting to payment verification...</p>
    </div>
  </div>
</template>
