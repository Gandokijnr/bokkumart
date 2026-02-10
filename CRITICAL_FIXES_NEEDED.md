# 🚨 CRITICAL FIXES NEEDED - Branch Manager Login Issue

## Problem 1: 500 Error on Profile Fetch
**Error**: `GET /rest/v1/profiles 500 (Internal Server Error)`

**Cause**: The RLS policies we created are blocking users from viewing their own profiles!

**Fix**: Run the new SQL script to create permissive policies.

### Step 1: Fix RLS Policies in Supabase
1. Open Supabase SQL Editor
2. Run this file: `supabase/migrations/fix_rls_policies.sql`
3. This will:
   - Drop all conflicting policies
   - Create new policies that allow users to ALWAYS view their own profile
   - Super admins can view all profiles
   - Branch managers can view profiles in their store

---

## Problem 2: Branch Manager Not Redirecting
**Cause**: The `handleRedirectAfterLogin` function in `user.ts` still references old 'admin' and 'manager' roles

**Fix**: Manually edit the file (lines 328-331)

### Step 2: Fix handleRedirectAfterLogin Function

**File**: `app/stores/user.ts`  
**Lines to change**: 328-331

**Current code (BROKEN)**:
```typescript
} else if (role === 'admin') {        // ❌ This role doesn't exist anymore!
  navigateTo('/admin/dashboard')
} else if (role === 'manager' || role === 'staff') {  // ❌ 'manager' doesn't exist!
  navigateTo('/admin')
} else {
```

**Replace with (FIXED)**:
```typescript
} else if (role === 'staff') {        // ✅ Only staff role
  navigateTo('/admin/dashboard')
} else {
```

### How to Make the Change:
1. Open `app/stores/user.ts`
2. Go to line 328
3. **Delete lines 328-331** (4 lines total)
4. **Add these 2 lines**:
```typescript
} else if (role === 'staff') {
  navigateTo('/admin/dashboard')
```
5. Save the file

---

## After Both Fixes:

### Expected Behavior:
- ✅ Branch Manager logs in
- ✅ Profile fetches successfully (no 500 error)
- ✅ Automatically redirects to `/admin/branch-dashboard`
- ✅ Can see branch-specific navigation items
- ✅ Can create staff for their store

---

## Quick Test:

After fixing both issues:

1. **Clear browser cache** (Ctrl+Shift+Del)
2. **Sign out** completely
3. **Sign back in** as branch_manager
4. Should redirect to `/admin/branch-dashboard`
5. Check browser console - no 500 errors!

---

## Why This Happened:

1. **RLS Policies**: The policies we created didn't prioritize "users can view own profile", so Supabase blocked the initial fetchProfile() call
   
2. **Redirect Function**: We updated the role types but forgot to update the actual redirect logic that checks those roles

---

## Final Structure (After Fixes):

```typescript
handleRedirectAfterLogin() {
  const role = this.profile?.role || 'customer'

  if (role === 'super_admin') {
    navigateTo('/admin/global-dashboard')     // ✅ Owner
  } else if (role === 'branch_manager') {
    navigateTo('/admin/branch-dashboard')     // ✅ Store Manager
  } else if (role === 'staff') {
    navigateTo('/admin/dashboard')            // ✅ Staff
  } else {
    navigateTo('/')                           // ✅ Customer
  }
}
```

Clean, simple, no deprecated roles! 🎉
