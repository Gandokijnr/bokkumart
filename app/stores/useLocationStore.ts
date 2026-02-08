import { defineStore } from 'pinia'

export interface Store {
  id: string
  name: string
  code: string
  address: string
  city: string
  latitude: number
  longitude: number
  phone?: string
  base_delivery_fee: number
  is_flagship: boolean
}

export interface UserLocation {
  area?: string
  street?: string
  houseNumber?: string
  landmark?: string
  contactPhone: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export const useLocationStore = defineStore('location', {
  state: () => ({
    selectedStoreId: null as string | null,
    selectedStoreName: '',
    stores: [] as Store[],
    userLocation: null as UserLocation | null,
    isLoading: false,
    error: null as string | null
  }),

  getters: {
    currentStore: (state): Store | null => {
      return state.stores.find(s => s.id === state.selectedStoreId) || null
    },

    isStoreSelected: (state): boolean => {
      return !!state.selectedStoreId
    }
  },

  actions: {
    async fetchStores(supabase: any) {
      this.isLoading = true
      this.error = null

      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, code, address, city, latitude, longitude, phone, base_delivery_fee, is_flagship')
          .eq('is_active', true)
          .order('is_flagship', { ascending: false })
          .order('name')

        if (error) throw error

        this.stores = data || []

        // Auto-select flagship store if none selected
        if (!this.selectedStoreId && this.stores.length > 0) {
          const flagship = this.stores.find(s => s.is_flagship)
          if (flagship) {
            this.selectStore(flagship.id, flagship.name)
          } else {
            this.selectStore(this.stores[0].id, this.stores[0]?.name || '')
          }
        }
      } catch (err: any) {
        this.error = err.message || 'Failed to load stores'
        console.error('Error fetching stores:', err)
      } finally {
        this.isLoading = false
      }
    },

    selectStore(storeId: string, storeName: string) {
      this.selectedStoreId = storeId
      this.selectedStoreName = storeName

      // Persist to localStorage for session continuity
      if (typeof window !== 'undefined') {
        localStorage.setItem('ha_selected_store', JSON.stringify({
          id: storeId,
          name: storeName
        }))
      }
    },

    loadStoredSelection() {
      if (typeof window === 'undefined') return

      try {
        const stored = localStorage.getItem('ha_selected_store')
        if (stored) {
          const parsed = JSON.parse(stored)
          this.selectedStoreId = parsed.id
          this.selectedStoreName = parsed.name
        }
      } catch {
        // Ignore localStorage errors
      }
    },

    setUserLocation(location: UserLocation) {
      this.userLocation = location
    },

    clearSelection() {
      this.selectedStoreId = null
      this.selectedStoreName = ''
      this.userLocation = null

      if (typeof window !== 'undefined') {
        localStorage.removeItem('ha_selected_store')
      }
    }
  }
})
