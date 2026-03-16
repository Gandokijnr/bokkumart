<template>
  <!-- Fixed Bottom Navigation Bar - Mobile Only -->
  <nav
    class="fixed bottom-0 left-0 right-0 z-[100] md:hidden"
    style="padding-bottom: env(safe-area-inset-bottom, 0px)"
  >
    <!-- Glassmorphism Background -->
    <div
      class="absolute inset-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    />

    <!-- Navigation Items -->
    <div class="relative grid grid-cols-5 h-16">
      <template v-for="item in navItems" :key="item.name">
        <!-- Button for modal actions (Search, Categories) -->
        <button
          v-if="item.isButton"
          class="flex flex-col items-center justify-center gap-1 min-h-[64px] min-w-[44px] tap-highlight-transparent"
          :class="isActive(item.to) ? 'text-amber-900' : 'text-gray-500'"
          @click="handleNavClick(item)"
        >
          <!-- Icon Container -->
          <div class="relative flex items-center justify-center">
            <!-- Cart Badge -->
            <span
              v-if="item.name === 'Cart' && cartCount > 0"
              class="absolute -top-1 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFC107] text-[10px] font-bold text-white shadow-sm"
              :class="{ 'animate-pulse': cartPulse }"
            >
              {{ cartCount > 9 ? "9+" : cartCount }}
            </span>

            <!-- Icon -->
            <Icon
              v-if="item.name === 'Cart'"
              name="lucide:shopping-basket"
              size="24"
              class="transition-all duration-200"
              :class="isActive(item.to) ? 'scale-110' : ''"
            />
            <svg
              v-else
              class="w-6 h-6 transition-all duration-200"
              :class="isActive(item.to) ? 'scale-110' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.8"
              v-html="item.icon"
            />
          </div>

          <!-- Label -->
          <span class="text-[10px] font-medium transition-colors duration-200">
            {{ item.name }}
          </span>
        </button>

        <!-- NuxtLink for regular navigation -->
        <NuxtLink
          v-else
          :to="item.to"
          active-class=""
          exact-active-class=""
          class="flex flex-col items-center justify-center gap-1 min-h-[64px] min-w-[44px] tap-highlight-transparent"
          :class="[
            isActive(item.to) ? 'text-amber-900' : 'text-gray-500',
            { 'pointer-events-none': item.disabled },
          ]"
          @click="handleNavClick(item)"
        >
          <!-- Icon Container -->
          <div class="relative flex items-center justify-center">
            <!-- Cart Badge -->
            <span
              v-if="item.name === 'Cart' && cartCount > 0"
              class="absolute -top-1 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFC107] text-[10px] font-bold text-white shadow-sm"
              :class="{ 'animate-pulse': cartPulse }"
            >
              {{ cartCount > 9 ? "9+" : cartCount }}
            </span>

            <!-- Icon -->
            <Icon
              v-if="item.name === 'Cart'"
              name="lucide:shopping-basket"
              size="24"
              class="transition-all duration-200"
              :class="isActive(item.to) ? 'scale-110' : ''"
            />
            <svg
              v-else
              class="w-6 h-6 transition-all duration-200"
              :class="isActive(item.to) ? 'scale-110' : ''"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.8"
              v-html="item.icon"
            />
          </div>

          <!-- Label -->
          <span class="text-[10px] font-medium transition-colors duration-200">
            {{ item.name }}
          </span>
        </NuxtLink>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useCartStore } from "~/stores/useCartStore";
import { useUserStore } from "~/stores/user";

const cartStore = useCartStore();
const userStore = useUserStore();
const route = useRoute();

// Cart pulse animation trigger
const cartPulse = ref(false);

// Watch for cart changes to trigger pulse
watch(
  () => cartStore.cartCount,
  (newVal, oldVal) => {
    if (newVal > oldVal) {
      cartPulse.value = true;
      setTimeout(() => (cartPulse.value = false), 500);
    }
  },
);

// Computed cart count
const cartCount = computed(() => cartStore.cartCount);

// SVG Icon Paths (as strings for v-html)
const icons = {
  home: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />`,
  categories: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />`,
  search: `<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />`,
  cart: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />`,
  account: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />`,
};

// Navigation items
type NavItemBase = {
  name: string;
  to: string;
  icon: string;
  disabled?: boolean;
};

type NavItem = NavItemBase &
  (
    | {
        isButton: true;
      }
    | {
        isButton?: false;
      }
  );

const navItems: NavItem[] = [
  { name: "Home", to: "/", icon: icons.home },
  {
    name: "Categories",
    to: "#categories",
    icon: icons.categories,
    isButton: true,
  },
  { name: "Search", to: "#search", icon: icons.search, isButton: true },
  { name: "Cart", to: "/cart", icon: icons.cart },
  { name: "Account", to: "/profile", icon: icons.account },
];

// Check if route is active
const isActive = (path: string) => {
  if (path === "#search") return false;
  if (path === "/") {
    return route.path === "/";
  }
  return route.path === path || route.path.startsWith(path.replace("/#", ""));
};

// Handle navigation click with haptic feedback
const emit = defineEmits<{
  openSearch: [];
  openCategories: [];
}>();

const handleNavClick = (item: NavItem) => {
  // Trigger haptic feedback if available (PWA)
  if (window.navigator && "vibrate" in window.navigator) {
    window.navigator.vibrate(10); // 10ms subtle vibration
  }

  // Handle search button
  if (item.name === "Search") {
    emit("openSearch");
    return false; // Prevent navigation
  }

  // Handle categories button
  if (item.name === "Categories") {
    emit("openCategories");
    return false; // Prevent navigation
  }
};
</script>

<style scoped>
/* Prevent tap highlight on mobile */
.tap-highlight-transparent {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

/* Ensure minimum touch target of 44px */
nav a {
  touch-action: manipulation;
}

/* Smooth transitions */
nav a:active svg {
  transform: scale(0.95);
}
</style>
