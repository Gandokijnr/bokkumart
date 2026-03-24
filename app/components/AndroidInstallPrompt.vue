<script setup lang="ts">
import { onMounted, ref, computed } from "vue";

const isClient = import.meta.client;

const deferredPrompt = ref<any>(null);
const showPrompt = ref(false);
const dismissed = ref(false);

const isAndroid = computed(() => {
  if (!isClient) return false;
  const ua = window.navigator.userAgent || "";
  return /Android/i.test(ua);
});

const isStandalone = computed(() => {
  if (!isClient) return false;
  const nav: any = window.navigator as any;
  const standaloneNavigator = !!nav.standalone;
  const standaloneDisplayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return standaloneNavigator || standaloneDisplayMode;
});

const shouldShowPrompt = computed(() => {
  return (
    isAndroid.value &&
    !isStandalone.value &&
    showPrompt.value &&
    !dismissed.value &&
    deferredPrompt.value !== null
  );
});

function dismiss() {
  dismissed.value = true;
  showPrompt.value = false;
  try {
    localStorage.setItem("android_a2hs_dismissed", "1");
  } catch {
    // ignore
  }
}

async function install() {
  if (!deferredPrompt.value) return;

  deferredPrompt.value.prompt();

  const { outcome } = await deferredPrompt.value.userChoice;

  if (outcome === "accepted") {
    console.log("User accepted the install prompt");
  } else {
    console.log("User dismissed the install prompt");
  }

  deferredPrompt.value = null;
  showPrompt.value = false;
}

onMounted(() => {
  if (!isClient) return;

  try {
    dismissed.value = localStorage.getItem("android_a2hs_dismissed") === "1";
  } catch {
    dismissed.value = false;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showPrompt.value = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt.value = null;
    showPrompt.value = false;
    console.log("PWA was installed");
  });
});
</script>

<template>
  <Transition name="banner">
    <div
      v-if="shouldShowPrompt"
      class="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
    >
      <div class="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
        <div
          class="w-11 h-11 rounded-[12px] bg-[#0052CC] flex items-center justify-center flex-shrink-0 shadow"
        >
          <svg
            class="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold text-gray-900 leading-tight truncate">
            Install BokkuXpress
          </div>
          <div class="text-xs text-gray-500 leading-tight mt-0.5 truncate">
            Add to Home Screen for quick access
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            class="px-3 py-2 text-xs font-semibold text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
            @click="dismiss"
            type="button"
          >
            Not now
          </button>
          <button
            class="flex items-center gap-1.5 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-bold text-white hover:bg-[#003D8F] active:scale-95 transition-all shadow-sm"
            @click="install"
            type="button"
          >
            <svg
              class="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Install
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.banner-enter-active,
.banner-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.3s ease;
}
.banner-enter-from,
.banner-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
