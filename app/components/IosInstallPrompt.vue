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
  return isiOS.value && isSafari.value && !isStandalone.value && !dismissed.value;
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
    <div
      v-if="showInstructions"
      class="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm"
      @click.self="closeInstructions"
    >
      <div
        class="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-6 shadow-2xl"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-base font-semibold text-gray-900">
              Add HomeAffairs to your Home Screen
            </div>
            <div class="mt-2 text-sm text-gray-600">
              Tap the <span class="font-semibold">Share</span> button in Safari,
              then select <span class="font-semibold">Add to Home Screen</span>.
            </div>
          </div>
          <button
            class="rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            @click="closeInstructions"
            type="button"
          >
            Close
          </button>
        </div>

        <div class="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div class="text-sm font-semibold text-gray-900">Steps</div>
          <div class="mt-2 space-y-2 text-sm text-gray-700">
            <div>
              1) Tap the <span class="font-semibold">Share</span> icon in the
              Safari toolbar
            </div>
            <div>
              2) Scroll and tap <span class="font-semibold">Add to Home Screen</span>
            </div>
            <div>
              3) Tap <span class="font-semibold">Add</span>
            </div>
          </div>
        </div>

        <div class="mt-5 flex justify-end">
          <button
            class="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
            @click="closeInstructions"
            type="button"
          >
            Got it
          </button>
        </div>
      </div>

      <div class="pointer-events-none absolute bottom-28 left-0 right-0">
        <div class="mx-auto w-full max-w-md px-6">
          <div class="rounded-2xl bg-white/90 p-3 text-xs font-semibold text-gray-800 shadow">
            Look for the Share button in Safari and choose “Add to Home Screen”.
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="shouldShowBanner"
      class="fixed bottom-0 left-0 right-0 z-[9999] border-t border-gray-200 bg-white/95 backdrop-blur"
    >
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 p-4">
        <div>
          <div class="text-sm font-semibold text-gray-900">
            Install HomeAffairs
          </div>
          <div class="text-xs text-gray-600">
            Add this app to your Home Screen for a faster experience.
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            @click="dismiss"
            type="button"
          >
            Not now
          </button>
          <button
            class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            @click="openInstructions"
            type="button"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
