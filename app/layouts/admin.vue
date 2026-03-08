<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Dynamic Sidebar Component -->
    <AppSidebar />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col lg:ml-0">
      <!-- Page Content -->
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "~/stores/user";

// Apply admin authentication middleware to all admin pages
definePageMeta({
  middleware: ["admin-auth"],
});

// Initialize user store on mount
const userStore = useUserStore();

onMounted(async () => {
  // Ensure user is initialized
  if (!userStore.isAuthenticated) {
    await userStore.initialize();
  }
});
</script>
