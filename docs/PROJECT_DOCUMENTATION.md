# HomeAffairs Store App - Project Documentation

## Overview

HomeAffairs is a full-stack e-commerce grocery delivery platform built with **Nuxt.js 4**, **Vue 3**, **Supabase**, and **Tailwind CSS**. The application supports multiple user roles (customers, drivers, staff, branch managers, super admins) with a sophisticated order management system, real-time inventory tracking, and integrated payment processing via Paystack.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Core Features](#core-features)
6. [Data Flow](#data-flow)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [State Management](#state-management)
10. [Authentication & Authorization](#authentication--authorization)
11. [Payment System](#payment-system)
12. [Deployment](#deployment)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | Nuxt.js 4.3.0 (Vue 3.5.27) |
| **Styling** | Tailwind CSS 4.1.18 |
| **Backend/Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (PKCE flow) |
| **State Management** | Pinia 3.0.4 |
| **Payment Gateway** | Paystack |
| **PWA** | @vite-pwa/nuxt |
| **Icons** | Lucide Vue Next, Nuxt Icon |
| **Charts** | ECharts 6.0.0 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Nuxt.js   │  │  Vue 3 App  │  │   PWA (Offline)     │  │
│  │   (SSR/SPA) │  │  Components │  │   Service Worker    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Auth Guard │  │  Role Gate  │  │   Branch Scope      │  │
│  │  (Global)   │  │  (Global)   │  │   (Admin Routes)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Layer (Nitro)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  API Routes │  │  Server     │  │   External APIs   │  │
│  │  (/api/*)   │  │  Middleware │  │   (Paystack)        │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
└─────────┼─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Supabase)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL │  │  Auth       │  │   Storage (Images)  │  │
│  │  Database   │  │  Service    │  │   Realtime          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
c:\Users\Gandoki\Desktop\store/
├── app/                          # Main application code
│   ├── components/               # Vue components (44 items)
│   │   ├── admin/               # Admin dashboard components
│   │   ├── driver/              # Driver app components
│   │   ├── ui/                  # Reusable UI components
│   │   └── ...
│   ├── composables/             # Vue composables (19 items)
│   │   ├── useProducts.ts       # Product fetching & management
│   │   ├── useCartStore.ts      # Cart operations
│   │   ├── useUserOrders.ts     # Order management
│   │   └── ...
│   ├── layouts/                 # Nuxt layouts
│   │   ├── default.vue          # Customer layout
│   │   └── admin.vue            # Admin layout
│   ├── middleware/              # Route middleware
│   │   ├── auth.global.ts       # Global auth guard
│   │   ├── role-gate.global.ts  # Role-based redirects
│   │   ├── admin.ts             # Admin access control
│   │   └── ...
│   ├── pages/                   # Application pages
│   │   ├── index.vue            # Homepage
│   │   ├── auth.vue             # Authentication
│   │   ├── cart.vue             # Shopping cart
│   │   ├── checkout/            # Checkout flow
│   │   ├── admin/               # Admin pages (16 items)
│   │   ├── driver/              # Driver pages (6 items)
│   │   └── profile.vue          # User profile
│   ├── plugins/                 # Nuxt plugins
│   ├── server/                  # Server-side code
│   │   └── api/                 # API routes
│   ├── stores/                  # Pinia stores
│   │   ├── user.ts              # User/auth state
│   │   ├── useCartStore.ts      # Cart state
│   │   ├── useBranchStore.ts    # Branch/location state
│   │   └── ...
│   ├── types/                   # TypeScript types
│   │   └── database.types.ts    # Supabase DB types
│   └── utils/                   # Utility functions
├── docs/                        # Documentation
├── public/                      # Static assets
├── scripts/                     # Database scripts
├── server/                      # Server API routes
│   └── api/
│       ├── admin/              # Admin APIs (29 items)
│       ├── orders/             # Order APIs (11 items)
│       ├── paystack/           # Payment APIs (5 items)
│       └── ...
├── supabase/                    # Supabase migrations
└── nuxt.config.ts              # Nuxt configuration
```

---

## User Roles & Permissions

### Role Hierarchy

| Role | Access Level | Key Capabilities |
|------|--------------|------------------|
| **Super Admin** | Global | All branches, staff management, global dashboard, analytics |
| **Branch Manager** | Branch-specific | Single branch orders, inventory, drivers, sales reports |
| **Staff** | Branch-specific | Verification queue, picking, dispatch, inventory |
| **Finance** | Limited | Platform revenue reports only |
| **Driver** | Mobile App | Deliveries, routes, earnings |
| **Customer** | Shop Only | Browse, cart, orders, profile |

### Navigation by Role

**Super Admin:**
- Global Dashboard
- All Orders
- Dispatch
- Drivers
- Branch Performance
- Staff Management
- Inventory Settings
- Audit Logs

**Branch Manager:**
- My Dashboard
- My Store Orders
- Picking Dashboard
- Dispatch
- Drivers
- Manage Inventory
- Daily Sales Report
- Store Analytics

**Staff:**
- Dashboard
- Verification Queue
- Picking Dashboard
- Orders
- Dispatch
- Inventory

**Driver:**
- Driver Dashboard
- My Deliveries
- Route Map
- Completed Tasks
- SOS/Support

---

## Core Features

### 1. Multi-Branch Store System

**Branch Selection Flow:**
1. Customer visits homepage (`/`)
2. Branch selector modal appears (if not previously selected)
3. Customer selects nearby HomeAffairs branch
4. Products are filtered to show only items available at selected branch
5. Cart is locked to the selected branch (cannot mix branches in one order)

**Key Implementation:**
- `@/app/stores/useBranchStore.ts` - Manages active branch state
- `@/app/composables/useStoreLocator.ts` - Geolocation-based branch finding
- Branch data persists in localStorage for session continuity

### 2. Shopping Cart System

**Features:**
- Real-time stock validation before adding items
- Branch-locking (prevents mixing products from different branches)
- Cart persistence to Supabase for logged-in users
- 48-hour cart retention
- Digital buffer for inventory management

**Cart State:**
```typescript
interface CartState {
  items: CartItem[];           // Cart line items
  currentStoreId: string | null;
  currentStoreName: string;
  deliveryDetails: DeliveryDetails | null;
  reservedItems: ReservedItem[];  // Stock reservations
  reservationExpiry: number | null;
}
```

### 3. Order Lifecycle

```
Customer Journey:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Cart   │───▶│ Checkout│───▶│ Payment │───▶│ Confirm │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                     │
                         ┌──────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │   Order Processing    │
              ├─────────────────────┤
              │ • Pending           │
              │ • Processing        │
              │ • Paid              │
              │ • Confirmed         │
              │ • Assigned (driver) │
              │ • Picked Up         │
              │ • Arrived           │
              │ • Delivered         │
              └─────────────────────┘
```

**Order Statuses:**
- `pending` - Order created, awaiting payment
- `processing` - Payment received, preparing
- `paid` - Payment confirmed
- `confirmed` - Order verified by staff
- `ready_for_pos` - Ready for point-of-sale processing
- `completed_in_pos` - POS processing complete
- `assigned` - Driver assigned
- `picked_up` - Driver collected order
- `arrived` - Driver at delivery location
- `delivered` - Order delivered
- `cancelled` / `refunded` - Terminal states

### 4. Delivery System

**Delivery Zones & Pricing:**
| Zone | Delivery Fee |
|------|--------------|
| Ikoyi/VI | ₦1,500 |
| Lekki Phase 1 | ₦1,500 |
| Lekki Phase 2 | ₦2,000 |
| Ajah | ₦2,500 |
| Yaba/Surulere | ₦1,200 |
| Ikeja | ₦1,500 |
| Gbagada/Ogudu/Maryland | ₦1,200 |
| Mainland | ₦1,200 |
| Island | ₦1,800 |

**Delivery Methods:**
1. **Home Delivery** - To customer's address with real-time driver tracking
2. **Pickup** - Customer collects from store (4-digit claim code)

### 5. Real-Time Inventory

**Stock Management:**
- Per-branch inventory tracking via `store_inventory` table
- Digital buffer prevents overselling
- Real-time stock updates via Supabase subscriptions
- Stock reservations during checkout (10-minute hold)

**Key Composable:**
- `@/app/composables/useProducts.ts` - Fetches products with branch filtering
- `@/app/composables/useStoreInventory.ts` - Inventory management

---

## Data Flow

### Customer Purchase Flow

```
1. BROWSE
   Customer visits homepage
   └──▶ useBranchStore loads branches
   └──▶ Branch selector (if needed)
   └──▶ useProducts fetches products for selected branch

2. ADD TO CART
   Customer clicks "Add to Cart"
   └──▶ useCartStore.addItem()
   └──▶ Real-time stock check
   └──▶ Branch locking validation
   └──▶ Cart saved to localStorage + Supabase

3. CHECKOUT
   Customer proceeds to /checkout
   └──▶ Step 1: Select delivery/pickup
   └──▶ Step 2: Enter delivery details
   └──▶ Step 3: Payment selection

4. PAYMENT
   Customer clicks "Pay Now"
   └──▶ POST /api/paystack/initialize
   └──▶ Stock reservation (10 min)
   └──▶ Redirect to Paystack
   └──▶ Payment completion
   └──▶ Webhook: /api/paystack/webhook
   └──▶ Order status: paid → confirmed

5. FULFILLMENT
   Staff sees order in dashboard
   └──▶ Verification queue
   └──▶ Picking dashboard
   └──▶ Driver assignment (for delivery)
   └──▶ Driver updates: picked_up → arrived → delivered

6. COMPLETION
   Customer receives order
   └──▶ Delivery PIN verification (for delivery)
   └──▶ Claim code verification (for pickup)
   └──▶ Order status: delivered
```

### Authentication Flow

```
1. USER VISITS /auth
   └──▶ Supabase Auth (PKCE flow)
   └──▶ Email/password or OTP
   └──▶ Token stored in cookies

2. GLOBAL MIDDLEWARE (auth.global.ts)
   └──▶ Checks Supabase session
   └──▶ Restores userStore from session
   └──▶ Fetches user profile from 'profiles' table
   └──▶ Determines effective role

3. ROLE-GATE MIDDLEWARE (role-gate.global.ts)
   └──▶ On route '/', redirects based on role:
       - super_admin → /admin/global-dashboard
       - branch_manager → /admin/branch-dashboard
       - staff → /admin/dashboard
       - driver → /driver/dashboard
       - customer → / (homepage)

4. ADMIN MIDDLEWARE (admin.ts)
   └──▶ Checks admin access permission
   └──▶ Redirects to appropriate dashboard if unauthorized
```

---

## Database Schema

### Core Tables

**profiles**
```sql
- id (uuid, PK)
- full_name (text)
- phone_number (text)
- role (enum: customer|staff|admin|manager|super_admin|branch_manager|finance|driver)
- store_id (uuid, FK to stores)
- managed_store_ids (uuid[])
- driver_status (enum: offline|available|on_delivery)
- referral_code (text)
- loyalty_points (int)
- default_address (jsonb)
```

**stores**
```sql
- id (uuid, PK)
- name (text)
- address (text)
- city (text)
- state (text)
- phone (text)
- latitude (float)
- longitude (float)
- is_active (boolean)
- operating_hours (jsonb)
- paystack_subaccount_code (text)
```

**products**
```sql
- id (uuid, PK)
- name (text)
- description (text)
- category_id (uuid, FK)
- base_price (numeric)
- unit (text)
- sku (text)
- barcode (text)
- is_active (boolean)
```

**store_inventory**
```sql
- id (uuid, PK)
- store_id (uuid, FK to stores)
- product_id (uuid, FK to products)
- stock_level (int)
- available_stock (int)
- digital_buffer (int)
- is_visible (boolean)
```

**orders**
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- store_id (uuid, FK to stores)
- items (jsonb)  -- Array of order items
- subtotal (numeric)
- delivery_fee (numeric)
- total_amount (numeric)
- status (enum: pending|processing|paid|confirmed|...|delivered)
- delivery_method (enum: pickup|delivery)
- delivery_details (jsonb)
- driver_id (uuid, FK to profiles)
- paystack_reference (text)
- paystack_transaction_id (text)
- payment_split_log (jsonb)
- confirmation_code (text)  -- 4-digit pickup code
- created_at (timestamp)
```

**carts / cart_items**
```sql
- carts: user_id, store_id, delivery_method, delivery_address, contact_phone
- cart_items: cart_id, product_id, store_id, name, price, quantity, options
```

---

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/session` | GET | Get current session |
| `/api/auth/refresh` | POST | Refresh access token |

### Orders
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders/[id]` | GET | Get order details |
| `/api/orders/create-pod` | POST | Create pay-on-delivery order (disabled) |
| `/api/orders/cancel` | POST | Cancel order |
| `/api/orders/reorder` | POST | Reorder previous order |
| `/api/orders/validate-cart-stock` | POST | Validate cart stock levels |
| `/api/orders/verify-delivery-pin` | POST | Verify delivery PIN |

### Paystack Payments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/paystack/initialize` | POST | Initialize payment transaction |
| `/api/paystack/verify` | POST | Verify payment status |
| `/api/paystack/webhook` | POST | Paystack webhook handler |
| `/api/paystack/resolve-account` | POST | Resolve bank account |
| `/api/paystack/status` | POST | Check transaction status |

### Admin APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/dashboard` | GET | Dashboard analytics |
| `/api/admin/orders` | GET | List orders (filtered by role) |
| `/api/admin/drivers` | GET/POST | Driver management |
| `/api/admin/inventory` | GET/POST | Inventory management |
| `/api/admin/staff` | GET/POST | Staff management |

### Driver APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/driver/deliveries` | GET | Get assigned deliveries |
| `/api/driver/update-status` | POST | Update delivery status |
| `/api/driver/earnings` | GET | Get earnings summary |

### Cart API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cart` | GET/POST | Get or save cart |

---

## State Management

### Pinia Stores

**user.ts** - User authentication & role management
```typescript
// Key state
user: User | null           // Supabase user
profile: UserProfile | null  // Extended profile from 'profiles' table
effectiveRole: UserRole     // Computed effective role
managedStores: Store[]      // For branch managers

// Key actions
initialize()                // Setup auth listeners
fetchProfile()              // Load user profile
handleRedirectAfterLogin()  // Role-based redirect
canAccess(route)            // Route permission check
```

**useCartStore.ts** - Shopping cart management
```typescript
// Key state
items: CartItem[]
currentStoreId: string | null
deliveryDetails: DeliveryDetails | null
reservedItems: ReservedItem[]

// Key actions
addItem(product, quantity)  // Add with stock validation
saveToDatabase(supabase)    // Persist to Supabase
loadFromDatabase(supabase)  // Restore from Supabase
createReservation(supabase) // Reserve stock for 10 min
```

**useBranchStore.ts** - Branch/location management
```typescript
// Key state
activeBranch: Branch | null
branches: Branch[]

// Key actions
fetchBranches(supabase)     // Load all active branches
switchBranch(branchId)      // Change active branch
loadFromLocalStorage()      // Restore selection
```

---

## Authentication & Authorization

### Middleware Chain

1. **auth.global.ts** (Global)
   - Runs on every route change
   - Restores session from Supabase on refresh
   - Enforces phone number onboarding for customers
   - Blocks drivers from admin/customer routes
   - Redirects unauthenticated users to /auth

2. **role-gate.global.ts** (Global)
   - On root path `/`, redirects to role-appropriate dashboard
   - Prevents staff from seeing customer homepage

3. **admin.ts** (Admin Routes)
   - Validates admin access permission
   - Redirects to appropriate dashboard if unauthorized

4. **super-admin.ts** (Super Admin Routes)
   - Restricts staff management to super_admins only

5. **driver.ts** (Driver Routes)
   - Ensures only drivers access driver-specific pages

### Session Management

```typescript
// Session timeout by role:
- Admin/Staff/Manager: 30 minutes of inactivity
- Customer/Driver: 24 hours

// Timeout detection:
- Tracks last activity timestamp
- Checks every minute
- Signs out and redirects if expired
```

---

## Payment System

### Paystack Integration

**Payment Split (Store Subaccount):**
```
Customer Pays: ₦10,000
├──▶ Paystack (Transaction fee: 1.5%)
├──▶ Store Subaccount: ₦9,500 (store keeps)
└──▶ Platform: ₦500 (service fee via transaction_charge)
```

**Payment Flow:**
1. Customer selects "Pay Online"
2. Frontend calls `POST /api/paystack/initialize`
3. Server creates Paystack transaction with subaccount
4. Customer redirected to Paystack checkout
5. Customer completes payment
6. Paystack redirects to `/checkout/verify`
7. Server calls `POST /api/paystack/verify` to confirm
8. On success, order status updated to `paid`
9. Webhook (`/api/paystack/webhook`) handles async confirmations

**Key Features:**
- Automatic payment splitting to store subaccounts
- Service fee collection for platform revenue
- Webhook handling for payment confirmations
- Transaction reference tracking

---

## Deployment

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# App
SITE_URL=https://your-domain.com
ORDER_PAYMENT_TIMEOUT_MINUTES=15
INVENTORY_RECHECK_BEFORE_PAYMENT=true
```

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Database commands
npm run db:tables      # List all tables
npm run db:describe    # Describe table schema
npm run db:query       # Run a query
```

### PWA Configuration

The app is configured as a Progressive Web App with:
- Offline caching of product images
- API response caching (5-minute TTL)
- Install prompts on mobile
- Theme color: #ED1C24 (HomeAffairs red)

---

## Security Considerations

1. **Row Level Security (RLS)** - All Supabase tables have RLS policies
2. **Service Role Key** - Only used in server API routes
3. **PKCE Auth Flow** - Prevents token interception
4. **Session Timeout** - 30 min for staff, 24 hours for customers
5. **Role-Based Access** - Middleware enforces route permissions
6. **Stock Reservations** - Prevents overselling during checkout
7. **Payment Verification** - Server-side payment confirmation

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Entry Point | `@/app/app.vue` |
| Main Config | `@/nuxt.config.ts` |
| Auth Middleware | `@/app/middleware/auth.global.ts` |
| User Store | `@/app/stores/user.ts` |
| Cart Store | `@/app/stores/useCartStore.ts` |
| Branch Store | `@/app/stores/useBranchStore.ts` |
| Product Composable | `@/app/composables/useProducts.ts` |
| Paystack Initialize | `@/server/api/paystack/initialize.post.ts` |
| Database Types | `@/app/types/database.types.ts` |

---

## Summary

HomeAffairs is a production-ready grocery e-commerce platform with:
- **Multi-branch support** with location-based store selection
- **Role-based access control** for customers, staff, managers, drivers, and admins
- **Real-time inventory** management per branch
- **Integrated payment processing** with automatic revenue splitting
- **Complete order lifecycle** from cart to delivery
- **PWA capabilities** for mobile-first experience
- **Driver mobile interface** for delivery management
- **Admin dashboards** with analytics and operational tools

The architecture follows modern Vue/Nuxt patterns with Pinia for state management, Supabase for backend services, and Paystack for Nigerian payment processing.
