<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useCartStore } from "~/stores/useCartStore";
import { subscribeToPush } from "~/composables/usePushNotifications";

useHead({
  titleTemplate: (title) =>
    title
      ? `${title} | BokkuXpress`
      : "BokkuXpress - Your Trusted Online Grocery Marketplace",
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
    { name: "theme-color", content: "#0052CC" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    { name: "apple-mobile-web-app-title", content: "BokkuXpress" },
  ],
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon-180x180.png" },
    { rel: "manifest", href: "/manifest.json" },
  ],
});

const nuxtLoading = useLoadingIndicator();
const isNavigating = computed(() => nuxtLoading.isLoading.value);

const cartStore = useCartStore();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const roleGateRedirecting = useState<boolean>(
  "role_gate_redirecting",
  () => false,
);

onMounted(() => {
  if (!import.meta.client) return;

  const splash = document.getElementById("__bokku-splash");
  if (splash) splash.remove();

  watch(
    () => (user.value as any)?.id || (user.value as any)?.sub || null,
    async (userId) => {
      if (!userId) return;
      if (cartStore.fetchedForUserId === userId) return;
      try {
        await cartStore.loadFromDatabase(supabase as any);
        // Subscribe to push notifications after successful login
        if (user.value) {
          subscribeToPush(user.value as any).catch((err) => {
            console.error("[Push] Auto-subscription failed:", err);
          });
        }
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
    <PwaUpdatePrompt />

    <div
      v-if="isNavigating"
      class="fixed inset-0 z-[9998] flex items-center justify-center bg-white"
    >
      <div class="flex items-center gap-3 text-[#0052CC] animate-pulse">
        <Icon name="lucide:zap" size="24" />
        <div class="text-lg font-extrabold tracking-tight">BokkuXpress</div>
      </div>
    </div>

    <div
      v-if="roleGateRedirecting"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm"
    >
      <div
        class="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#0052CC]"
          />
          <div class="text-sm font-semibold text-gray-900">
            Redirecting to your workspace...
          </div>
        </div>
      </div>
    </div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
