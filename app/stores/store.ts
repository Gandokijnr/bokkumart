import { defineStore } from 'pinia'

export type OperatingHours = {
  open: string
  close: string
  isOpen: boolean
}

export type StoreOperatingHours = {
  monday: OperatingHours
  tuesday: OperatingHours
  wednesday: OperatingHours
  thursday: OperatingHours
  friday: OperatingHours
  saturday: OperatingHours
  sunday: OperatingHours
}

export interface Store {
  id: string
  name: string
  code: string
  address: string
  city: string
  state: string
  latitude: number
  longitude: number
  phone?: string
  email?: string
  operating_hours: StoreOperatingHours
  pickup_instructions?: string
  delivery_radius_km: number
  base_delivery_fee: number
  per_km_delivery_fee: number
  is_active: boolean
  is_flagship: boolean
  features: string[]
  created_at: string
  updated_at: string
}

export interface StoreSelection {
  store: Store | null
  deliveryAddress: DeliveryAddress | null
  shoppingMode: 'delivery' | 'pickup'
  loading: boolean
}

export interface DeliveryAddress {
  name: string
  address: string
  latitude: number
  longitude: number
  phone?: string
  instructions?: string
  isDefault?: boolean
}

export const useStoreStore = defineStore('store', {
  state: (): StoreSelection => ({
    store: null,
    deliveryAddress: null,
    shoppingMode: 'delivery',
    loading: false
  }),

  getters: {
    selectedStore: (state) => state.store,
    isStoreSelected: (state) => state.store !== null,
    storeCode: (state) => state.store?.code || null,
    storeName: (state) => state.store?.name || 'Select Store',
    currentDeliveryAddress: (state) => state.deliveryAddress,
    isDeliveryMode: (state) => state.shoppingMode === 'delivery',
    isPickupMode: (state) => state.shoppingMode === 'pickup',
    
    // Check if store is currently open
    isStoreOpen: (state): boolean => {
      if (!state.store) return false
      
      const now = new Date()
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const hours = state.store.operating_hours[dayOfWeek as keyof StoreOperatingHours]
      
      if (!hours || !hours.isOpen) return false
      
      const currentTime = now.getHours() * 60 + now.getMinutes()
      const [openHour, openMin] = hours.open.split(':').map(Number)
      const [closeHour, closeMin] = hours.close.split(':').map(Number)
      const openTime = openHour! * 60 + openMin!
      const closeTime = closeHour! * 60 + closeMin!
      
      return currentTime >= openTime && currentTime <= closeTime
    },
    
    // Get today's operating hours string
    todayHours: (state): string => {
      if (!state.store) return ''
      
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const hours = state.store.operating_hours[dayOfWeek as keyof StoreOperatingHours]
      
      if (!hours || !hours.isOpen) return 'Closed today'
      return `${hours.open} - ${hours.close}`
    }
  },

  actions: {
    setStore(store: Store) {
      this.store = store
      this.saveToLocalStorage()
    },

    clearStore() {
      this.store = null
      this.deliveryAddress = null
      this.saveToLocalStorage()
    },

    setDeliveryAddress(address: DeliveryAddress | null) {
      this.deliveryAddress = address
      this.saveToLocalStorage()
    },

    setShoppingMode(mode: 'delivery' | 'pickup') {
      this.shoppingMode = mode
      this.saveToLocalStorage()
    },

    saveToLocalStorage() {
      if (import.meta.client) {
        localStorage.setItem('ha_selected_store', JSON.stringify({
          store: this.store,
          deliveryAddress: this.deliveryAddress,
          shoppingMode: this.shoppingMode
        }))
      }
    },

    loadFromLocalStorage() {
      if (import.meta.client) {
        const stored = localStorage.getItem('ha_selected_store')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            this.store = parsed.store
            this.deliveryAddress = parsed.deliveryAddress || null
            this.shoppingMode = parsed.shoppingMode || 'delivery'
          } catch {
            console.error('Failed to parse stored store selection')
          }
        }
      }
    },

    // Sync with Supabase if user is logged in
    async syncWithSupabase(supabase: any) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_store_preferences')
        .upsert({
          user_id: user.id,
          last_selected_store_id: this.store?.id || null,
          preferred_delivery_address: this.deliveryAddress
        }, { onConflict: 'user_id' })
        .select()

      if (error) console.error('Failed to sync store preferences:', error)
    }
  }
})
