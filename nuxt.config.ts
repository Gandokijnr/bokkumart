// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  ssr: true,
  css: ["~/assets/css/main.css"],

  app: {
    head: {
      style: [
        {
          innerHTML: `:root{--bokku-blue:#0052CC;--bokku-yellow:#FFC107;}
html,body{background:#fff;}
.bokku-splash{position:fixed;inset:0;z-index:100000;background:#fff;display:flex;align-items:center;justify-content:center;}
.bokku-splash__inner{display:flex;align-items:center;justify-content:center;padding:24px;}
.bokku-splash__brand{display:flex;align-items:center;gap:10px;color:var(--bokku-blue);animation:bokkuPulse 1.2s ease-in-out infinite;}
.bokku-splash__icon{width:24px;height:24px;}
.bokku-splash__text{font-weight:800;letter-spacing:.2px;font-size:20px;}
@keyframes bokkuPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.6;transform:scale(.985);}}
@media (prefers-reduced-motion: reduce){.bokku-splash__brand{animation:none;}}
`,
        },
      ],
    },
  },

  modules: ["@nuxtjs/supabase", "@nuxt/icon", "@vite-pwa/nuxt"],

  pwa: {
    disable: process.env.NODE_ENV === "development",
    registerType: "autoUpdate",
    devOptions: {
      enabled: false,
    },
    workbox: {
      cleanupOutdatedCaches: true,
      skipWaiting: true,
      clientsClaim: true,
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
      installPrompt: true,
    },
    manifest: {
      name: process.env.NUXT_PUBLIC_APP_NAME || "BokkuMart",
      short_name: process.env.NUXT_PUBLIC_APP_SHORT_NAME || "BokkuMart",
      description:
        process.env.NUXT_PUBLIC_APP_DESCRIPTION ||
        "Your trusted online grocery marketplace",
      theme_color: process.env.NUXT_PUBLIC_THEME_COLOR || "#0052CC",
      background_color: process.env.NUXT_PUBLIC_BACKGROUND_COLOR || "#ffffff",
      display: "standalone",
      orientation: "portrait",
      start_url: "/",
      scope: "/",
      icons: [
        {
          src: "/pwa-64x64.png",
          sizes: "64x64",
          type: "image/png",
        },
        {
          src: "/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
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
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT || "mailto:admin@bokkuMart.com",
    orderPaymentTimeoutMinutes: Number(
      process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 15,
    ),
    inventoryRecheckBeforePayment:
      process.env.INVENTORY_RECHECK_BEFORE_PAYMENT === "true",
    public: {
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      // Multitenancy Branding Configuration
      appName: process.env.NUXT_PUBLIC_APP_NAME || "BokkuMart",
      appShortName: process.env.NUXT_PUBLIC_APP_SHORT_NAME || "BokkuMart",
      appDescription:
        process.env.NUXT_PUBLIC_APP_DESCRIPTION ||
        "Your trusted online grocery marketplace",
      logoUrl: process.env.NUXT_PUBLIC_LOGO_URL || "/logo-bokku.svg",
      themeColor: process.env.NUXT_PUBLIC_THEME_COLOR || "#0052CC",
      backgroundColor: process.env.NUXT_PUBLIC_BACKGROUND_COLOR || "#ffffff",
      // Partnership Revenue Model - Technology Markup
      markupPercentage: Number(process.env.NUXT_PUBLIC_MARKUP_PERCENTAGE || 2),
      // Partner identification
      partnerName: process.env.NUXT_PUBLIC_PARTNER_NAME || "Bokku",
      supportEmail:
        process.env.NUXT_PUBLIC_SUPPORT_EMAIL || "support@bokkumart.com",
    },
  },

  vite: {
    plugins: [tailwindcss() as any],
  },
});
