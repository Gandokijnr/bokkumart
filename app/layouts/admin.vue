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
// The AppSidebar component handles all navigation, role-based filtering, and user info
// No additional logic needed here - the layout is just a container
</script>
