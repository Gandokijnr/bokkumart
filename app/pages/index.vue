<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Skip to content for accessibility -->
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-red-600"
    >
      Skip to content
    </a>

    <!-- Header -->
    <AppHeader />

    <main id="main">
      <!-- Hero Section -->
      <HeroSection />

      <!-- Categories Section -->
      <CategoryGrid :categories="categories" />

      <!-- Featured Products / Deals Section -->
      <ProductGrid />

      <!-- About / Benefits Section -->
      <BenefitsSection :benefits="benefits" />

      <!-- Footer -->
      <AppFooter />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useProducts } from "../composables/useProducts";
import { useLocationStore } from "../stores/useLocationStore";
import { useStoreLocator } from "../composables/useStoreLocator";

const locationStore = useLocationStore();
const { fetchStores } = useStoreLocator();

const categories = [
  { name: "Fresh Produce", icon: "🥬", sub: "Fruits & vegetables" },
  { name: "Dairy & Eggs", icon: "🥛", sub: "Milk, yogurt, cheese" },
  { name: "Beverages", icon: "🥤", sub: "Drinks & juices" },
  { name: "Bakery", icon: "🥖", sub: "Bread & pastries" },
  { name: "Household", icon: "🏠", sub: "Cleaning supplies" },
];

const benefits = [
  {
    icon: "✨",
    title: "Freshness Guaranteed",
    description:
      "Hand-picked items with rigorous quality checks on every single order.",
  },
  {
    icon: "🚚",
    title: "Fast & Flexible Delivery",
    description:
      "Same-day delivery or convenient pickup—choose what fits your schedule.",
  },
  {
    icon: "🏷️",
    title: "Exclusive Daily Deals",
    description:
      "Save big with flash sales, weekly bundles, and member-only discounts.",
  },
  {
    icon: "🔒",
    title: "Safe & Secure Shopping",
    description:
      "Encrypted checkout and trusted payment options for complete peace of mind.",
  },
];

const { formatPrice } = useProducts();

onMounted(async () => {
  // Load store selection and fetch stores if needed
  locationStore.loadStoredSelection();

  if (locationStore.stores.length === 0) {
    await fetchStores();
  }
});

useHead({
  title: "HomeAffairs — Premium Nigerian Supermarket Online",
  meta: [
    {
      name: "description",
      content:
        "Shop premium groceries online from HomeAffairs. Fresh produce, dairy, beverages, bakery items, and household essentials with fast delivery or convenient pickup.",
    },
    { name: "theme-color", content: "#DC2626" },
    {
      property: "og:title",
      content: "HomeAffairs — Shop Smarter, Live Better.",
    },
    {
      property: "og:description",
      content:
        "Your favorite premium supermarket is now online. Fresh essentials, curated brands, and fast delivery.",
    },
    { property: "og:type", content: "website" },
  ],
});
</script>
