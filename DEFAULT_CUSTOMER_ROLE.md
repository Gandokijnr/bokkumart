# Default Customer Role Assignment

## ✅ What This Does

All new user signups now automatically receive the **`customer`** role by default. This means:

- ✅ No more "Pending Approval" for regular customers
- ✅ Users can immediately access the shop after signup
- ✅ Seamless customer onboarding experience

## 🔧 How It Works

### Database Trigger
The `handle_new_user()` function automatically:
1. Creates a profile when a new user signs up
2. Sets `role = 'customer'` by default
3. Allows super admins to override with custom roles when creating staff

### Migration File
- **File**: `supabase/migrations/008_default_customer_role.sql`
- **Purpose**: Ensures customer is the default role for all signups

## 📋 User Flow Examples

### Regular Customer Signup
```
1. User signs up at /auth with email/password
   ↓
2. Trigger creates profile with role='customer'
   ↓
3. handleRedirectAfterLogin() redirects to /shop
   ↓
4. ✅ User can start shopping immediately
```

### Super Admin Creating Staff
```
1. Super admin creates user at /admin/staff-management
   ↓
2. Selects role='branch_manager' and assigns stores
   ↓
3. User metadata includes: { role: 'branch_manager', managed_store_ids: [...] }
   ↓
4. Trigger uses metadata to create profile with correct role
   ↓
5. ✅ New staff member gets appropriate role
```

## 🧪 Testing

### Test Regular Signup
1. Go to `/auth`
2. Click "Create Account"
3. Fill in email/password
4. Submit
5. **Expected**: Redirects to `/shop` (not `/pending-approval`)

### Verify in Database
```sql
-- Check newly created user's role
SELECT id, email, full_name, role, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Should see role='customer' for all regular signups
```

### Test Admin-Created User
1. Login as super admin
2. Go to `/admin/staff-management`
3. Create new user with role='branch_manager'
4. **Expected**: New user gets 'branch_manager' role (not 'customer')

## 🔒 Security Notes

### Role Override Protection
- Only works via Supabase Auth metadata
- Cannot be manipulated by client-side code
- Super admin interface uses Supabase Admin API to set metadata
- Regular signups don't have access to set custom roles

### Trigger Security
```sql
SECURITY DEFINER -- Runs with elevated privileges
-- Necessary to insert into profiles table even though RLS is enabled
```

## 📄 Migration Details

### What Changed
**Before**: New users had `role = NULL` → sent to `/pending-approval`
**After**: New users have `role = 'customer'` → sent to `/shop`

### Backward Compatibility
- Existing users are NOT affected
- Only applies to new signups
- Admin-created staff still get custom roles
- Migration is idempotent (safe to run multiple times)

## 🚀 Apply the Migration

### Via Supabase Dashboard
1. Go to **SQL Editor**
2. Open `supabase/migrations/008_default_customer_role.sql`
3. Copy all contents
4. Paste and click **Run**

### Via Supabase CLI (if installed)
```bash
supabase db push
```

## ✨ Benefits

1. **Better UX**: Customers don't see "pending approval" page
2. **Instant Access**: Can shop immediately after signup
3. **Flexible**: Super admins can still create staff with custom roles
4. **Secure**: Role assignment happens at database level (can't be bypassed)

## 🎯 Role Assignment Matrix

| Signup Method | Role Assigned | Redirect To |
|--------------|---------------|-------------|
| Regular signup at /auth | `customer` | `/shop` |
| Super admin creates branch manager | `branch_manager` | `/admin/branch-dashboard` |
| Super admin creates super admin | `super_admin` | `/admin/global-dashboard` |
| Super admin creates staff | `staff` | `/admin` |

---

**Migration Status**: ✅ Ready to apply
**Impact**: Only affects new signups going forward
**Rollback**: Simply revert the function to not set default role
