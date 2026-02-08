export type OrderItem = {
  product_id: string
  quantity: number
  price: number
  name: string
  image_url?: string
}

export type OrderStatus = 
  | 'pending' 
  | 'awaiting_call'
  | 'processing' 
  | 'paid' 
  | 'confirmed' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded'

export type DeliveryDetails = {
  address?: {
    area?: string
    street?: string
    houseNumber?: string
    landmark?: string
  }
  contactPhone?: string
  deliveryZone?: string
}

export type Order = {
  id: string
  user_id: string
  store_id: string
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  total_amount: number
  status: OrderStatus
  delivery_method: 'pickup' | 'delivery'
  delivery_details: DeliveryDetails
  paystack_reference?: string
  paystack_transaction_id?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  paid_at?: string
  delivered_at?: string
}

export type OrderStatusUpdate = {
  orderId: string
  oldStatus: OrderStatus
  newStatus: OrderStatus
  updatedAt: string
}

export const useUserOrders = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const userLoading = computed(() => user.value === undefined) // Supabase user starts as undefined while loading

  // Reactive state
  const orders = ref<Order[]>([])
  const activeOrders = ref<Order[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannel = ref<any>(null)
  const lastOrder = ref<Order | null>(null)

  /**
   * Fetch all orders for the current user
   */
  const fetchOrders = async () => {
    pending.value = true
    error.value = null

    // Wait for user to load if it's still undefined (auth not ready yet)
    if (userLoading.value) {
      await new Promise(resolve => {
        const unwatch = watch(user, (newUser) => {
          if (newUser !== undefined) {
            unwatch()
            resolve(newUser)
          }
        })
        // Timeout after 5 seconds
        setTimeout(() => {
          unwatch()
          resolve(null)
        }, 5000)
      })
    }

    const userId = user.value?.id || user.value?.sub
    if (!userId) {
      error.value = 'User not authenticated'
      pending.value = false
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      orders.value = (data || []) as Order[]
      
      // Set last order
      lastOrder.value = orders.value[0] || null
      
      // Filter active orders (processing, paid, confirmed, shipped, awaiting_call)
      activeOrders.value = orders.value.filter(order => 
        ['processing', 'paid', 'confirmed', 'shipped', 'awaiting_call'].includes(order.status)
      )
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch orders'
      console.error('Error fetching orders:', err)
    } finally {
      pending.value = false
    }
  }

  /**
   * Fetch a single order by ID
   */
  const fetchOrderById = async (orderId: string): Promise<Order | null> => {
    if (!user.value?.id) return null

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.value.id)
        .single()

      if (fetchError) throw fetchError

      return data as Order
    } catch (err: any) {
      console.error('Error fetching order:', err)
      return null
    }
  }

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status: OrderStatus) => {
    const badges: Record<OrderStatus, { label: string; color: string; bg: string }> = {
      pending: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100' },
      awaiting_call: { label: 'Awaiting Call', color: 'text-amber-700', bg: 'bg-amber-100' },
      processing: { label: 'Processing', color: 'text-blue-700', bg: 'bg-blue-100' },
      paid: { label: 'Paid', color: 'text-emerald-700', bg: 'bg-emerald-100' },
      confirmed: { label: 'Confirmed', color: 'text-red-700', bg: 'bg-red-100' },
      shipped: { label: 'In Transit', color: 'text-indigo-700', bg: 'bg-indigo-100' },
      delivered: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-100' },
      cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
      refunded: { label: 'Refunded', color: 'text-gray-700', bg: 'bg-gray-100' }
    }
    return badges[status] || badges.pending
  }

  /**
   * Format order date
   */
  const formatOrderDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  /**
   * Format order time
   */
  const formatOrderTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Reorder items from a previous order
   */
  const reorderItems = async (order: Order): Promise<boolean> => {
    if (!order.items || order.items.length === 0) return false

    try {
      // This will be implemented by calling the cart store's addItem method
      // Return the items to be added
      return true
    } catch (err: any) {
      console.error('Error reordering:', err)
      return false
    }
  }

  /**
   * Subscribe to real-time order status updates
   */
  const subscribeToOrderUpdates = (
    onStatusChange?: (update: OrderStatusUpdate) => void
  ) => {
    if (!user.value?.id) return

    // Clean up existing subscription
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
    }

    realtimeChannel.value = supabase
      .channel(`user-orders:${user.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.value.id}`
        },
        (payload: any) => {
          const { new: newData, old: oldData } = payload

          if (newData.status !== oldData.status) {
            const update: OrderStatusUpdate = {
              orderId: newData.id,
              oldStatus: oldData.status,
              newStatus: newData.status,
              updatedAt: newData.updated_at
            }

            // Update local state
            const orderIndex = orders.value.findIndex(o => o.id === newData.id)
            if (orderIndex !== -1) {
              orders.value[orderIndex]!.status = newData.status
              orders.value[orderIndex]!.updated_at = newData.updated_at
            }

            // Update active orders
            activeOrders.value = orders.value.filter(order => 
              ['processing', 'paid', 'confirmed', 'shipped'].includes(order.status)
            )

            // Notify callback
            onStatusChange?.(update)
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Order realtime subscription status:', status)
      })

    return realtimeChannel.value
  }

  /**
   * Unsubscribe from order updates
   */
  const unsubscribeFromOrderUpdates = () => {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  return {
    orders,
    activeOrders,
    lastOrder,
    pending,
    error,
    fetchOrders,
    fetchOrderById,
    getStatusBadge,
    formatOrderDate,
    formatOrderTime,
    reorderItems,
    subscribeToOrderUpdates,
    unsubscribeFromOrderUpdates
  }
}
