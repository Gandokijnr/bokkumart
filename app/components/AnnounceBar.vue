<template>
  <div class="bg-red-800 text-white">
    <div class="mx-auto w-full px-4 sm:px-6">
      <div class="flex h-8 items-center gap-3 overflow-hidden text-xs sm:text-sm">
        <span class="font-semibold tracking-wide">Seasonal:</span>

        <div class="relative flex-1 overflow-hidden">
          <div class="whitespace-nowrap">
            {{ messages[activeIndex] }}
          </div>
        </div>

        <button
          type="button"
          class="hidden sm:inline-flex rounded-md bg-white/10 px-2 py-1 font-semibold hover:bg-white/15"
          @click="next"
        >
          <Icon name="mdi:chevron-right" class="text-lg" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const messages = [
  'Hampers now available at Gbagada & Ogba!',
  'Same-day delivery in Gbagada (T&Cs apply).',
  'Click & Collect ready in 30 mins.'
]

const activeIndex = ref(0)

const next = () => {
  activeIndex.value = (activeIndex.value + 1) % messages.length
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(next, 3500)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
