<template>
  <section class="bg-gray-50">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <div class="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        
        <div class="lg:col-span-9 flex flex-col gap-4">
          
          <div class="relative overflow-hidden rounded-3xl bg-black aspect-[4/5] sm:aspect-[21/9] lg:aspect-auto lg:h-[420px] shadow-sm">
            <ClientOnly>
              <Swiper
                :modules="[Autoplay, Pagination, Navigation]"
                :loop="true"
                :autoplay="{ delay: 4500 }"
                :pagination="{ clickable: true }"
                class="h-full w-full"
              >
                <SwiperSlide v-for="slide in slides" :key="slide.id">
                  <div class="relative h-full w-full flex flex-col justify-end pb-12 px-6 sm:justify-center sm:pb-0 sm:px-12">
                    <img v-if="slide.image" :src="slide.image" class="absolute inset-0 h-full w-full object-cover" :alt="slide.title" />
                    <div v-else class="absolute inset-0 h-full w-full" :class="slide.backgroundClass" />
                    
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent sm:bg-gradient-to-r sm:from-black/70 sm:to-transparent" />

                    <div class="relative z-10">
                      <p class="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                        {{ slide.kicker }}
                      </p>
                      <h2 class="mt-2 max-w-[280px] sm:max-w-[500px] text-3xl font-extrabold leading-[1.1] text-white sm:text-5xl">
                        {{ slide.title }}
                      </h2>
                      <p class="mt-3 max-w-[400px] text-sm text-white/70 sm:text-lg sm:text-white/85">
                        {{ slide.subtitle }}
                      </p>
                      
                      <div class="mt-6 sm:mt-8">
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-extrabold text-gray-900 shadow-xl transition-all active:scale-95 hover:bg-gray-100"
                          @click="navigateTo(slide.ctaHref)"
                        >
                          Shop Now
                        </button>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              </Swiper>
            </ClientOnly>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div v-for="(badge, i) in badges" :key="i" class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <span class="text-xl">{{ badge.icon }}</span>
              <div>
                <div class="text-sm font-bold text-gray-900 leading-tight">{{ badge.title }}</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ badge.desc }}</div>
              </div>
            </div>
          </div>

          <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-700 to-red-600 p-6 text-white">
            <div class="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            
            <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-rose-200">Flash Sale</span>
                <div class="mt-1 text-lg font-extrabold sm:text-xl">Up to 25% off selected Hampers</div>
                <div class="text-xs text-rose-100">Ends at midnight. Terms apply.</div>
              </div>

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-900"
                @click="navigateTo('/#deals')"
              >
                View Deal
              </button>
            </div>
          </div>
        </div>

        <div class="lg:col-span-3 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0 lg:flex lg:flex-col">
          <button
            v-for="(card, key) in sideCardData"
            :key="key"
            type="button"
            class="group relative aspect-[4/3] w-[85%] min-w-[260px] flex-none snap-center overflow-hidden rounded-3xl border border-gray-200 bg-gray-200 text-left sm:w-auto sm:min-w-0 lg:flex-1"
            @click="navigateTo(card.href)"
          >
            <img v-if="card.image" :src="card.image" class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div v-else class="absolute inset-0 bg-gradient-to-br" :class="card.bg" />
            
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div class="absolute inset-0 flex flex-col justify-end p-5">
              <span class="w-fit rounded-lg bg-white/20 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md uppercase tracking-wider">
                {{ card.tag }}
              </span>
              <div class="mt-2 text-xl font-extrabold leading-tight text-white">{{ card.title }}</div>
              <div class="mt-1 text-xs text-white/70">{{ card.desc }}</div>
              
              <div class="mt-4 flex items-center gap-1 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                Shop Now <span class="text-lg leading-none">›</span>
              </div>
            </div>
          </button>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
 import { Autoplay, Navigation, Pagination } from 'swiper/modules'
 
// Logic and data remains essentially the same as your original, 
// just structured for the badge/sidebar loops used above.
const badges = [
  { icon: '✅', title: 'Authentic Only', desc: 'Premium inventory' },
  { icon: '🚀', title: 'Same-Day Gbagada', desc: 'Lagos fulfillment' },
  { icon: '🛍️', title: 'Click & Collect', desc: 'Ready in 30 mins' }
]

const sideCardData = {
  valentine: {
    tag: 'Seasonal',
    title: 'Valentine Hampers',
    desc: 'Curated gift bundles',
    bg: 'from-rose-600 to-red-900',
    image: '',
    href: '/#hampers'
  },
  prepared: {
    tag: 'New',
    title: 'Prepared Food',
    desc: 'Ready-to-eat meals',
    bg: 'from-slate-800 to-slate-950',
    image: '',
    href: '/#prepared'
  }
}

const slides = [
  {
    id: 'main-1',
    kicker: 'Premium Groceries',
    title: 'Shop Smarter. Live Better.',
    subtitle: 'Fresh essentials, curated brands, and fast delivery right to your door.',
    image: '',
    backgroundClass: 'bg-gradient-to-br from-red-700 via-rose-600 to-orange-500',
    ctaHref: '/#deals',
  },
  {
    id: 'main-2',
    kicker: 'Daily Deals',
    title: 'Flash Sales Every Day',
    subtitle: 'Save more on selected essentials. Limited-time offers—grab them while they last.',
    image: '',
    backgroundClass: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700',
    ctaHref: '/#deals',
  },
  {
    id: 'main-3',
    kicker: 'Fast & Flexible',
    title: 'Same-day Delivery in Lagos',
    subtitle: 'Choose delivery or pickup—whatever fits your schedule.',
    image: '',
    backgroundClass: 'bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-500',
    ctaHref: '/#prepared',
  },
]
</script>