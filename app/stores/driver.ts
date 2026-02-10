// Driver Store - Manages driver state, active orders, and delivery workflow
import { defineStore } from 'pinia'
import type { Database } from '~/types/database.types'

type OrderStatus = 'assigned' | 'picked_up' | 'arrived' | 'delivered'

interface DeliveryDetails {
    address?: {
        area?: string
        street?: string
        houseNumber?: string
        landmark?: string
    }
    contactPhone?: string
    deliveryZone?: string
}

interface ActiveOrder {
    id: string
    user_id: string
    store_id: string
    items: any[]
    total_amount: number
    status: OrderStatus
    payment_method: 'online' | 'pod'
    delivery_details: DeliveryDetails | null
    nearest_landmark: string | null
    confirmation_code: string
    assigned_at: string
    picked_up_at: string | null
    arrived_at: string | null
    delivered_at: string | null
    driver_notes: string | null
    created_at: string
    customer?: {
        full_name: string | null
        phone_number: string | null
    }
}

interface DriverState {
    activeOrder: ActiveOrder | null
    orderHistory: ActiveOrder[]
    driverStatus: 'offline' | 'available' | 'on_delivery'
    loading: boolean
    error: string | null
    realtimeChannel: any | null
    offlineActions: OfflineAction[]
    isOnline: boolean
}

interface OfflineAction {
    id: string
    type: 'status_update' | 'delivery_confirm'
    orderId: string
    data: any
    timestamp: number
}

export const useDriverStore = defineStore('driver', {
    state: (): DriverState => ({
        activeOrder: null,
        orderHistory: [],
        driverStatus: 'offline',
        loading: false,
        error: null,
        realtimeChannel: null,
        offlineActions: [],
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    }),

    getters: {
        hasActiveOrder: (state) => !!state.activeOrder,

        isAvailable: (state) => state.driverStatus === 'available',

        isOnDelivery: (state) => state.driverStatus === 'on_delivery',

        currentOrderStatus: (state) => state.activeOrder?.status || null,

        // Get customer location for navigation
        customerLocation: (state): { lat?: number; lng?: number } | null => {
            if (!state.activeOrder?.delivery_details) return null
            const details: any = state.activeOrder.delivery_details
            const addr: any = details?.address
            const coords: any = details?.coordinates || details?.location || details?.geo

            const lat =
                (addr && (addr.lat ?? addr.latitude)) ??
                (coords && (coords.lat ?? coords.latitude)) ??
                details?.lat ??
                details?.latitude

            const lng =
                (addr && (addr.lng ?? addr.longitude)) ??
                (coords && (coords.lng ?? coords.longitude)) ??
                details?.lng ??
                details?.longitude

            if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng }
            if (typeof lat === 'string' && typeof lng === 'string') {
                const latNum = Number(lat)
                const lngNum = Number(lng)
                if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) return { lat: latNum, lng: lngNum }
            }

            return null
        },

        // Calculate total earnings (from delivered orders)
        todayEarnings: (state) => {
            const today = new Date().toDateString()
            return state.orderHistory
                .filter(order => {
                    const deliveredDate = order.delivered_at ? new Date(order.delivered_at).toDateString() : null
                    return deliveredDate === today
                })
                .reduce((sum, order) => sum + Number(order.total_amount), 0)
        },

        // Count today's deliveries
        todayDeliveries: (state) => {
            const today = new Date().toDateString()
            return state.orderHistory.filter(order => {
                const deliveredDate = order.delivered_at ? new Date(order.delivered_at).toDateString() : null
                return deliveredDate === today
            }).length
        },

        // Check if payment is POD
        isPayOnDelivery: (state) => state.activeOrder?.payment_method === 'pod',

        // Get next action button text based on status
        nextActionText: (state) => {
            if (!state.activeOrder) return null

            const status = state.activeOrder.status
            const isPOD = state.activeOrder.payment_method === 'pod'

            switch (status) {
                case 'assigned':
                    return 'Confirm Pickup at Store'
                case 'picked_up':
                    return 'Arrived at Customer'
                case 'arrived':
                    return isPOD ? 'Confirm Payment & Close Order' : 'Enter Delivery PIN'
                default:
                    return null
            }
        }
    },

    actions: {
        async resolveUserId() {
            const supabase = useSupabaseClient<Database>()
            const user = useSupabaseUser()

            const direct = (user.value as any)?.id || (user.value as any)?.sub
            if (direct) return direct as string

            const { data: { session } } = await supabase.auth.getSession()
            const sessionId = (session?.user as any)?.id || (session?.user as any)?.sub
            return (sessionId || null) as string | null
        },

        // Initialize driver - fetch active order and setup realtime
        async initialize() {
            const supabase = useSupabaseClient<Database>()
            const userId = await this.resolveUserId()
            if (!userId) return

            this.loading = true
            try {
                // Fetch driver's current status
                const { data: profile } = await (supabase
                    .from('profiles')
                    .select as any)('driver_status')
                    .eq('id', userId)
                    .single()

                if (profile) {
                    this.driverStatus = profile.driver_status as any
                }

                // Fetch active order
                await this.fetchActiveOrder()

                // Setup realtime subscription
                this.setupRealtimeSubscription()

                // Setup offline/online detection
                this.setupOfflineDetection()

                // Try to sync offline actions
                await this.syncOfflineActions()

            } catch (err: any) {
                this.error = err.message
            } finally {
                this.loading = false
            }
        },

        // Fetch the driver's currently assigned order
        async fetchActiveOrder() {
            const supabase = useSupabaseClient<Database>()
            const userId = await this.resolveUserId()
            if (!userId) return

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('driver_id', userId)
                    .in('status', ['assigned', 'picked_up', 'arrived'])
                    .order('assigned_at', { ascending: false })
                    .limit(1)
                    .single()

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                    throw error
                }

                this.activeOrder = data as any

                if (this.activeOrder?.user_id) {
                    const { data: customerProfile } = await supabase
                        .from('profiles')
                        .select('full_name, phone_number')
                        .eq('id', this.activeOrder.user_id)
                        .single()

                    if (customerProfile && this.activeOrder) {
                        this.activeOrder.customer = customerProfile as any
                    }
                }

                if (this.activeOrder) {
                    this.driverStatus = 'on_delivery'
                } else if (this.driverStatus !== 'offline') {
                    this.driverStatus = 'available'
                }
            } catch (err: any) {
                console.error('Failed to fetch active order:', err)
            }
        },

        // Fetch order history
        async fetchOrderHistory(limit = 20) {
            const supabase = useSupabaseClient<Database>()
            const userId = await this.resolveUserId()
            if (!userId) return

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('driver_id', userId)
                    .eq('status', 'delivered')
                    .order('delivered_at', { ascending: false })
                    .limit(limit)

                if (error) throw error

                const orders = (data || []) as any[]

                // Attach customer profiles best-effort (no FK join assumption)
                const userIds = Array.from(new Set(orders.map(o => o.user_id).filter(Boolean)))
                let customerMap = new Map<string, any>()

                if (userIds.length > 0) {
                    const { data: customers } = await supabase
                        .from('profiles')
                        .select('id, full_name, phone_number')
                        .in('id', userIds)

                    for (const c of (customers || []) as any[]) {
                        customerMap.set(c.id, c)
                    }
                }

                this.orderHistory = orders.map(o => ({
                    ...o,
                    customer: o.user_id ? customerMap.get(o.user_id) || null : null
                })) as any
            } catch (err: any) {
                console.error('Failed to fetch order history:', err)
            }
        },

        // Toggle driver availability status
        async toggleAvailability() {
            const supabase = useSupabaseClient<Database>()
            const userId = await this.resolveUserId()
            if (!userId || this.isOnDelivery) {
                if (!userId) {
                    const toast = useToast()
                    toast.add({
                        title: 'Session Error',
                        description: 'Please sign in again to go online.',
                        color: 'error'
                    } as any)
                }
                return
            }

            const newStatus = this.driverStatus === 'available' ? 'offline' : 'available'

            try {
                const { error } = await (supabase
                    .from('profiles')
                    .update as any)({ driver_status: newStatus })
                    .eq('id', userId)

                if (error) throw error

                this.driverStatus = newStatus

                const toast = useToast()
                toast.add({
                    title: newStatus === 'available' ? 'You are now Online' : 'You are now Offline',
                    description: newStatus === 'available'
                        ? 'You will receive new delivery assignments'
                        : 'You will not receive new assignments',
                    color: newStatus === 'available' ? 'green' : 'gray'
                } as any)

            } catch (err: any) {
                this.error = err.message
            }
        },

        // Update order status based on workflow
        async updateOrderStatus(newStatus: OrderStatus) {
            const supabase = useSupabaseClient<Database>()

            if (!this.activeOrder) return

            // If offline, queue the action
            if (!this.isOnline) {
                this.queueOfflineAction('status_update', this.activeOrder.id, { status: newStatus })

                const toast = useToast()
                toast.add({
                    title: 'Offline Mode',
                    description: 'Action saved. Will sync when you are back online.',
                    color: 'amber'
                } as any)
                return
            }

            this.loading = true
            try {
                const updateData: any = { status: newStatus }

                // Set appropriate timestamps
                if (newStatus === 'picked_up') {
                    updateData.picked_up_at = new Date().toISOString()
                } else if (newStatus === 'arrived') {
                    updateData.arrived_at = new Date().toISOString()
                }

                const { error } = await (supabase
                    .from('orders')
                    .update as any)(updateData)
                    .eq('id', this.activeOrder.id)

                if (error) throw error

                // Update local state
                this.activeOrder.status = newStatus
                if (newStatus === 'picked_up') {
                    this.activeOrder.picked_up_at = new Date().toISOString()
                } else if (newStatus === 'arrived') {
                    this.activeOrder.arrived_at = new Date().toISOString()
                }

                const toast = useToast()
                toast.add({
                    title: 'Status Updated',
                    description: this.getStatusMessage(newStatus),
                    color: 'green'
                } as any)

            } catch (err: any) {
                this.error = err.message

                const toast = useToast()
                toast.add({
                    title: 'Update Failed',
                    description: err.message,
                    color: 'red'
                } as any)
            } finally {
                this.loading = false
            }
        },

        // Verify delivery PIN and complete delivery
        async verifyDeliveryPIN(pin: string): Promise<'success' | 'failed' | 'queued'> {
            const supabase = useSupabaseClient<Database>()

            if (!this.activeOrder) return 'failed'

            // If offline, queue the action
            if (!this.isOnline) {
                this.queueOfflineAction('delivery_confirm', this.activeOrder.id, { pin })

                const toast = useToast()
                toast.add({
                    title: 'Offline Mode',
                    description: 'Confirmation saved. Will sync when you are back online.',
                    color: 'amber'
                } as any)
                return 'queued'
            }

            this.loading = true
            try {
                const { data, error } = await (supabase.rpc as any)('verify_delivery_pin', {
                    p_order_id: this.activeOrder.id,
                    p_pin: pin
                })

                if (error) throw error

                const result = data as any

                if (result.success) {
                    // Clear active order
                    this.activeOrder = null
                    this.driverStatus = 'available'

                    await (supabase
                        .from('profiles')
                        .update as any)({ driver_status: 'available' })
                        .eq('id', (useSupabaseUser().value as any)?.id)

                    // Refresh order history
                    await this.fetchOrderHistory()

                    const toast = useToast()
                    toast.add({
                        title: '✅ Delivery Confirmed',
                        description: 'Order completed successfully. Great job!',
                        color: 'green'
                    } as any)

                    return 'success'
                } else {
                    const toast = useToast()
                    toast.add({
                        title: 'Incorrect PIN',
                        description: result.message || 'Please verify the PIN with the customer',
                        color: 'red'
                    } as any)

                    return 'failed'
                }

            } catch (err: any) {
                this.error = err.message

                const toast = useToast()
                toast.add({
                    title: 'Verification Failed',
                    description: err.message,
                    color: 'red'
                } as any)

                return 'failed'
            } finally {
                this.loading = false
            }
        },

        // Setup realtime subscription for order updates
        setupRealtimeSubscription() {
            const supabase = useSupabaseClient<Database>()
            const user = useSupabaseUser()
            const userId = (user.value as any)?.id || (user.value as any)?.sub
            if (!userId) return

            // Cleanup existing channel
            if (this.realtimeChannel) {
                supabase.removeChannel(this.realtimeChannel as any)
            }

            // Subscribe to orders assigned to this driver
            this.realtimeChannel = supabase
                .channel('driver-orders')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `driver_id=eq.${userId}`
                    },
                    async (payload) => {
                        console.log('Driver order update:', payload)

                        // Refresh active order
                        await this.fetchActiveOrder()

                        // Show notification for new assignment
                        if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'assigned') {
                            const toast = useToast()
                            toast.add({
                                title: '🚗 New Delivery Assignment',
                                description: 'You have been assigned a new delivery',
                                color: 'blue'
                            } as any)
                        }
                    }
                )
                .subscribe()
        },

        // Setup offline/online detection
        setupOfflineDetection() {
            if (typeof window === 'undefined') return

            window.addEventListener('online', () => {
                this.isOnline = true
                this.syncOfflineActions()

                const toast = useToast()
                toast.add({
                    title: '🌐 Back Online',
                    description: 'Syncing your offline actions...',
                    color: 'green'
                } as any)
            })

            window.addEventListener('offline', () => {
                this.isOnline = false

                const toast = useToast()
                toast.add({
                    title: '📡 Offline Mode',
                    description: 'Your actions will be saved and synced when you are back online',
                    color: 'amber'
                } as any)
            })
        },

        // Queue offline action
        queueOfflineAction(type: OfflineAction['type'], orderId: string, data: any) {
            const action: OfflineAction = {
                id: `${Date.now()}-${Math.random()}`,
                type,
                orderId,
                data,
                timestamp: Date.now()
            }

            this.offlineActions.push(action)

            // Persist to localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('driver-offline-actions', JSON.stringify(this.offlineActions))
            }
        },

        // Sync offline actions when back online
        async syncOfflineActions() {
            if (!this.isOnline || this.offlineActions.length === 0) return

            const supabase = useSupabaseClient<Database>()
            const actionsToSync = [...this.offlineActions]

            for (const action of actionsToSync) {
                try {
                    if (action.type === 'status_update') {
                        await (supabase
                            .from('orders')
                            .update as any)({ status: action.data.status })
                            .eq('id', action.orderId)
                    } else if (action.type === 'delivery_confirm') {
                        await (supabase.rpc as any)('verify_delivery_pin', {
                            p_order_id: action.orderId,
                            p_pin: action.data.pin
                        })
                    }

                    // Remove synced action
                    this.offlineActions = this.offlineActions.filter(a => a.id !== action.id)

                } catch (err) {
                    console.error('Failed to sync offline action:', err)
                }
            }

            // Update localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('driver-offline-actions', JSON.stringify(this.offlineActions))
            }

            // Refresh active order after sync
            await this.fetchActiveOrder()
        },

        // Load offline actions from localStorage
        loadOfflineActions() {
            if (typeof localStorage === 'undefined') return

            const stored = localStorage.getItem('driver-offline-actions')
            if (stored) {
                try {
                    this.offlineActions = JSON.parse(stored)
                } catch (err) {
                    console.error('Failed to load offline actions:', err)
                }
            }
        },

        // Helper: Get status message
        getStatusMessage(status: OrderStatus): string {
            switch (status) {
                case 'assigned':
                    return 'Order assigned to you'
                case 'picked_up':
                    return 'Order picked up from store'
                case 'arrived':
                    return 'You have arrived at customer location'
                case 'delivered':
                    return 'Order delivered successfully'
                default:
                    return 'Status updated'
            }
        },

        // Cleanup
        cleanup() {
            const supabase = useSupabaseClient<Database>()

            if (this.realtimeChannel) {
                supabase.removeChannel(this.realtimeChannel as any)
                this.realtimeChannel = null
            }
        }
    }
})
