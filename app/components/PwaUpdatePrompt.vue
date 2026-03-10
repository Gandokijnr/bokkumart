<script setup lang="ts">
const isClient = import.meta.client;

// State
const needRefresh = ref(false);

// Check for updates - non blocking
function checkForUpdates() {
  if (!isClient || !("serviceWorker" in navigator)) return;

  // Use timeout to avoid blocking page load
  setTimeout(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if already waiting
      if (registration.waiting) {
        needRefresh.value = true;
        return;
      }

      // Listen for new updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            needRefresh.value = true;
          }
        });
      });
    } catch {
      // Silent fail - not critical
    }
  }, 2000); // Delay 2 seconds to let page load first
}

// Update the app
async function updateApp() {
  if (!isClient || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Tell waiting worker to skip waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    // Reload to activate new version
    window.location.reload();
  } catch {
    // Fallback: just reload
    window.location.reload();
  }
}

// Dismiss the notification
function dismiss() {
  needRefresh.value = false;
  try {
    localStorage.setItem("pwa_update_dismissed", Date.now().toString());
  } catch {
    // ignore
  }
}

onMounted(() => {
  if (!isClient) return;

  // Check if user dismissed recently (within 1 hour)
  try {
    const dismissedAt = localStorage.getItem("pwa_update_dismissed");
    if (dismissedAt) {
      const hoursSince =
        (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSince < 1) {
        // Don't show again if dismissed within 1 hour
        return;
      }
    }
  } catch {
    // ignore
  }

  checkForUpdates();
});
</script>

<template>
  <Transition name="update-banner">
    <div
      v-if="needRefresh"
      class="fixed top-0 left-0 right-0 z-[10001] bg-red-600 text-white shadow-lg"
    >
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <!-- Update icon -->
        <div class="flex-shrink-0">
          <svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
        </div>

        <!-- Text -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold leading-tight">Update Available</div>
          <div class="text-xs leading-tight mt-0.5 opacity-90">
            A new version of HomeAffairs is ready to install
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            class="px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            @click="dismiss"
            type="button"
          >
            Later
          </button>
          <button
            class="flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-red-600 hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
            @click="updateApp"
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
            Update Now
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Slide down transition */
.update-banner-enter-active,
.update-banner-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.3s ease;
}
.update-banner-enter-from,
.update-banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
