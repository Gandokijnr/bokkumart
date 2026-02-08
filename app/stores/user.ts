// Pinia Store for User Management with Role-Based Access Control
import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'customer' | 'staff' | 'manager' | 'admin'

interface UserProfile {
  id: string
  full_name: string | null
  phone_number: string | null
  role: UserRole
  store_id: string | null
  created_at: string
  updated_at: string
}

interface UserState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  lastActivityAt: number | null
  sessionTimeoutMs: number
}

interface NavItem {
  label: string
  icon: string
  to: string
  roles: UserRole[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    profile: null,
    loading: false,
    error: null,
    lastActivityAt: null,
    // 30 minutes for admin/staff, 24 hours for customers
    sessionTimeoutMs: 24 * 60 * 60 * 1000 // Default 24 hours
  }),

  getters: {
    // Role checks
    isAuthenticated: (state) => !!state.user,
    
    isAdmin: (state) => state.profile?.role === 'admin',
    
    isStaff: (state) => state.profile?.role === 'staff' || state.profile?.role === 'manager',
    
    isManager: (state) => state.profile?.role === 'manager',
    
    isCustomer: (state) => !state.profile?.role || state.profile?.role === 'customer',
    
    // Has access to admin routes
    hasAdminAccess: (state) => state.profile?.role === 'admin' || state.profile?.role === 'manager',
    
    // Has access to staff routes (includes admin)
    hasStaffAccess: (state) => 
      state.profile?.role === 'admin' || 
      state.profile?.role === 'manager' || 
      state.profile?.role === 'staff',
    
    // User display info
    displayName: (state) => {
      return state.profile?.full_name || state.user?.email || 'Guest'
    },
    
    userRole: (state): UserRole => state.profile?.role || 'customer',
    
    // Navigation items based on role
    navigationItems: (state): NavItem[] => {
      const items: NavItem[] = []
      
      // Customer items (everyone sees these)
      items.push(
        { label: 'Home', icon: 'home', to: '/', roles: ['customer', 'staff', 'manager', 'admin'] },
        { label: 'My Orders', icon: 'shopping-bag', to: '/orders', roles: ['customer', 'staff', 'manager', 'admin'] },
        { label: 'Profile', icon: 'user', to: '/profile', roles: ['customer', 'staff', 'manager', 'admin'] },
        { label: 'Cart', icon: 'shopping-cart', to: '/cart', roles: ['customer', 'staff', 'manager', 'admin'] }
      )
      
      const role = state.profile?.role
      
      // Staff items
      if (role === 'staff' || role === 'manager' || role === 'admin') {
        items.push(
          { label: 'Operations', icon: 'clipboard-list', to: '/admin', roles: ['staff', 'manager', 'admin'] },
          { label: 'Verification Queue', icon: 'phone', to: '/admin/verification-queue', roles: ['staff', 'manager', 'admin'] }
        )
      }
      
      // Manager/Admin items
      if (role === 'manager' || role === 'admin') {
        items.push(
          { label: 'Inventory', icon: 'package', to: '/admin/inventory', roles: ['manager', 'admin'] },
          { label: 'Store Analytics', icon: 'chart-bar', to: '/admin/dashboard', roles: ['manager', 'admin'] },
          { label: 'Orders', icon: 'list', to: '/admin/orders-new', roles: ['manager', 'admin'] }
        )
      }
      
      // Admin only items
      if (role === 'admin') {
        items.push(
          { label: 'Staff Management', icon: 'users', to: '/admin/settings', roles: ['admin'] },
          { label: 'Settings', icon: 'cog', to: '/admin/settings', roles: ['admin'] }
        )
      }
      
      return items
    },
    
    // Filtered navigation for current user
    userNavigation(): NavItem[] {
      const role = this.profile?.role || 'customer'
      return this.navigationItems.filter((item: NavItem) => item.roles.includes(role))
    },
    
    // Session timeout check
    isSessionExpired: (state) => {
      if (!state.lastActivityAt) return false
      
      const now = Date.now()
      const inactiveTime = now - state.lastActivityAt
      
      // Admin/staff: 30 minutes, others: 24 hours
      const role = state.profile?.role
      const timeout = (role === 'admin' || role === 'staff' || role === 'manager')
        ? 30 * 60 * 1000 // 30 minutes
        : 24 * 60 * 60 * 1000 // 24 hours
        
      return inactiveTime > timeout
    }
  },

  actions: {
    // Initialize store - call on app mount
    async initialize() {
      const supabase = useSupabaseClient()
      
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
          
          // Redirect based on role after login
          this.redirectBasedOnRole()
        } else if (event === 'SIGNED_OUT') {
          this.clearUser()
        }
      })
    },
    
    // Fetch user profile from Supabase
    async fetchProfile() {
      if (!this.user?.id && !(this.user as any)?.sub) return
      
      const userId = this.user?.id || (this.user as any)?.sub
      
      this.loading = true
      this.error = null
      
      try {
        const supabase = useSupabaseClient()
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) throw error
        
        this.profile = data as UserProfile | null
        
        // Set shorter timeout for staff/admin
        const role = this.profile?.role
        if (role === 'admin' || role === 'staff' || role === 'manager') {
          this.sessionTimeoutMs = 30 * 60 * 1000 // 30 minutes
        } else {
          this.sessionTimeoutMs = 24 * 60 * 60 * 1000 // 24 hours
        }
        
      } catch (err: any) {
        console.error('Error fetching profile:', err)
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
      if (!this.hasStaffAccess) return
      
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
      this.error = null
      this.lastActivityAt = null
    },
    
    // Redirect after login based on role
    redirectBasedOnRole() {
      const role = this.profile?.role
      
      if (role === 'admin') {
        navigateTo('/admin/dashboard')
      } else if (role === 'manager' || role === 'staff') {
        navigateTo('/admin')
      } else {
        navigateTo('/')
      }
    },
    
    // Check if user can access a route
    canAccess(route: string): boolean {
      // Public routes
      if (route === '/' || route.startsWith('/auth') || route.startsWith('/product')) {
        return true
      }
      
      // Must be authenticated for protected routes
      if (!this.isAuthenticated) return false
      
      // Admin routes
      if (route.startsWith('/admin')) {
        return this.hasStaffAccess
      }
      
      // Customer routes (orders, profile, etc.)
      return true
    }
  }
})
