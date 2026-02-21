# HomeAffairs Web App — Features & Functionality

## 1. High-level overview

HomeAffairs is a **multi-branch grocery commerce** web application built with **Nuxt 4 (Vue 3) SSR** and packaged as a **PWA**. It supports:

- Customer shopping (browse products, cart, checkout)
- Two fulfillment modes
  - Delivery (Lagos delivery zones + delivery fees)
  - Pickup (store branch pickup + arrival notification)
- Two payment modes
  - **Paystack online payments**
  - **Pay-on-delivery (POD)** with eligibility controls
- Back-office operations (order verification, processing, dispatch, inventory)
- Driver workflow (online/offline, assignment, delivery steps, PIN confirmation)

The app uses:

- **Supabase**
  - Authentication (PKCE)
  - Postgres database + Realtime subscriptions
  - Storage (product images)
- **Paystack**
  - Transaction initialize / verify
  - Webhook handling for `charge.success`


## 2. Technology & architecture

### 2.1 Frontend

- **Nuxt 4** with SSR enabled
- **Pinia** for state management
- **Tailwind CSS** for styling
- PWA via `@vite-pwa/nuxt`
  - Image caching for Supabase storage and local image formats
  - Network-first caching for `/api/*`

### 2.2 Backend

- Nuxt Nitro server endpoints under `server/api/*`
- Supabase service-role access on server endpoints (where needed)
- Bearer-token validation on protected API endpoints

### 2.3 Authentication & authorization

- Supabase auth with redirect options
  - Login: `/auth`
  - Callback: `/confirm`
  - Protected includes: `/checkout`, `/profile`
- Global middleware: `app/middleware/auth.global.ts`
  - Restores session on refresh
  - Enforces auth on protected routes
  - Applies role-based routing rules, especially for drivers


## 3. Roles & permissions

User roles are modeled in the app as:

- `customer`
- `staff`
- `branch_manager`
- `super_admin`
- `driver`

Role behavior is implemented primarily in:

- `app/stores/user.ts` (effective role, nav, redirects, impersonation)
- `app/middleware/auth.global.ts` and route-specific middleware

### 3.1 Customer

- Browse products/categories
- Add items to cart (branch-locked)
- Checkout (delivery or pickup)
- Pay online or POD (if eligible)
- Track orders and manage profile/addresses

### 3.2 Staff / Branch Manager / Super Admin (Admin/ERP)

- View and manage orders (kanban/table)
- Verify orders and move them through operational statuses
- Dispatch and manage drivers
- Manage inventory and product availability
- Super-admin user & staff management
- Operational analytics / KPIs

### 3.3 Driver

- Dedicated driver UI
- Online/offline availability
- Receive assignments through realtime updates
- Step-based workflow: assigned → picked_up → arrived → delivered
- Delivery confirmation via PIN (prepaid) or payment confirmation (POD)
- Basic offline action queueing (sync once online)


## 4. Core customer features

### 4.1 Landing / Home

- **Route**: `/` (`app/pages/index.vue`)
- Displays:
  - Hero section
  - Category grid
  - Product grid
  - Benefits/marketing section
- Loads store selection and fetches stores as needed

### 4.2 Product browsing

- **Category pages**: `/category/[slug]` (category browsing)
- **Product page**: `/product/*` is treated as public by middleware (pages may exist elsewhere)
- Product listing integrates store context and inventory availability (via `store_inventory`)

### 4.3 Cart

- **Route**: `/cart` (`app/pages/cart.vue`)
- Features:
  - Add/remove/update quantities
  - Cross-sell products
  - Server-side cart hydration (`/api/cart`)
  - Reservation timer display (based on cart store state)

Key cart constraints and behaviors (implemented in `app/stores/useCartStore.ts`):

- **Branch locking**
  - Cart can contain items from **only one store branch** at a time
- **Stock-aware quantity limits**
  - Item `max_quantity` and optional realtime stock checks
- **Cart persistence**
  - Saved to Supabase tables `carts` and `cart_items`
  - Cart retention logic (local retention window)

### 4.4 Checkout

- **Route**: `/checkout` (`app/pages/checkout/index.vue`)
- Step-based UI:
  - Step 1: Fulfillment selection
    - Delivery: Lagos area/zone selection with fee
    - Pickup: store selection (nearest/selected), pickup instructions
  - Step 2: Customer details
    - Name, phone, address, landmark
  - Step 3: Review & payment
    - Bill breakdown: subtotal, delivery fee, service fee
    - Discounts/incentives (example: online payment discount)
    - Payment method selection

Supporting checkout server logic:

- **Stock re-check before payment**
  - `POST /api/orders/validate-cart-stock`

### 4.5 Payment options

#### 4.5.1 Paystack (online payments)

- Initialize payment:
  - `POST /api/paystack/initialize`
- Verify payment:
  - `POST /api/paystack/verify`
- Webhook processing:
  - `POST /api/paystack/webhook`

Payment highlights:

- Paystack metadata carries order context (user/store/items, fulfillment details)
- Verification supports:
  - Rate limiting
  - Order ownership checks (Bearer token optional but supported)
  - Amount validation
  - Idempotent updates (doesn’t re-pay an already paid order)

Pickup-specific behavior on successful online payment:

- Generates a **pickup claim code** (6 characters)
- Stores QR payload in order metadata (for store collection verification)

#### 4.5.2 Pay on Delivery (POD)

- Create POD order:
  - `POST /api/orders/create-pod`

Eligibility controls include:

- Phone number must be present on profile (basic “phone verified” check)
- New account limitations for POD
- Cancellation-based restrictions (recent cancellations can disable POD)
- Pickup fulfillment cannot use POD (pickup requires upfront payment)

### 4.6 Order management (Customer)

Customer order experience is primarily surfaced through:

- **Profile**: `/profile` (`app/pages/profile.vue`)
  - Order overview + active orders
  - Order history
  - “Buy Again” (reorder)
  - Pickup: “I’ve arrived at the store” action

Customer-specific endpoints:

- Cancel order (customer only, with anti-abuse throttle):
  - `POST /api/orders/cancel`
- Pickup arrival notification:
  - `POST /api/orders/im-here`

Unpaid order expiry endpoints (system/automation oriented):

- Online payment timeout cancellation:
  - `POST /api/orders/expire-unpaid`
- Pickup online payment timeout cancellation:
  - `POST /api/orders/expire-unpaid-pickup`


## 5. Admin / back-office features

Admin pages live under `/admin/*` (layout `app/layouts/admin.vue`). Access is enforced by role middleware and user store checks.

### 5.1 Admin dashboards & navigation

The available navigation differs by role (see `app/stores/user.ts`). Examples include:

- Super Admin
  - Global dashboard, orders, dispatch, drivers, analytics, staff management, inventory settings, audit logs
- Branch Manager
  - Branch dashboard, store orders, dispatch, drivers, branch inventory, sales, activity logs
- Staff
  - Dashboard, verification queue, orders, dispatch, inventory

### 5.2 Order operations (ERP)

- **Route**: `/admin/orders` (`app/pages/admin/orders.vue`)
- Supports:
  - Kanban and table views
  - Search by order id/customer/phone
  - Store filter + payment filter
  - Guided step actions based on fulfillment mode

Order workflow (as implemented in admin UI):

- Delivery:
  - `pending` → `confirmed` → `assigned` → `picked_up` → `arrived` → `delivered`
- Pickup:
  - `pending` → `confirmed` → `picked_up` → `arrived` → `delivered`

Pickup collection verification:

- Admin UI shows a “Verify Customer Collection” flow
  - QR scan (BarcodeDetector) or manual code entry
  - Calls `/api/admin/verify-collection` (referenced in UI; endpoint file not currently present under `server/api/admin` based on repository scan)

Admin API used for order status changes:

- `PATCH /api/admin/update-order-status`
  - Also includes **stock finalization** when transitioning to `delivered`

### 5.3 Dispatch operations

- **Route**: `/admin/dispatch` (`app/pages/admin/dispatch.vue`)
- Purpose:
  - Assign “ready” orders to available drivers
  - Highlight expired assignments for reassignment

Dispatch backend is implemented via Supabase RPCs:

- `dispatch_assign_orders(p_order_ids, p_driver_id)`
- `dispatch_release_order(p_order_id)`

Realtime refresh:

- Subscribes to `orders` and `profiles` changes to refresh lists

### 5.4 Inventory management

- **Route**: `/admin/inventory` (`app/pages/admin/inventory.vue`)
- Features:
  - Inventory listing across stores
  - Search/filter by store and stock status
  - Quick stock updates
  - Manual product + inventory entry (with optional image upload to Supabase storage)
  - CSV upload to bulk update inventory

Admin inventory APIs:

- `PATCH /api/admin/update-store-inventory`
  - Restricted to `super_admin` and `branch_manager` (with store scoping)
- `POST /api/admin/manual-inventory`
  - Create/update product and inventory rows (used by admin UI)
- (UI references) `POST /api/admin/upload-inventory`
  - Referenced from inventory UI; endpoint file not shown in `server/api/admin` list

### 5.5 Staff / user management (Super Admin)

Super admin APIs:

- `POST /api/admin/create-user`
  - Creates Supabase auth user
  - Sets role in `app_metadata`
  - Upserts profile row
- `PATCH /api/admin/update-user`
  - Updates profile
  - Also updates Supabase auth user `app_metadata.role`

### 5.6 Analytics / operational KPIs

- `GET /api/admin/operational-kpis`
  - Computes KPI snapshot for the last 7 days
  - Can scope to a store (non-super-admin)
  - Metrics include:
    - Orders today
    - Orders/day
    - Average order value
    - Fulfillment time
    - Cancellation rate
    - Stock mismatch rate (derived from rejection interactions)

Other admin automation endpoint:

- `POST /api/admin/backfill-delivered-stock`
  - Backfills/repairs stock updates for delivered orders


## 6. Driver features

### 6.1 Driver routes

- `/driver/dashboard` (primary driver experience)
- `/driver/*` routes are protected by driver middleware and guarded by `auth.global.ts`

### 6.2 Driver workflow

Driver state is managed by `app/stores/driver.ts`:

- Availability toggle: `offline` ↔ `available` (blocked while on delivery)
- Active order detection:
  - Orders with `driver_id = current driver` and status in `assigned`, `picked_up`, `arrived`
- Step actions:
  - `assigned` → confirm pickup
  - `picked_up` → mark arrived
  - `arrived` → confirm completion
    - Prepaid: enter customer PIN (RPC `verify_delivery_pin`)
    - POD: confirm payment + close order (same completion mechanism in UI)

Driver realtime:

- Subscribes to Postgres changes on `orders` filtered by `driver_id`
- Shows toast when order status becomes `assigned`

Driver offline support:

- Queues actions when offline
- Syncs queued actions when back online


## 7. Data model (key entities)

This summary is based on usage in stores, pages, and API handlers:

- **profiles**
  - `id`, `full_name`, `phone_number`, `role`, `store_id`, `managed_store_ids`, `driver_status`, etc.
- **stores**
  - Branch/store definition (name, code, active flag)
- **products**
  - Catalog items (name, price, image_url, category_id, etc.)
- **store_inventory**
  - Inventory per store
  - `stock_level`, `reserved_stock`, `available_stock`, `digital_buffer`, `is_visible`, `store_price`
- **carts** and **cart_items**
  - Persistent customer cart
- **orders**
  - Items, totals, status, fulfillment details
  - Driver assignment fields (e.g. `driver_id`, timestamps)
  - Payment fields (`paystack_reference`, `paystack_transaction_id`, `paid_at`)
  - Pickup claim PIN + QR data in metadata for pickup collection
- **order_interactions**
  - Verification logs, rejections, audit trail for operations


## 8. Public & protected routes (page inventory)

### 8.1 Customer-facing routes

- `/` (home)
- `/auth` + `/auth/reset-password`
- `/cart`
- `/checkout` + `/checkout/verify` + `/checkout/success` + `/checkout/pod-confirmation`
- `/profile`
- `/order/pending-[id]`
- `/category/[slug]`
- `/confirm`
- `/pending-approval`
- `/forbidden`

### 8.2 Admin routes

Examples from `app/pages/admin/*`:

- `/admin` (index)
- `/admin/dashboard`
- `/admin/global-dashboard`
- `/admin/branch-dashboard`
- `/admin/orders`
- `/admin/dispatch`
- `/admin/drivers`
- `/admin/inventory`
- `/admin/branch-inventory`
- `/admin/verification-queue`
- `/admin/staff-management`
- `/admin/settings`

### 8.3 Driver routes

- `/driver` (index)
- `/driver/dashboard`


## 9. Server API inventory

### 9.1 Cart

- `GET /api/cart`
  - Returns the authenticated user’s persisted cart and cart items

### 9.2 Orders

- `POST /api/orders/validate-cart-stock`
- `POST /api/orders/create-pod`
- `POST /api/orders/cancel`
- `POST /api/orders/im-here` (pickup arrival)
- `POST /api/orders/expire-unpaid`
- `POST /api/orders/expire-unpaid-pickup`

### 9.3 Paystack

- `POST /api/paystack/initialize`
- `POST /api/paystack/verify`
- `POST /api/paystack/webhook`

### 9.4 Admin

- `PATCH /api/admin/update-order-status`
- `PATCH /api/admin/update-store-inventory`
- `POST /api/admin/manual-inventory`
- `POST /api/admin/create-user`
- `PATCH /api/admin/update-user`
- `GET /api/admin/operational-kpis`
- `POST /api/admin/backfill-delivered-stock`

### 9.5 Stores

- `GET /api/stores`
  - Fetches active stores/branches


## 10. Notable operational rules & safeguards

- **Role-based route guards**
  - Drivers are blocked from `/admin` and shopping routes and redirected to `/driver/dashboard`
- **Admin session timeout**
  - Admin/staff timeout is shorter than customer sessions (implemented in user store)
- **Stock integrity**
  - Cart-level validation endpoint exists
  - Admin delivered-status transition finalizes and reduces stock
  - Payment expiry endpoints release reserved stock best-effort
- **Anti-abuse controls**
  - POD eligibility restrictions
  - Cancellation limit before blocking further cancellations
  - Basic rate limiting on Paystack verification endpoint


## 11. How to read this document

- If you need “what does the customer see?”, focus on sections 4 and 8.1
- If you need “what do staff do daily?”, focus on sections 5.2–5.4
- If you need “how do drivers deliver?”, focus on section 6
- If you need “what API exists?”, focus on section 9
