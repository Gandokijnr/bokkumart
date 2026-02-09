import { defineStore } from 'pinia'
import type { Database } from '../types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
  store_id: string
  store_name: string
  image_url?: string
  max_quantity: number
  digital_buffer: number
  options?: Record<string, string>
}

export interface DeliveryDetails {
  method: 'pickup' | 'delivery'
  address?: {
    area: string
    street: string
    houseNumber: string
    landmark?: string
  }
  store_address?: string
  contactPhone: string
  deliveryZone?: string
}

export interface ReservedItem {
  productId: string
  quantity: number
  expiresAt: number
}

export interface CartState {
  items: CartItem[]
  currentStoreId: string | null
  currentStoreName: string
  deliveryDetails: DeliveryDetails | null
  selectedAddress: string | null
  reservedItems: ReservedItem[]
  reservationExpiry: number | null
  isLoading: boolean
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    currentStoreId: null,
    currentStoreName: '',
    deliveryDetails: null,
    selectedAddress: null,
    reservedItems: [],
    reservationExpiry: null,
    isLoading: false
  }),

  getters: {
    cartCount: (state): number => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0)
    },

    cartSubtotal: (state): number => {
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    },

    deliveryFee: (state): number => {
      if (!state.deliveryDetails || state.deliveryDetails.method === 'pickup') {
        return 0
      }
      const zone = state.deliveryDetails.deliveryZone
      const zoneFees: Record<string, number> = {
        'ikoyi-vi': 1500,
        'lekki-phase1': 1500,
        'lekki-phase2': 2000,
        'ajah': 2500,
        'yaba-surulere': 1200,
        'ikeja': 1500,
        'gbagada': 1200,
        'ogudu': 1200,
        'maryland': 1200,
        'ogba': 1500,
        'magodo': 1500,
        'island': 1800,
        'mainland': 1200
      }
      return zone ? (zoneFees[zone] || 1500) : 1500
    },

    cartTotal(): number {
      return this.cartSubtotal + this.deliveryFee
    },

    canAddFromStore: (state) => (storeId: string): boolean => {
      if (state.items.length === 0) return true
      return state.currentStoreId === storeId
    },

    hasDifferentStoreItems: (state) => (storeId: string): boolean => {
      return state.items.length > 0 && state.currentStoreId !== storeId
    },

    isReserved: (state) => (productId: string): boolean => {
      const now = Date.now()
      return state.reservedItems.some(
        r => r.productId === productId && r.expiresAt > now
      )
    },

    reservationTimeRemaining: (state): number => {
      if (!state.reservationExpiry) return 0
      return Math.max(0, state.reservationExpiry - Date.now())
    }
  },

  actions: {
    /**
     * Load cart from database (call on login/app start)
     */
    async loadFromDatabase(supabase: SupabaseClient<Database>): Promise<boolean> {
      this.isLoading = true
      try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) {
          this.isLoading = false
          return false
        }

        // Get user's cart with items
        const { data: cart, error } = await supabase
          .from('carts')
          .select(`
            id,
            store_id,
            store_name,
            delivery_method,
            delivery_address,
            contact_phone,
            delivery_zone,
            cart_items (
              product_id,
              store_id,
              name,
              price,
              quantity,
              max_quantity,
              digital_buffer,
              image_url,
              options
            )
          `)
          .eq('user_id', user.user.id)
          .maybeSingle() as { data: {
            id: string
            store_id: string
            store_name: string | null
            delivery_method: string | null
            delivery_address: any
            contact_phone: string | null
            delivery_zone: string | null
            cart_items: {
              product_id: string
              store_id: string
              name: string
              price: number
              quantity: number
              max_quantity: number
              digital_buffer: number
              image_url: string | null
              options: any
            }[] | null
          } | null, error: any }

        if (error) {
          console.error('Error loading cart:', error)
          this.isLoading = false
          return false
        }

        if (cart) {
          this.items = (cart.cart_items || []).map(item => ({
            id: item.product_id,
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            store_id: item.store_id,
            store_name: cart.store_name || '',
            image_url: item.image_url || undefined,
            max_quantity: item.max_quantity,
            digital_buffer: item.digital_buffer,
            options: item.options || undefined
          }))
          this.currentStoreId = cart.store_id
          this.currentStoreName = cart.store_name || ''

          if (cart.delivery_method) {
            this.deliveryDetails = {
              method: cart.delivery_method as 'pickup' | 'delivery',
              address: cart.delivery_address || undefined,
              contactPhone: cart.contact_phone || '',
              deliveryZone: cart.delivery_zone || undefined
            }
          }
        }

        this.isLoading = false
        return true
      } catch (err) {
        console.error('Error loading cart from database:', err)
        this.isLoading = false
        return false
      }
    },

    /**
     * Save cart to database (call after any cart modification)
     */
    async saveToDatabase(supabase: SupabaseClient<Database>): Promise<boolean> {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return false

      if (this.items.length === 0) {
        // Delete cart from DB if empty
        await supabase.from('carts').delete().eq('user_id', user.user.id)
        return true
      }

      try {
        // Prepare cart data
        const cartData: Database['public']['Tables']['carts']['Insert'] = {
          user_id: user.user.id,
          store_id: this.currentStoreId,
          store_name: this.currentStoreName || null,
          delivery_method: this.deliveryDetails?.method ?? null,
          delivery_address: this.deliveryDetails?.address ?? null,
          contact_phone: this.deliveryDetails?.contactPhone ?? null,
          delivery_zone: this.deliveryDetails?.deliveryZone ?? null,
          updated_at: new Date().toISOString()
        }

        // Upsert cart
        const { data: cart } = await (supabase
          .from('carts') as any)
          .upsert(cartData, { onConflict: 'user_id' })
          .select('id')
          .single() as { data: { id: string } | null }

        if (!cart) return false

        const cartId = cart.id

        // Delete old items and insert new ones
        await supabase.from('cart_items').delete().eq('cart_id', cartId)
        
        const itemsToInsert = this.items.map(item => ({
          cart_id: cartId,
          product_id: item.product_id,
          store_id: item.store_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          max_quantity: item.max_quantity,
          digital_buffer: item.digital_buffer,
          image_url: item.image_url,
          options: item.options
        }))

        const { error } = await (supabase.from('cart_items').insert(itemsToInsert as any))

        if (error) {
          console.error('Error saving cart items:', error)
          return false
        }

        return true
      } catch (err) {
        console.error('Error saving cart to database:', err)
        return false
      }
    },

    /**
     * Add item to cart with real-time stock validation
     * Includes store branch locking and quantity limits
     */
    async addItem(
      product: {
        id: string
        product_id: string
        name: string
        price: number
        store_id: string
        store_name: string
        image_url?: string
        availableStock: number
        digitalBuffer: number
      },
      quantity: number = 1,
      options?: {
        checkStockFn?: (productId: string, storeId: string) => Promise<{ available: number; isAvailable: boolean }>
        onStoreMismatch?: (currentStore: string, newStore: string) => void
        onStockOut?: (productName: string) => void
      }
    ): Promise<{ success: boolean; error?: string; requiresStoreSwitch?: boolean }> {
      // 1. BRANCH LOCKING: Check if cart has items from different store
      if (this.items.length > 0 && this.currentStoreId !== product.store_id) {
        if (options?.onStoreMismatch) {
          options.onStoreMismatch(this.currentStoreName, product.store_name)
        }
        return {
          success: false,
          error: `You can only order from one HomeAffairs branch at a time. Your cart contains items from ${this.currentStoreName}. Clear cart to switch to ${product.store_name}?`,
          requiresStoreSwitch: true
        }
      }

      // 2. REAL-TIME STOCK CHECK: Verify stock is still available
      let currentStock = product.availableStock
      if (options?.checkStockFn) {
        const stockCheck = await options.checkStockFn(product.product_id, product.store_id)
        if (!stockCheck.isAvailable) {
          if (options?.onStockOut) {
            options.onStockOut(product.name)
          }
          return {
            success: false,
            error: `Sorry, ${product.name} just went out of stock at ${product.store_name}!`
          }
        }
        currentStock = stockCheck.available
      }

      // 3. Check if requested quantity exceeds available stock
      const existingItem = this.items.find(i => i.id === product.id)
      const currentQty = existingItem?.quantity || 0
      const newQty = currentQty + quantity

      if (newQty > currentStock) {
        return {
          success: false,
          error: `Only ${currentStock} units available. You have ${currentQty} in cart.`
        }
      }

      // 4. Set store context if this is the first item
      if (this.items.length === 0) {
        this.currentStoreId = product.store_id
        this.currentStoreName = product.store_name
      }

      // 5. Add or update item
      if (existingItem) {
        existingItem.quantity = newQty
      } else {
        this.items.push({
          ...product,
          quantity,
          max_quantity: currentStock,
          digital_buffer: product.digitalBuffer
        })
      }

      return { success: true }
    },

    addToCart(item: Omit<CartItem, 'quantity'>, quantity: number = 1): { success: boolean; error?: string } {
      if (this.items.length > 0 && this.currentStoreId !== item.store_id) {
        return {
          success: false,
          error: `Cannot add items from ${item.store_name}. Your cart contains items from ${this.currentStoreName}. Please clear your cart or checkout first.`
        }
      }

      const existingItem = this.items.find(i => i.id === item.id)
      const currentQty = existingItem?.quantity || 0
      const newQty = currentQty + quantity

      if (newQty > item.max_quantity) {
        return {
          success: false,
          error: `Only ${item.max_quantity} items available in stock. You currently have ${currentQty} in cart.`
        }
      }

      if (this.items.length === 0) {
        this.currentStoreId = item.store_id
        this.currentStoreName = item.store_name
      }

      if (existingItem) {
        existingItem.quantity = newQty
      } else {
        this.items.push({ ...item, quantity })
      }

      return { success: true }
    },

    updateQuantity(itemId: string, quantity: number): { success: boolean; error?: string } {
      const item = this.items.find(i => i.id === itemId)
      if (!item) {
        return { success: false, error: 'Item not found in cart' }
      }

      if (quantity > item.max_quantity) {
        return {
          success: false,
          error: `Only ${item.max_quantity} items available in stock`
        }
      }

      if (quantity <= 0) {
        this.removeItem(itemId)
        return { success: true }
      }

      item.quantity = quantity
      return { success: true }
    },

    removeItem(itemId: string) {
      const index = this.items.findIndex(i => i.id === itemId)
      if (index > -1) {
        this.items.splice(index, 1)
      }

      if (this.items.length === 0) {
        this.clearCart()
        return
      }
    },

    clearCart() {
      this.items = []
      this.currentStoreId = null
      this.currentStoreName = ''
      this.deliveryDetails = null
      this.clearReservation()
    },

    setDeliveryDetails(details: DeliveryDetails) {
      this.deliveryDetails = details
    },

    async createReservation(supabase: any): Promise<boolean> {
      try {
        const reservationDuration = 10 * 60 * 1000
        const expiresAt = Date.now() + reservationDuration

        for (const item of this.items) {
          const { error } = await supabase.rpc('reserve_stock', {
            p_product_id: item.product_id,
            p_store_id: item.store_id,
            p_quantity: item.quantity,
            p_expires_at: new Date(expiresAt).toISOString()
          })

          if (error) {
            console.error('Failed to reserve stock:', error)
            await this.cancelReservation(supabase)
            return false
          }

          this.reservedItems.push({
            productId: item.product_id,
            quantity: item.quantity,
            expiresAt
          })
        }

        this.reservationExpiry = expiresAt
        return true
      } catch (err) {
        console.error('Reservation error:', err)
        return false
      }
    },

    async cancelReservation(supabase: any) {
      try {
        for (const item of this.reservedItems) {
          await supabase.rpc('release_stock', {
            p_product_id: item.productId,
            p_quantity: item.quantity
          })
        }
      } catch (err) {
        console.error('Error releasing reservation:', err)
      } finally {
        this.clearReservation()
      }
    },

    clearReservation() {
      this.reservedItems = []
      this.reservationExpiry = null
    },

    switchStore(newStoreId: string, newStoreName: string): { canSwitch: boolean; requiresClear: boolean } {
      if (this.items.length === 0) {
        return { canSwitch: true, requiresClear: false }
      }
      if (this.currentStoreId === newStoreId) {
        return { canSwitch: true, requiresClear: false }
      }
      return { canSwitch: true, requiresClear: true }
    },

    confirmStoreSwitch(newStoreId: string, newStoreName: string) {
      this.clearCart()
      this.currentStoreId = newStoreId
      this.currentStoreName = newStoreName
    },

    getCheckoutData() {
      return {
        items: this.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        store_id: this.currentStoreId,
        store_name: this.currentStoreName,
        subtotal: this.cartSubtotal,
        delivery_fee: this.deliveryFee,
        total: this.cartTotal,
        delivery_details: this.deliveryDetails
      }
    }
  }
})
