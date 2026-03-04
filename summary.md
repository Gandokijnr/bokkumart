# HomeAffairs App — Comprehensive Overview

## 1) What this app is

HomeAffairs is a **multi-branch grocery commerce** web application built with **Nuxt 4 (Vue 3) with SSR** and packaged as a **PWA**.

It supports three primary “surfaces” (user experiences):

- **Customer storefront**
  - Browse categories and products
  - Select a branch/store
  - Add items to a branch-locked cart
  - Checkout with delivery or pickup
  - Pay online (Paystack) or Pay-on-Delivery (POD, eligibility-controlled)
  - Track orders and manage profile/addresses
- **Admin/Back-office (ERP)**
  - Manage orders through operational statuses
  - Verify/confirm orders, dispatch drivers
  - Manage inventory and product availability
  - Analytics/KPIs and staff management (role-dependent)
- **Driver workflow**
  - Online/offline availability
  - Receive assignments via realtime updates
  - Step-based delivery flow
  - Delivery confirmation via PIN (prepaid) or payment confirmation (POD)


## 2) Technology & architecture

### 2.1 Frontend (Nuxt 4)

- **Nuxt 4** SSR
- **Vue 3** components & Composition API
- **Pinia** stores for client-side state
- **Tailwind CSS** for UI
- **PWA** via `@vite-pwa/nuxt`
  - Image caching for Supabase storage and local images
  - Network-first caching for `/api/*`

Key app folders:

- `app/pages/*` — route pages (customer, admin, driver)
- `app/components/*` — shared UI components
- `app/stores/*` — Pinia stores (cart, user, admin, driver, etc.)
- `app/middleware/*` — route guards / session restoration

### 2.2 Backend (Nuxt Nitro)

- Server endpoints live under `server/api/*`
- Uses **Supabase**:
  - Auth + profiles
  - Postgres data
  - Realtime subscriptions (client)
  - Storage for product images
- Uses **Paystack** for online payments


## 3) Authentication, authorization, and routing

### 3.1 Supabase auth

Authentication is handled via Supabase. Protected routes require a valid session.

- **Login route**: `/auth`
- **Protected pages (examples)**: `/checkout`, `/profile`, admin and driver surfaces

### 3.2 Global auth middleware

The primary route guard is:

- `app/middleware/auth.global.ts`

Important behaviors:

- **Public routes** include `/` and `/auth` (and product pages by prefix).
- On the client, the middleware **restores the session from Supabase** on refresh by calling `supabase.auth.getSession()` if the Pinia store hasn’t hydrated yet.
- If a route is protected and there is no session, the user is redirected to:
  - `/auth?redirect=<original>&reason=auth_required`

### 3.3 Role-based access control

Users have roles including:

- `customer`
- `staff`
- `branch_manager`
- `super_admin`
- `driver`

Role logic and navigation is primarily implemented in:

- `app/stores/user.ts`
- `app/middleware/auth.global.ts`

Driver-specific hard guard:

- Drivers are prevented from accessing `/admin` (and other restricted areas) and redirected to `/driver/dashboard`.


## 4) Core customer journey (end-to-end)

### 4.1 Store selection / branch context

The storefront is **branch-aware**. A customer typically selects a branch and then sees products filtered by store availability.

Branch context impacts:

- Inventory availability
- Cart locking rules
- Checkout fulfillment and payment eligibility

### 4.2 Browsing

Customer entry points:

- `/` (home)
  - Hero section
  - Category grid
  - Product grid
  - Benefits/marketing
- `/category/[slug]`
  - Category-based product listing

Products integrate store inventory context (commonly via `store_inventory`).

### 4.3 Cart

Cart route:

- `/cart` (`app/pages/cart.vue`)

Cart behavior is largely driven by:

- `app/stores/useCartStore.ts`

Key constraints and features:

- **Branch locking**
  - The cart can contain items from **only one store branch** at a time.
- **Stock-aware limits**
  - Items include `max_quantity` and buffer controls.
- **Persistence**
  - Cart persists to Supabase (`carts`, `cart_items`).
- **Retention window**
  - Local retention key `ha_cart_retention_until` with a 48-hour retention window.
- **Server hydration**
  - `GET /api/cart` returns the authenticated user’s cart.

### 4.4 Checkout

Checkout route:

- `/checkout` (`app/pages/checkout/index.vue`)

The UI is step-based:

- **Step 1: Fulfillment selection**
  - Delivery: select Lagos zone/area and fee
  - Pickup: select store branch (often nearest/selected)
- **Step 2: Customer details**
  - Name, phone, address, landmark
- **Step 3: Review & payment**
  - Bill breakdown: subtotal, delivery fee, service fee
  - Payment method selection

Before payment, the system supports a stock re-check endpoint:

- `POST /api/orders/validate-cart-stock`


## 5) Payments

The app supports two payment modes:

- **Online payments (Paystack)**
- **Pay-on-Delivery (POD)** with eligibility checks

### 5.1 Paystack online payments

Server endpoints:

- `POST /api/paystack/initialize`
- `POST /api/paystack/verify`
- `POST /api/paystack/webhook`

#### 5.1.1 Initialize

- `server/api/paystack/initialize.post.ts`

Key behaviors:

- Validates request payload and amount.
- Loads store configuration from `stores`:
  - `paystack_subaccount_code`
  - `platform_percentage`
  - `fixed_commission`
- Enforces **store must be configured** for online payments.
- Computes `transaction_charge` (platform fee) and sets Paystack split fields:
  - `subaccount`
  - `bearer: "account"`
  - `transaction_charge`
- Returns Paystack `authorization_url` + `reference`.

#### 5.1.2 Verify

- `server/api/paystack/verify.post.ts`

Key behaviors:

- Rate-limits by IP and by reference (in-memory map).
- Optionally verifies ownership via Bearer token.
- Validates:
  - Reference matches
  - Currency is NGN
  - Transaction metadata matches order (user_id/order_id)
  - Amount matches order total
  - Idempotency (won’t re-process an already paid/confirmed order)
- Pickup behavior:
  - Generates a 6-char **pickup claim code** when delivery method is `pickup`.

#### 5.1.3 Webhook

- `server/api/paystack/webhook.post.ts`

Key behaviors:

- Validates `x-paystack-signature` using HMAC SHA-512.
- Only processes `charge.success`.
- Idempotent update:
  - If order already `confirmed`/`paid`, returns without re-processing.
- Updates/inserts order with payment fields:
  - `paystack_reference`
  - `paystack_transaction_id`
  - `paid_at`
  - `status: "confirmed"`
- Pickup behavior:
  - Generates or reuses claim code
  - Stores a QR payload in metadata for pickup collection verification

### 5.2 Pay-on-Delivery (POD)

Server endpoint:

- `POST /api/orders/create-pod` (`server/api/orders/create-pod.post.ts`)

Key eligibility rules enforced:

- POD is **not allowed for pickup** (pickup requires upfront payment).
- Caller must provide a valid Bearer token.
- Profile must have a phone number (basic “phone verified” requirement).
- New account restrictions:
  - New users (created within 7 days) are limited in POD usage.
- Anti-abuse:
  - Repeated cancellations can disable POD.

Order is created with:

- `status: "pending"`
- `payment_method: "pod"`
- Metadata includes fraud control fields.


## 6) Fulfillment modes

### 6.1 Delivery

Delivery is implemented as a zone-based model (Lagos delivery zones + fees).

Order workflow (common):

- `pending` → `confirmed` → `assigned` → `picked_up` → `arrived` → `delivered`

### 6.2 Pickup

Pickup orders are typically prepaid (online payment required).

Pickup workflow (common):

- `pending` → `confirmed` → `picked_up` → `arrived` → `delivered`

Pickup collection verification:

- Claim code (6 chars) and QR payload stored in order metadata for store-side verification flows.


## 7) Customer order management

Primary customer surface:

- `/profile` (`app/pages/profile.vue`)

Typical customer capabilities:

- View active orders
- View order history
- Reorder (“buy again”)
- Pickup: “I’ve arrived at the store” action

Customer-facing endpoints (as documented):

- `POST /api/orders/cancel`
- `POST /api/orders/im-here`
- `POST /api/orders/expire-unpaid`
- `POST /api/orders/expire-unpaid-pickup`


## 8) Admin / back-office operations

Admin pages are under:

- `/admin/*` (layout: `app/layouts/admin.vue`)

The visible navigation and access depend on role.

### 8.1 Orders operations

- Route: `/admin/orders`
- Supports kanban/table views, search, store filters, payment filters.

Admin API used for status updates:

- `PATCH /api/admin/update-order-status` (`server/api/admin/update-order-status.patch.ts`)

Key behaviors:

- Requires Bearer token.
- Validates caller role (allowed roles include: `admin`, `super_admin`, `branch_manager`, `staff`, etc.).
- Updates order status.
- On transition to `delivered`, the endpoint **finalizes stock** (best-effort):
  - Decrements `store_inventory.stock_level`
  - Decrements `store_inventory.reserved_stock`
  - Recomputes `available_stock`
  - Updates visibility based on remaining stock

### 8.2 Dispatch

- Route: `/admin/dispatch`
- Assigns ready orders to available drivers.
- Backend relies on Supabase RPCs:
  - `dispatch_assign_orders(p_order_ids, p_driver_id)`
  - `dispatch_release_order(p_order_id)`

### 8.3 Inventory

- Route: `/admin/inventory`
- APIs:
  - `PATCH /api/admin/update-store-inventory`
  - `POST /api/admin/manual-inventory`

### 8.4 Staff management & KPIs

Super admin APIs include:

- `POST /api/admin/create-user`
- `PATCH /api/admin/update-user`
- `GET /api/admin/operational-kpis`
- `POST /api/admin/backfill-delivered-stock`


## 9) Driver workflow

Driver routes:

- `/driver/dashboard` (primary driver UI)

Driver state is managed by:

- `app/stores/driver.ts`

Key driver behaviors:

- Availability toggle: offline ↔ available (blocked while on delivery)
- Active order detection:
  - Orders where `driver_id` is the driver and status in `assigned`, `picked_up`, `arrived`
- Step-based actions:
  - `assigned` → confirm pickup
  - `picked_up` → mark arrived
  - `arrived` → confirm completion
    - Prepaid: enter customer PIN (RPC `verify_delivery_pin`)
    - POD: confirm payment + close order
- Realtime:
  - Subscribes to `orders` changes filtered by `driver_id`
  - Shows notifications when assigned
- Offline:
  - Queues actions and syncs when back online


## 10) Data model (conceptual)

Based on usage across pages/stores/endpoints:

- `profiles`
  - Identity, role, phone number, store/management fields, driver status
- `stores`
  - Branch configuration, Paystack subaccount settings, commission settings
- `products`
  - Catalog items
- `store_inventory`
  - Store-scoped stock, reserved stock, visibility, pricing
- `carts`, `cart_items`
  - Persisted cart model
- `orders`
  - Items, totals, fulfillment details, payment fields, driver assignment, metadata
- `order_interactions`
  - Operational logs/audit trail


## 11) Server API inventory (quick reference)

- **Cart**
  - `GET /api/cart`
- **Orders**
  - `POST /api/orders/validate-cart-stock`
  - `POST /api/orders/create-pod`
  - `POST /api/orders/cancel`
  - `POST /api/orders/im-here`
  - `POST /api/orders/expire-unpaid`
  - `POST /api/orders/expire-unpaid-pickup`
- **Paystack**
  - `POST /api/paystack/initialize`
  - `POST /api/paystack/verify`
  - `POST /api/paystack/webhook`
- **Admin**
  - `PATCH /api/admin/update-order-status`
  - `PATCH /api/admin/update-store-inventory`
  - `POST /api/admin/manual-inventory`
  - `POST /api/admin/create-user`
  - `PATCH /api/admin/update-user`
  - `GET /api/admin/operational-kpis`
  - `POST /api/admin/backfill-delivered-stock`
- **Stores**
  - `GET /api/stores`


## 12) Operational rules & safeguards (high impact)

- **Session restoration on refresh** avoids false redirects (`auth.global.ts`).
- **Driver hard guard** prevents role confusion and accidental access to admin/shop.
- **Stock integrity**
  - Stock validation endpoint exists prior to payment.
  - Delivered transition triggers stock finalization.
- **Paystack safeguards**
  - Rate limiting on verify endpoint.
  - Idempotent confirmation.
  - Amount + metadata validation.
- **POD anti-abuse**
  - Phone requirement, new-user restrictions, cancellation-based restrictions.
