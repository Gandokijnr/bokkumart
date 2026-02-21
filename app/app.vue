<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useCartStore } from "~/stores/useCartStore";

useHead({
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
  ],
  link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
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
