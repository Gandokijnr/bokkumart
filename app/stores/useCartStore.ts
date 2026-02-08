import { defineStore } from 'pinia'

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
}

const STORAGE_KEY = 'homeaffairs_cart'

function loadFromStorage(): Partial<CartState> | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    const parsed = JSON.parse(data)
    if (parsed.reservationExpiry && parsed.reservationExpiry < Date.now()) {
      parsed.reservedItems = []
      parsed.reservationExpiry = null
    }
    return parsed
  } catch {
    return null
  }
}

function saveToStorage(state: CartState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.items,
      currentStoreId: state.currentStoreId,
      currentStoreName: state.currentStoreName,
      deliveryDetails: state.deliveryDetails,
      selectedAddress: state.selectedAddress
    }))
  } catch (err) {
    console.error('Failed to save cart:', err)
  }
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => {
    const saved = loadFromStorage()
    return {
      items: saved?.items || [],
      currentStoreId: saved?.currentStoreId || null,
      currentStoreName: saved?.currentStoreName || '',
      deliveryDetails: saved?.deliveryDetails || null,
      selectedAddress: saved?.selectedAddress || null,
      reservedItems: [],
      reservationExpiry: null
    }
  },

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

      saveToStorage(this.$state)
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

      saveToStorage(this.$state)
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
      saveToStorage(this.$state)
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

      saveToStorage(this.$state)
    },

    clearCart() {
      this.items = []
      this.currentStoreId = null
      this.currentStoreName = ''
      this.deliveryDetails = null
      this.clearReservation()
      saveToStorage(this.$state)
    },

    setDeliveryDetails(details: DeliveryDetails) {
      this.deliveryDetails = details
      saveToStorage(this.$state)
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
      saveToStorage(this.$state)
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
