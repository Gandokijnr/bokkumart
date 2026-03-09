// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  ssr: true,
  css: ["~/assets/css/main.css"],

  modules: ["@nuxtjs/supabase", "@nuxt/icon", "@vite-pwa/nuxt"],

  pwa: {
    registerType: "autoUpdate",
    workbox: {
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern:
            /^https:\/\/.+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "supabase-images",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
          handler: "CacheFirst",
          options: {
            cacheName: "product-images",
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /^https:\/\/.*\/api\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 5 * 60, // 5 minutes
            },
            networkTimeoutSeconds: 3,
          },
        },
      ],
    },
    client: {
      installPrompt: false,
    },
    manifest: {
      name: "HomeAffairs",
      short_name: "HomeAffairs",
      description: "Your local grocery delivery service",
      theme_color: "#dc2626",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: "/auth",
      callback: "/confirm",
      include: ["/checkout", "/profile"],
      exclude: ["/auth", "/"],
      saveRedirectToCookie: true,
    },
    clientOptions: {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  },

  runtimeConfig: {
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    orderPaymentTimeoutMinutes: Number(
      process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15,
    ),
    inventoryRecheckBeforePayment:
      process.env.INVENTORY_RECHECK_BEFORE_PAYMENT === "true",
    public: {
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    },
  },

  vite: {
    plugins: [tailwindcss() as any],
  },
});
