// Pinia Store for User Management with Role-Based Access Control
import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export type UserRole = 'customer' | 'staff' | 'branch_manager' | 'super_admin' | 'driver'

interface UserProfile {
  id: string
  full_name: string | null
  phone_number: string | null
  role: UserRole
  store_id: string | null
  managed_store_ids: string[] | null
  created_at: string
  updated_at: string
}

interface UserState {
  user: User | null
  profile: UserProfile | null
  managedStores: Database['public']['Tables']['stores']['Row'][]
  loading: boolean
  error: string | null
  lastActivityAt: number | null
  sessionTimeoutMs: number
  impersonatingRole: UserRole | null // For super admin "view as" feature
}

interface NavItem {
  label: string
  icon: string
  to: string
  roles: UserRole[]
  badge?: string
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    profile: null,
    managedStores: [],
    loading: false,
    error: null,
    lastActivityAt: null,
    sessionTimeoutMs: 24 * 60 * 60 * 1000, // Default 24 hours
    impersonatingRole: null
  }),

  getters: {
    // Current effective role (consider impersonation)
    effectiveRole: (state): UserRole => {
      return state.impersonatingRole || state.profile?.role || 'customer'
    },

    // Role checks
    isAuthenticated: (state) => !!state.user,

    isSuperAdmin: (state) => state.profile?.role === 'super_admin',

    isBranchManager: (state) => state.profile?.role === 'branch_manager',

    isStaff: (state) => state.profile?.role === 'staff',

    isCustomer: (state) => !state.profile?.role || state.profile?.role === 'customer',

    // Check if user has a valid role assigned
    hasRole: (state) => !!state.profile?.role,

    // Has access to admin routes
    hasAdminAccess(): boolean {
      const role = this.effectiveRole
      const adminRoles: UserRole[] = ['super_admin', 'branch_manager', 'staff']
      return adminRoles.includes(role as UserRole)
    },

    // Has access to staff management
    hasStaffManagementAccess() {
      const role = this.effectiveRole
      return role === 'super_admin'
    },

    // Has staff-level access (includes all admin roles)
    hasStaffAccess(): boolean {
      const role = this.effectiveRole
      const staffRoles: UserRole[] = ['super_admin', 'branch_manager', 'staff']
      return staffRoles.includes(role as UserRole)
    },

    // User display info
    displayName: (state) => {
      return state.profile?.full_name || state.user?.email || 'Guest'
    },

    userRole: (state): UserRole => state.profile?.role || 'customer',

    // Get managed store names
    managedStoreNames: (state) => {
      if (state.managedStores.length === 0) return 'No Stores Assigned'
      if (state.managedStores.length === 1) return state.managedStores[0]?.name || 'Unnamed Store'
      return state.managedStores.map(s => s?.name || 'Unnamed Store').join(', ')
    },

    // Navigation items based on role
    navigationItems(): NavItem[] {
      const role = this.effectiveRole
      const items: NavItem[] = []

      // Super Admin Navigation
      if (role === 'super_admin') {
        items.push(
          { label: 'Global Dashboard', icon: '🌐', to: '/admin/global-dashboard', roles: ['super_admin'] },
          { label: 'All Orders', icon: '📦', to: '/admin/orders', roles: ['super_admin'] },
          { label: 'Dispatch', icon: '🛵', to: '/admin/dispatch', roles: ['super_admin'] },
          { label: 'Drivers', icon: '🚗', to: '/admin/drivers', roles: ['super_admin'] },
          { label: 'Branch Performance', icon: '📊', to: '/admin/analytics', roles: ['super_admin'] },
          { label: 'Staff Management', icon: '👥', to: '/admin/staff-management', roles: ['super_admin'] },
          { label: 'Inventory Settings', icon: '⚙️', to: '/admin/inventory', roles: ['super_admin'] },
          { label: 'Audit Logs', icon: '📋', to: '/admin/audit-logs', roles: ['super_admin'] }
        )
      }

      // Branch Manager Navigation
      else if (role === 'branch_manager') {
        items.push(
          { label: 'My Dashboard', icon: '🏪', to: '/admin/branch-dashboard', roles: ['branch_manager'] },
          { label: 'My Store Orders', icon: '📦', to: '/admin/orders', roles: ['branch_manager'] },
          { label: 'Dispatch', icon: '🛵', to: '/admin/dispatch', roles: ['branch_manager'] },
          { label: 'Drivers', icon: '🚗', to: '/admin/drivers', roles: ['branch_manager'] },
          { label: 'Local Inventory', icon: '📦', to: '/admin/inventory', roles: ['branch_manager'] },
          { label: 'Daily Sales Report', icon: '💰', to: '/admin/sales', roles: ['branch_manager'] },
          { label: 'My Activity Log', icon: '📝', to: '/admin/my-audit-logs', roles: ['branch_manager'] }
        )
      }

      // Staff Navigation
      else if (role === 'staff') {
        items.push(
          { label: 'Dashboard', icon: '📊', to: '/admin/dashboard', roles: ['staff'] },
          { label: 'Verification Queue', icon: '📞', to: '/admin/verification-queue', roles: ['staff'] },
          { label: 'Orders', icon: '📦', to: '/admin/orders', roles: ['staff'] },
          { label: 'Dispatch', icon: '🛵', to: '/admin/dispatch', roles: ['staff'] },
          { label: 'Inventory', icon: '📦', to: '/admin/inventory', roles: ['staff'] }
        )
      }

      // Driver Navigation
      else if (role === 'driver') {
        items.push(
          { label: 'Driver', icon: '🚗', to: '/driver/dashboard', roles: ['driver'] },
          { label: 'My Deliveries', icon: '🛵', to: '/driver/deliveries', roles: ['driver'] },
          { label: 'Route Map', icon: '📍', to: '/driver/routes', roles: ['driver'] },
          { label: 'Completed Tasks', icon: '✅', to: '/driver/completed', roles: ['driver'] },
          { label: 'SOS / Support', icon: '🆘', to: '/driver/support', roles: ['driver'] }
        )
      }

      // Customer Navigation
      else {
        items.push(
          { label: '/', icon: '🏪', to: '/', roles: ['customer'] },
          { label: 'My Orders', icon: '📦', to: '/my-orders', roles: ['customer'] },
          { label: 'Loyalty Points', icon: '⭐', to: '/loyalty', roles: ['customer'] },
          { label: 'Saved Addresses', icon: '📍', to: '/addresses', roles: ['customer'] }
        )
      }

      return items
    },

    // Filtered navigation for current user
    userNavigation(): NavItem[] {
      const role = this.effectiveRole
      return this.navigationItems.filter((item: NavItem) => item.roles.includes(role))
    },

    // Session timeout check
    isSessionExpired: (state) => {
      if (!state.lastActivityAt) return false

      const now = Date.now()
      const inactiveTime = now - state.lastActivityAt

      // Admin/staff: 30 minutes, others: 24 hours
      const role = state.profile?.role
      const timeout = ['admin', 'staff', 'manager', 'super_admin', 'branch_manager'].includes(role || '')
        ? 30 * 60 * 1000 // 30 minutes
        : 24 * 60 * 60 * 1000 // 24 hours

      return inactiveTime > timeout
    }
  },

  actions: {
    // Initialize store - call on app mount
    async initialize() {
      const supabase = useSupabaseClient<Database>()

      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        this.user = session.user
        await this.fetchProfile()
        this.updateActivity()
        this.setupSessionTimeout()
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          this.user = session.user
          await this.fetchProfile()
          this.updateActivity()
          this.setupSessionTimeout()
        } else if (event === 'SIGNED_OUT') {
          this.clearUser()
        }
      })
    },

    // Fetch user profile from Supabase
    async fetchProfile() {
      if (!this.user?.id && !(this.user as any)?.sub) {
        return
      }

      const userId = this.user?.id || (this.user as any)?.sub

      this.loading = true
      this.error = null

      try {
        const supabase = useSupabaseClient<Database>()

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error

        this.profile = data as UserProfile | null

        // Fetch managed stores if branch manager
        if (data && data.managed_store_ids && data.managed_store_ids.length > 0) {
          const { data: storesData } = await supabase
            .from('stores')
            .select('*')
            .in('id', data.managed_store_ids)

          this.managedStores = storesData || []
        }

        // Set shorter timeout for staff/admin
        const role = this.profile?.role
        if (['admin', 'staff', 'manager', 'super_admin', 'branch_manager'].includes(role || '')) {
          this.sessionTimeoutMs = 30 * 60 * 1000 // 30 minutes
        } else {
          this.sessionTimeoutMs = 24 * 60 * 60 * 1000 // 24 hours
        }

      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    // Update last activity timestamp
    updateActivity() {
      this.lastActivityAt = Date.now()
    },

    // Setup session timeout monitoring
    setupSessionTimeout() {
      // Only for staff/admin roles
      if (!this.hasAdminAccess) return

      // Check every minute
      setInterval(() => {
        if (this.isSessionExpired) {
          this.handleSessionTimeout()
        }
      }, 60000)

      // Track user activity
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
      const updateActivity = () => this.updateActivity()

      events.forEach(event => {
        window.addEventListener(event, updateActivity, { passive: true })
      })

      // Cleanup on sign out
      return () => {
        events.forEach(event => {
          window.removeEventListener(event, updateActivity)
        })
      }
    },

    // Handle session timeout
    async handleSessionTimeout() {
      const toast = useToast()

      toast.add({
        title: 'Session Expired',
        description: 'For security, you have been logged out due to inactivity.',
        color: 'red'
      } as any)

      await this.signOut()
      navigateTo('/auth')
    },

    // Sign out
    async signOut() {
      const supabase = useSupabaseClient()
      await supabase.auth.signOut()
      this.clearUser()
    },

    // Clear user data
    clearUser() {
      this.user = null
      this.profile = null
      this.managedStores = []
      this.error = null
      this.lastActivityAt = null
      this.impersonatingRole = null
    },

    // Redirect after login based on role
    handleRedirectAfterLogin() {
      const role = this.profile?.role || 'customer'

      // Role-based redirect
      if (role === 'super_admin') {
        navigateTo('/admin/global-dashboard')
      } else if (role === 'branch_manager') {
        navigateTo('/admin/branch-dashboard')
      } else if (role === 'staff') {
        navigateTo('/admin/dashboard')
      } else if (role === 'driver') {
        navigateTo('/driver/dashboard')
      } else {
        navigateTo('/')
      }
    },

    // Check if user can access a route
    canAccess(route: string): boolean {
      // Public routes
      if (route === '/' || route.startsWith('/auth') || route.startsWith('/product') || route.startsWith('/')) {
        return true
      }

      // Must be authenticated for protected routes
      if (!this.isAuthenticated) return false

      // Super admin can access everything
      if (this.isSuperAdmin) return true

      // Staff management routes - super admin only
      if (route.startsWith('/admin/staff-management') || route.startsWith('/admin/global-dashboard')) {
        return this.isSuperAdmin
      }

      // Admin routes - all admin roles
      if (route.startsWith('/admin')) {
        return this.hasAdminAccess
      }

      // Customer routes (orders, profile, etc.)
      return true
    },

    // Super Admin Impersonation Feature
    impersonateRole(role: UserRole) {
      if (!this.isSuperAdmin) return
      this.impersonatingRole = role

      const toast = useToast()
      toast.add({
        title: 'Viewing As',
        description: `You are now viewing the interface as: ${role}`,
        color: 'blue'
      } as any)
    },

    stopImpersonation() {
      this.impersonatingRole = null

      const toast = useToast()
      toast.add({
        title: 'Impersonation Stopped',
        description: 'You are back to super admin view',
        color: 'green'
      } as any)
    }
  }
})
