<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useCartStore } from "~/stores/useCartStore";

useHead({
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
    { name: "theme-color", content: "#dc2626" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    { name: "apple-mobile-web-app-title", content: "HomeAffairs" },
  ],
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon-180x180.png" },
  ],
});

const cartStore = useCartStore();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

onMounted(() => {
  if (!import.meta.client) return;

  watch(
    () => (user.value as any)?.id || (user.value as any)?.sub || null,
    async (userId) => {
      if (!userId) return;
      if (cartStore.fetchedForUserId === userId) return;
      try {
        await cartStore.loadFromDatabase(supabase as any);
      } finally {
        cartStore.markFetchedForUser(userId);
      }
    },
    { immediate: true },
  );
});
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
