<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <IosInstallPrompt />
    <AndroidInstallPrompt />
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
    <AppFooter />
    <MobileBottomNav
      @open-search="showGlobalSearch = true"
      @open-categories="showCategoriesSheet = true"
    />

    <!-- Global Search Modal -->
    <GlobalSearch v-model="showGlobalSearch" />

    <!-- Categories Bottom Sheet -->
    <CategoriesBottomSheet v-model="showCategoriesSheet" />
  </div>
</template>

<script setup lang="ts">
const showGlobalSearch = ref(false);
const showCategoriesSheet = ref(false);
</script>
