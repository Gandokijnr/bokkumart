<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const isClient = import.meta.client;

const dismissed = ref(false);
const showInstructions = ref(false);

const isiOS = computed(() => {
  if (!isClient) return false;
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua);
});

const isSafari = computed(() => {
  if (!isClient) return false;
  const ua = window.navigator.userAgent || "";
  const isWebkit = /WebKit/.test(ua);
  const isNotOtheriOSBrowser = !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  const hasSafari = /Safari/.test(ua);
  return isWebkit && hasSafari && isNotOtheriOSBrowser;
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

const shouldShowBanner = computed(() => {
  if (!isClient) return false;
  return (
    isiOS.value && isSafari.value && !isStandalone.value && !dismissed.value
  );
});

function dismiss() {
  dismissed.value = true;
  try {
    localStorage.setItem("ios_a2hs_dismissed", "1");
  } catch {
    // ignore
  }
}

function openInstructions() {
  showInstructions.value = true;
}

function closeInstructions() {
  showInstructions.value = false;
}

onMounted(() => {
  try {
    dismissed.value = localStorage.getItem("ios_a2hs_dismissed") === "1";
  } catch {
    dismissed.value = false;
  }
});
</script>

<template>
  <div>
    <!-- Full-screen instructions modal -->
    <Transition name="modal">
      <div
        v-if="showInstructions"
        class="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end"
        @click.self="closeInstructions"
      >
        <div class="w-full rounded-t-3xl bg-white shadow-2xl overflow-hidden">
          <!-- Handle bar -->
          <div class="flex justify-center pt-3 pb-1">
            <div class="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          <!-- Header -->
          <div
            class="px-6 pt-3 pb-4 flex items-center gap-4 border-b border-gray-100"
          >
            <!-- App icon -->
            <div
              class="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg flex-shrink-0"
            >
              <svg
                class="w-7 h-7 text-white"
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
              <div class="text-base font-bold text-gray-900 leading-tight">
                Add to Home Screen
              </div>
              <div class="text-sm text-gray-500 mt-0.5">
                HomeAffairs · homeaffairs.app
              </div>
            </div>
            <button
              class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
              @click="closeInstructions"
              type="button"
              aria-label="Close"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Steps -->
          <div class="px-6 py-5 space-y-4">
            <!-- Step 1 -->
            <div class="flex gap-4 items-start">
              <div
                class="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <!-- Share icon (iOS-style arrow up from box) -->
                <svg
                  class="w-5 h-5 text-red-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold text-gray-900">
                  Tap the Share button
                </div>
                <div class="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Find the
                  <span class="font-medium text-gray-700">⬆ Share</span> icon in
                  the Safari toolbar at the bottom of your screen.
                </div>
              </div>
              <div
                class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <span class="text-sm">1</span>
              </div>
            </div>

            <!-- Connector line -->
            <div class="ml-[1.0625rem] w-px h-4 bg-gray-200" />

            <!-- Step 2 -->
            <div class="flex gap-4 items-start">
              <div
                class="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <!-- Plus-square icon -->
                <svg
                  class="w-5 h-5 text-red-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold text-gray-900">
                  Tap "Add to Home Screen"
                </div>
                <div class="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Scroll down in the share sheet and tap
                  <span class="font-medium text-gray-700"
                    >Add to Home Screen</span
                  >.
                </div>
              </div>
              <div
                class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <span class="text-sm">2</span>
              </div>
            </div>

            <!-- Connector line -->
            <div class="ml-[1.0625rem] w-px h-4 bg-gray-200" />

            <!-- Step 3 -->
            <div class="flex gap-4 items-start">
              <div
                class="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <!-- Check icon -->
                <svg
                  class="w-5 h-5 text-red-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold text-gray-900">
                  Tap "Add to Home Screen"
                </div>
                <div class="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Confirm by tapping
                  <span class="font-medium text-gray-700">Add</span> in the
                  top-right corner.
                </div>
              </div>
              <div
                class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <span class="text-sm">3</span>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <div class="px-6 pb-8">
            <button
              class="w-full rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white hover:bg-red-700 active:scale-[0.98] transition-all"
              @click="closeInstructions"
              type="button"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Bottom install banner -->
    <Transition name="banner">
      <div
        v-if="shouldShowBanner"
        class="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      >
        <div class="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <!-- App icon -->
          <div
            class="w-11 h-11 rounded-[12px] bg-red-600 flex items-center justify-center flex-shrink-0 shadow"
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

          <!-- Text -->
          <div class="flex-1 min-w-0">
            <div class="text-sm font-bold text-gray-900 leading-tight truncate">
              Install HomeAffairs
            </div>
            <div class="text-xs text-gray-500 leading-tight mt-0.5 truncate">
              Add to Home Screen for the best experience
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              class="px-3 py-2 text-xs font-semibold text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
              @click="dismiss"
              type="button"
            >
              Not now
            </button>
            <button
              class="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              @click="openInstructions"
              type="button"
            >
              <!-- Download/add icon -->
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
  </div>
</template>

<style scoped>
/* Modal slide-up transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .absolute,
.modal-leave-active .absolute,
.modal-enter-active > div > div:last-child,
.modal-leave-active > div > div:last-child {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(100%);
}

/* Banner slide-up transition */
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
