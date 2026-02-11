import { useStoreStore } from '~/stores/store'
import { useStoreLocator } from './useStoreLocator'

export interface ProximityDetectionOptions {
  showModalOnLoad?: boolean
  fallbackArea?: string
  autoSelectNearest?: boolean
}

export const useProximityDetection = () => {
  const storeStore = useStoreStore()
  const storeLocator = useStoreLocator()
  
  const detecting = ref(false)
  const showStoreModal = ref(false)
  const nearestStore = ref<Awaited<ReturnType<typeof storeLocator.getNearestStoreSuggestion>>>(null)

  // Initialize proximity detection on app load
  const initialize = async (options: ProximityDetectionOptions = {}) => {
    const { 
      showModalOnLoad = true, 
      fallbackArea = 'ikeja',
      autoSelectNearest = true 
    } = options

    // Load saved store preference
    storeStore.loadFromLocalStorage()

    // If store already selected, we're done
    if (storeStore.isStoreSelected) {
      return { store: storeStore.selectedStore, detected: false }
    }

    // Fetch stores first
    await storeLocator.fetchStores()
    
    if (storeLocator.stores.value.length === 0) {
      return { store: null, detected: false, error: 'No stores available' }
    }

    // Try to detect nearest store
    detecting.value = true
    
    try {
      const nearest = await storeLocator.getNearestStoreSuggestion(fallbackArea)
      nearestStore.value = nearest

      if (nearest && autoSelectNearest) {
        // Auto-select the nearest store for better UX
        storeStore.setStore(nearest)
        // Store selection is now local-only, no need to sync with supabase
        
        detecting.value = false
        return { store: nearest, detected: true }
      }

      // If no auto-select, show the store selection modal
      if (showModalOnLoad) {
        showStoreModal.value = true
      }

      detecting.value = false
      return { store: nearest, detected: !!nearest }
    } catch (e) {
      detecting.value = false
      
      // Show modal if detection failed
      if (showModalOnLoad) {
        showStoreModal.value = true
      }
      
      return { 
        store: null, 
        detected: false, 
        error: e instanceof Error ? e.message : 'Failed to detect location' 
      }
    }
  }

  // Manually trigger store selection modal
  const openStoreSelector = () => {
    showStoreModal.value = true
  }

  // Close store selection modal
  const closeStoreSelector = () => {
    showStoreModal.value = false
  }

  // Handle store selection from modal
  const handleStoreSelected = (store: any) => {
    storeStore.setStore(store)
    showStoreModal.value = false
  }

  // Get nearby stores for display
  const getNearbyStores = (maxDistanceKm: number = 20) => {
    if (!storeLocator.userLocation.value) return []
    
    return storeLocator.getStoresInRange(
      storeLocator.stores.value,
      storeLocator.userLocation.value,
      maxDistanceKm
    )
  }

  return {
    detecting,
    showStoreModal,
    nearestStore,
    initialize,
    openStoreSelector,
    closeStoreSelector,
    handleStoreSelected,
    getNearbyStores
  }
}

// Plugin to run proximity detection on app initialization
export const useProximityDetectionPlugin = () => {
  const { initialize, showStoreModal } = useProximityDetection()
  
  onMounted(async () => {
    // Small delay to let app settle
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await initialize({
      showModalOnLoad: true,
      autoSelectNearest: true
    })
  })

  return {
    showStoreModal
  }
}
