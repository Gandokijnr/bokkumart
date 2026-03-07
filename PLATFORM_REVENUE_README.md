# Platform Revenue System

## Overview

The Platform Revenue System implements an 8% monthly service fee model for Home Affairs digital sales. This replaces the previous per-transaction commission system, making financial conversations clearer and building trust.

**Key Principle:** Home Affairs receives 100% of each payment. Platform fees are calculated and invoiced monthly based on gross digital sales.

## Architecture

### 1. Database Schema

#### Orders Table (Modified)

- Added `channel` field: `"platform"` | `"in_store"`
- Added `payment_status` field: `"pending"` | `"paid"` | `"failed"` | `"cancelled"` | `"expired"` | `"refunded"`
- All digital orders have `channel = 'platform'` and `payment_status = 'paid'`

#### Platform Revenue Table

```sql
platform_revenue:
- id: UUID
- month: INTEGER (1-12)
- year: INTEGER
- total_orders: INTEGER
- gross_sales: DECIMAL(12,2)
- platform_percentage: DECIMAL(5,2) - default 8.00
- platform_fee: DECIMAL(12,2) - calculated as gross_sales * 0.08
- delivery_fees_excluded: DECIMAL(12,2) - if excluding delivery from calc
- status: "pending" | "locked" | "paid" | "disputed"
- invoice_number: VARCHAR(50) - unique invoice identifier
- invoice_generated_at: TIMESTAMP
- generated_at: TIMESTAMP
```

#### Platform Revenue Breakdown Table

```sql
platform_revenue_breakdown:
- id: UUID
- platform_revenue_id: UUID (FK)
- store_id: UUID (FK)
- store_name: VARCHAR
- order_count: INTEGER
- gross_sales: DECIMAL(12,2)
- platform_fee: DECIMAL(12,2)
- delivery_fees: DECIMAL(12,2)
```

### 2. Paystack Integration (Modified)

**File:** `server/api/paystack/initialize.post.ts`

**Changes:**

- Removed per-transaction commission logic
- Removed `transaction_charge` from Paystack payload
- Removed `platform_percentage` and `fixed_commission` from store config
- Home Affairs now receives 100% of each payment
- Added `platform: "homeaffairs-digital"` to metadata for tracking

**Before:**

```javascript
// Old per-transaction commission
const transactionChargeKobo = Math.min(
  amountKobo,
  Math.max(fixedCommissionKobo, percentageCommissionKobo),
);
```

**After:**

```javascript
// No per-transaction charge
// Revenue is tracked monthly via platform_revenue table
```

### 3. Webhook Integration (Modified)

**File:** `server/api/paystack/webhook.post.ts`

**Changes:**

- Removed `payment_split_log` from order records
- Added `channel: "platform"` to new orders
- Added `payment_status: "paid"` to confirmed orders
- Added `platform: "homeaffairs-digital"` to metadata

### 4. API Endpoints

#### GET /api/admin/platform-revenue

Fetch revenue records with optional filtering by month, year, or status.

#### POST /api/admin/platform-revenue/calculate

Calculate revenue for a specific month/year:

```json
{
  "month": 3,
  "year": 2026,
  "excludeDeliveryFees": false,
  "forceRecalculate": false
}
```

#### PATCH /api/admin/platform-revenue/lock

Lock or unlock a revenue record:

```json
{
  "id": "uuid",
  "status": "locked" | "pending" | "paid" | "disputed"
}
```

#### POST /api/admin/platform-revenue/generate-invoice

Generate invoice for a revenue period:

```json
{
  "id": "uuid",
  "dueDays": 7
}
```

#### GET /api/admin/platform-revenue/export-csv

Export CSV of all orders for a month/year:

```
?month=3&year=2026
```

### 5. Admin Dashboard

**Path:** `/admin/platform-revenue`

**Features:**

- Monthly revenue calculation
- Store-level breakdown
- Invoice generation
- CSV export for financial transparency
- Month locking to prevent disputes
- Status tracking (pending, locked, paid, disputed)

## Setup Instructions

### 1. Run Database Migrations

Execute the SQL migration in Supabase SQL Editor:

```bash
# File: scripts/platform_revenue_migration.sql
```

This will:

- Add `channel` and `payment_status` columns to orders table
- Create `platform_revenue` table
- Create `platform_revenue_breakdown` table
- Create helper functions and views

### 2. Run Functions Setup

```bash
# File: scripts/platform_revenue_functions.sql
```

This creates the `get_store_revenue_breakdown()` function used by the API.

### 3. Verify Paystack Changes

The Paystack initialization and webhook endpoints have been updated. No additional configuration needed.

### 4. Access Admin Dashboard

Navigate to `/admin/platform-revenue` (Super Admin only).

## Monthly Workflow

### 1st Day of Month:

1. Navigate to Platform Revenue dashboard
2. Click "Calculate Monthly Revenue"
3. Select previous month
4. Click Calculate
5. Review the breakdown by branch

### After Calculation:

1. Export CSV for Financial Controller verification
2. Review numbers with stakeholders
3. Lock the month when confirmed
4. Generate Invoice
5. Send invoice to Finance

### Invoice Generation:

- Invoice Number Format: `HAP-YYMM-XXXX`
- Due Date: Default 7 days from generation
- Includes breakdown by branch for transparency

## Financial Transparency

### CSV Export Contains:

- Order ID
- Date & Paid At timestamps
- Customer ID
- Store ID & Name
- Subtotal, Delivery Fee, Total Amount
- Payment Method
- Status & Payment Status
- Paystack Reference & Transaction ID

This allows the Financial Controller to cross-check every order.

## Important Notes

### Month Locking

- Once locked, calculations cannot be modified
- Prevents accounting disputes
- Can be unlocked by Super Admin if necessary

### Payment Status Rules

Only orders with `payment_status = 'paid'` are counted:

- Cancelled orders excluded
- Failed payments excluded
- Expired orders excluded
- Refunds excluded

### Delivery Fees Option

When calculating, you can choose to:

- Include delivery fees in 8% calculation (default)
- Exclude delivery fees (optional)

## Security

- All revenue APIs require Super Admin access
- Month locking prevents tampering after review
- CSV exports provide audit trail
- Invoice numbers are unique and immutable

## Support

For questions or issues with the platform revenue system:

1. Check this README first
2. Review the database migration files
3. Verify Paystack configuration
4. Contact technical team
