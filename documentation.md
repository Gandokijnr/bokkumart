# BokkuMart (Bokku) — Project Overview

## 1) What this project is

BokkuMart is a full‑stack, multi-branch grocery commerce platform built with **Nuxt 4 (Vue 3)**. It provides:

- A customer storefront for browsing products, managing a cart, and completing checkout.
- An operations interface for staff/managers/admins (orders, inventory, dispatch, analytics).
- A driver interface for delivery workflows.

The backend is primarily **Supabase** (PostgreSQL + Auth + Storage), with server-side logic implemented as **Nuxt/Nitro API routes** under `server/api/**`.

The app is also a **Progressive Web App (PWA)** using `@vite-pwa/nuxt` with Workbox runtime caching.

---

## 2) Technology stack

- **Framework**: Nuxt `^4.3.x` (SSR enabled)
- **UI**: Vue `^3.5.x`
- **Styling**: TailwindCSS 4
- **State management**: Pinia `^3.x`
- **Backend services**: Supabase (DB/Auth/Storage)
- **PWA**: `@vite-pwa/nuxt`
- **Icons**: `@nuxt/icon`, `lucide-vue-next`
- **Charts**: `echarts` + `vue-echarts`
- **Payments**: Paystack
- **Push notifications**: VAPID keys (configured via runtime config)

---

## 3) High-level architecture

### Runtime layers

- **Client layer (Nuxt/Vue)**
  - SSR initial render, then client hydration.
  - Renders role-specific UI (customer/admin/driver) based on user profile role.
  - Stores key app state in Pinia (cart, branch, user, admin/driver state).

- **Server layer (Nitro)**
  - API endpoints under `server/api/**`.
  - Uses server-only secrets via `runtimeConfig`.
  - Orchestrates payment initialization/verification, order operations, admin queries, etc.

- **Data layer (Supabase)**
  - PostgreSQL holds tables like `profiles`, `stores`, `orders`, `store_inventory`, `carts`, `cart_items`.
  - Supabase Auth manages sessions, with role information read from `profiles` and/or JWT metadata.
  - Supabase Storage hosts public assets (notably product images) and is cached on the PWA layer.

### PWA layer

- `@vite-pwa/nuxt` generates/registers the service worker in production.
- Workbox runtime caching is configured for:
  - Supabase storage images (cache-first)
  - General image extensions (cache-first)
  - `/api/**` requests (network-first with short TTL)

---

## 4) Repository structure (what lives where)

### Root

- `nuxt.config.ts`: Nuxt + PWA + runtime config + Supabase config
- `public/`: static files (manifest, PWA icons, screenshot)
- `server/`: Nitro backend API routes
- `app/`: Nuxt application code (pages/components/stores/middleware)
- `scripts/`: DB helper scripts (run via `tsx`)
- `docs/`: existing documentation (`docs/PROJECT_DOCUMENTATION.md`)

### `app/`

- `app/pages/`: routes (customer, admin, driver)
- `app/layouts/`: global layout shells
- `app/components/`: reusable UI components
- `app/stores/`: Pinia stores (cart, branch selection, user/auth, admin, driver)
- `app/middleware/`: route protection + role gating
- `app/assets/css/`: global styling

### `server/`

- `server/api/`: REST-like endpoints grouped by domain:
  - `paystack/` (payments)
  - `orders/` (order workflows)
  - `admin/` (ops dashboards & management)
  - `driver/` (driver workflows)
  - `cart.get.ts` and related routes

---

## 5) App entry points & global behavior

### `app/app.vue`

This is the global wrapper that:

- Sets PWA/head metadata, including:
  - `viewport-fit=cover`
  - theme color `#0052CC`
  - manifest link (`/manifest.json`)
  - Apple PWA meta
- Shows global loading overlays during navigation.
- On client mount, loads cart from Supabase when a session is available.
- Attempts push notification subscription for logged-in users.

### `app/layouts/default.vue`

The default customer layout:

- Uses bottom padding on mobile (`pb-20`) to prevent the fixed mobile nav overlapping content.
- Renders `MobileBottomNav`.
- Hosts global UI overlays:
  - `GlobalSearch`
  - `CategoriesBottomSheet`

### `app/router.options.ts`

Defines global scroll behavior:

- Restores scroll position on browser back/forward.
- Smooth-scrolls to anchor links (`#hash`).
- Scrolls to the top for normal route navigations.

---

## 6) Roles & access model

A user’s role determines:
- Which routes they can access.
- Which navigation items are rendered.
- Which admin/driver pages they get redirected to after login.

Roles referenced in code (`app/stores/user.ts`):

- `customer`
- `staff`
- `branch_manager`
- `super_admin`
- `finance`
- `driver`

The `user` store computes an **effective role** (supports an impersonation-style "view as" feature for super admins).

Route protection is typically enforced via Nuxt middleware (global and/or route-specific).

---

## 7) Core customer flows

### A) Branch/store selection (multi-branch)

BokkuMart is multi-branch. The active branch affects:

- Product availability and inventory visibility.
- Cart locking (you cannot mix branches in one cart).

Primary store:
- `app/stores/useBranchStore.ts`

Key responsibilities:
- Fetches active branches from Supabase (`stores` table).
- Persists `activeBranch` in localStorage (client-side) for continuity.
- Provides getters such as `activeBranchName`, `isBranchOpen`, etc.

### B) Browsing products

Products are fetched via composables and/or pages (varies by page), typically filtering by active branch and `store_inventory` availability.

### C) Cart management

Primary store:
- `app/stores/useCartStore.ts`

Key rules:
- **Branch locking**: once the cart contains items, all additions must match the same `store_id`.
- **Stock validation**: add/update operations validate available stock and enforce max quantity.
- **Persistence**:
  - Uses client-side memory + optional DB persistence for logged-in users.
  - Supports “retention” logic (cart retention window) and pruning.

Cart computations:
- `cartCount`, `cartSubtotal`
- A bundled logistics/handling fee system to ensure platform revenue coverage.

### D) Checkout

Checkout pages live under `app/pages/checkout/**`.

Checkout typically:
- Validates cart stock.
- Collects delivery/pickup details.
- Initializes Paystack payment.
- Verifies payment and advances order state.

---

## 8) Order lifecycle (operations perspective)

Orders move through multiple states (see `docs/PROJECT_DOCUMENTATION.md` for the extended list). Common high-level progression:

- `pending` (created, awaiting payment)
- `paid` / `confirmed` (payment verified, ops verification)
- `assigned` (driver assigned for delivery)
- `picked_up` → `arrived` → `delivered` (driver updates)

Operational tooling for these workflows is exposed through:

- Admin pages under `app/pages/admin/**`
- Driver pages under `app/pages/driver/**`
- Nitro endpoints under `server/api/admin/**`, `server/api/orders/**`, `server/api/driver/**`

---

## 9) Payments (Paystack)

Payment routes live under:
- `server/api/paystack/**`

The common flow is:

1. Client calls an initialize endpoint (e.g. `/api/paystack/initialize`).
2. Server creates a Paystack transaction and returns authorization details.
3. Client completes Paystack checkout.
4. Client/server verifies payment (e.g. `/api/paystack/verify`).
5. Webhook (`/api/paystack/webhook`) can confirm async events.

Server-side code should be the only place where Paystack secret keys are used.

---

## 10) API surface (Nitro)

Your API routes are organized under `server/api/` by domain:

- `server/api/cart.get.ts` and related cart endpoints
- `server/api/orders/**`
- `server/api/paystack/**`
- `server/api/admin/**`
- `server/api/driver/**`
- `server/api/notifications/**`
- `server/api/branches/**`, `server/api/stores/**`

Most authenticated endpoints expect the client to be signed in via Supabase and may use Bearer tokens for server verification.

---

## 11) State management (Pinia stores)

Key stores to know:

- `app/stores/user.ts`
  - Holds Supabase user session + profile.
  - Determines role and role-based navigation.
  - Handles redirects after login.

- `app/stores/useCartStore.ts`
  - Cart items, branch locking, stock validation.
  - Computes totals and fees.
  - Saves/loads cart from the database.

- `app/stores/useBranchStore.ts`
  - Active branch selection.
  - Persists branch selection.

There are additional stores for admin/driver/platform revenue features.

---

## 12) PWA (manifest, icons, caching)

### PWA configuration

`nuxt.config.ts` includes:

- `pwa.disable: process.env.NODE_ENV === "development"`
  - PWA is disabled in dev by default.
- `registerType: "autoUpdate"`
- Workbox runtime caching rules for images and API calls.

### Manifest

Two manifest sources exist:

- `nuxt.config.ts` → `pwa.manifest` (generated manifest)
- `public/manifest.json` (static manifest served from public)

The app links to `/manifest.json` in `app/app.vue`, so the static manifest in `public/manifest.json` is authoritative at runtime unless you change that link.

### Icons

Brand icons live in `public/`:

- `pwa-64x64.png`
- `pwa-192x192.png`
- `pwa-512x512.png`
- `maskable-icon-512x512.png`
- `apple-touch-icon-180x180.png`

A source SVG also exists (`public/pwa-icon.svg`) and can be used to regenerate PNGs.

### Caching gotchas (important)

Installed PWA icons and cached assets are aggressively cached by browsers/OS.
If you update icons/manifest and don’t see changes:

- Uninstall the PWA
- Clear site data / unregister service worker
- Hard refresh
- Reinstall

---

## 13) Configuration & environment variables

Runtime config in `nuxt.config.ts` includes (non-exhaustive):

- Supabase:
  - `SUPABASE_URL`
  - `SUPABASE_KEY` (anon)
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)

- Paystack:
  - `PAYSTACK_SECRET_KEY` (server-only)
  - `PAYSTACK_PUBLIC_KEY` (public)

- Push notifications:
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`

- App branding:
  - `NUXT_PUBLIC_APP_NAME`
  - `NUXT_PUBLIC_APP_SHORT_NAME`
  - `NUXT_PUBLIC_APP_DESCRIPTION`
  - `NUXT_PUBLIC_THEME_COLOR` (defaults to `#0052CC`)
  - `NUXT_PUBLIC_BACKGROUND_COLOR`
  - `NUXT_PUBLIC_LOGO_URL`

---

## 14) Developer workflows

### Install dependencies

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Build for production

```bash
npm run build
npm run preview
```

### DB helper scripts

There are `tsx`-based scripts wired in `package.json`:

- `npm run db:tables`
- `npm run db:describe`
- `npm run db:query`
- `npm run db:sql`
- `npm run db:branch:new`

---

## 15) Troubleshooting

### A) App not loading / blank screen (especially after PWA changes)

Likely causes:
- Service worker caching an old build
- Browser cache stale

Fix:
- DevTools → Application → Service Workers → **Unregister**
- DevTools → Application → Storage → **Clear site data**
- Hard reload

### B) PWA icons not updating

Installed icons are cached by OS. Fix:
- Uninstall PWA
- Clear site data
- Reinstall

### C) Screenshot size warnings

If manifest screenshots are declared with a `sizes` field, it must match the actual image dimensions exactly.

---

## 16) Related docs

- `docs/PROJECT_DOCUMENTATION.md` (more detailed internal documentation)

---

## Summary

BokkuMart is a Nuxt 4 + Supabase grocery commerce platform with:

- Multi-branch store selection
- Cart and checkout with fee logic and stock validation
- Paystack payment integration via server endpoints
- Role-based admin + driver experiences
- PWA install support and caching
