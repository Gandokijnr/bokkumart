# HomeAffairs Role Structure - Simplified & Clarified

## 🎯 Proposed Role Hierarchy (Simplified)

### 1. **Super Admin** (Owner/CEO)
**Who**: Business owner with complete oversight  
**Access Level**: 🦅 Eagle Eye - Sees EVERYTHING across ALL stores

**Capabilities**:
- ✅ View global dashboard with all stores' performance
- ✅ Create/manage/delete Branch Managers
- ✅ Create/manage/delete stores (branches)
- ✅ Access all orders from all stores
- ✅ View analytics across all branches
- ✅ Manage inventory settings globally
- ✅ Switch between store views to compare performance
- ✅ View audit logs for all activities
- ✅ Configure system-wide settings
- ✅ Impersonate other roles (if needed for testing)

**Dashboard**: `/admin/global-dashboard`

---

### 2. **Branch Manager** (Store Manager)
**Who**: Manager assigned to a specific store branch  
**Access Level**: 🏪 Store Owner - Full control of THEIR assigned store

**Capabilities**:
- ✅ View their store's dashboard with performance metrics
- ✅ Create/manage/delete Staff for their store
- ✅ Respond to customer call verification requests
- ✅ View & manage orders for their store only
- ✅ Manage inventory for their store
- ✅ View sales reports for their store
- ✅ View activity logs for their store
- ❌ Cannot see other stores' data
- ❌ Cannot create other Branch Managers
- ❌ Cannot modify system settings

**Dashboard**: `/admin/branch-dashboard`

---

### 3. **Staff**
**Who**: Employees working under a Branch Manager at a specific store  
**Access Level**: 👨‍💼 Operational - Handle day-to-day customer service

**Capabilities**:
- ✅ View verification queue (customer call requests)
- ✅ Respond to customer orders
- ✅ Update order statuses
- ✅ View inventory (read-only or limited edit)
- ✅ Process customer pickups
- ❌ Cannot create other users
- ❌ Cannot delete orders
- ❌ Cannot access analytics
- ❌ Cannot modify store settings

**Dashboard**: `/admin/dashboard` (simplified staff view)

---

### 4. **Customer**
**Who**: Regular users shopping on the platform  
**Access Level**: 🛒 Shopping & Orders

**Capabilities**:
- ✅ Browse products
- ✅ Add to cart & checkout
- ✅ View their own orders
- ✅ Track order status
- ✅ Request call verification for orders
- ✅ Manage delivery addresses
- ✅ View loyalty points (if applicable)
- ❌ No admin access

**Pages**: Public storefront, `/my-orders`, `/profile`

---

### 5. **Driver** (Optional - Future Enhancement)
**Who**: Delivery personnel  
**Access Level**: 🚗 Delivery Operations

**Capabilities**:
- ✅ View assigned deliveries
- ✅ Update delivery status
- ✅ Mark orders as delivered
- ✅ View delivery routes
- ❌ Cannot access store operations

**Dashboard**: `/driver/deliveries` (not yet implemented)

---

## 🗑️ Roles to REMOVE

### ~~Admin~~ (DEPRECATED)
**Why Remove**: 
- Overlaps with both Super Admin and Branch Manager
- Creates confusion about permissions
- Not needed in a clear hierarchy
- All "admin" capabilities are covered by Super Admin

**Migration Path**:
- Current "admin" users → Promote to **Super Admin** (if owner/corporate)
- Current "admin" users → Convert to **Branch Manager** (if store-level)

---

### ~~Manager~~ (CONSOLIDATE)
**Why Remove**: 
- Duplicates "Branch Manager" functionality
- Creates unnecessary confusion
- Should be merged into "Branch Manager"

**Migration Path**:
- All "manager" users → Rename to **Branch Manager**
- Update all references in code from "manager" to "branch_manager"

---

## 📊 Final Simplified Role List

```typescript
export type UserRole = 
  | 'customer'           // Regular shoppers
  | 'staff'              // Store employees
  | 'branch_manager'     // Store-level managers
  | 'super_admin'        // Business owner(s)
  | 'driver'             // Delivery personnel (future)
```

---

## 🔀 User Journey Examples

### Example 1: Owner Sets Up New Store
1. **Super Admin** creates new store "Ikeja Branch"
2. **Super Admin** creates Branch Manager account and assigns them to "Ikeja Branch"
3. **Branch Manager** logs in and sees their store dashboard
4. **Branch Manager** creates 3 Staff accounts for their store
5. **Staff** can now handle customer orders for Ikeja Branch

### Example 2: Customer Places Order
1. **Customer** adds items to cart and checks out
2. **Customer** requests call verification
3. Order appears in **Branch Manager's** verification queue
4. **Branch Manager** or **Staff** calls customer to verify
5. Order is processed and fulfilled

### Example 3: Owner Reviews Performance
1. **Super Admin** opens global dashboard
2. Views performance across all stores (Gbagada, Ikeja, Lekki)
3. Switches to "Ikeja Branch" view to see detailed metrics
4. Notices Ikeja is underperforming
5. Contacts Ikeja Branch Manager to discuss improvement strategies

---

## 🛠️ Implementation Changes Needed

### 1. Database Changes
```sql
-- Update existing roles
UPDATE profiles 
SET role = 'super_admin' 
WHERE role = 'admin' AND is_owner = true;

UPDATE profiles 
SET role = 'branch_manager' 
WHERE role = 'admin' OR role = 'manager';
```

### 2. Code Changes
- Remove all references to `'admin'` role
- Consolidate `'manager'` into `'branch_manager'`
- Update navigation items in AppSidebar
- Update middleware permission checks
- Update database row-level security policies

### 3. User Communication
- Email existing users about role changes
- Provide clear documentation of new permissions
- Offer support during transition period

---

## ✅ Benefits of Simplified Structure

1. **Crystal Clear Hierarchy**: Owner → Store Manager → Staff → Customer
2. **No Permission Overlap**: Each role has distinct, non-overlapping capabilities
3. **Easier Onboarding**: New users understand their role immediately
4. **Reduced Bugs**: Fewer edge cases in permission logic
5. **Scalable**: Easy to add new stores and managers
6. **Better UX**: Role-appropriate dashboards with only relevant features

---

## 🎯 Recommended Action

**Option A: Full Cleanup (Recommended)**
- Remove `'admin'` role completely
- Merge `'manager'` into `'branch_manager'`
- Update all existing users
- Simplify all permission checks

**Option B: Soft Deprecation**
- Keep roles in code for backward compatibility
- Disable creating new "admin" or "manager" users
- Gradually migrate existing users

**Which would you prefer?** I can implement either approach!
