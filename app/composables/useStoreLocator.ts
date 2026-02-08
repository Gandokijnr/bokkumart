import type { Store } from '~/stores/store'

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface StoreWithDistance extends Store {
  distanceKm: number
  distanceFormatted: string
  estimatedDeliveryTime: string
}

// Haversine formula to calculate distance between two coordinates in km
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 100) / 100 // Round to 2 decimal places
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

// Estimate delivery time based on distance (Lagos traffic adjusted)
export function estimateDeliveryTime(distanceKm: number): string {
  // Base: 30 mins prep + 3 mins per km (accounting for Lagos traffic)
  const minutes = 30 + (distanceKm * 3)
  
  if (minutes < 60) {
    return `${Math.ceil(minutes)} mins`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = Math.ceil(minutes % 60)
  return remainingMins > 0 ? `${hours}hr ${remainingMins}m` : `${hours}hr`
}

// Get user's current position using browser Geolocation API
export function getUserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        let message = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        reject(new Error(message))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Accept positions up to 1 minute old
      }
    )
  })
}

// Calculate distances from user to all stores and sort by proximity
export function calculateStoreDistances(
  stores: Store[],
  userLocation: Coordinates
): StoreWithDistance[] {
  const storesWithDistance = stores.map(store => {
    const distanceKm = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      store.latitude,
      store.longitude
    )
    
    return {
      ...store,
      distanceKm,
      distanceFormatted: formatDistance(distanceKm),
      estimatedDeliveryTime: estimateDeliveryTime(distanceKm)
    }
  })
  
  return storesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm)
}

// Find nearest store within delivery radius
export function findNearestStore(
  stores: Store[],
  userLocation: Coordinates
): StoreWithDistance | null {
  const sortedStores = calculateStoreDistances(stores, userLocation)
  const nearest = sortedStores[0]
  
  if (!nearest || nearest.distanceKm > nearest.delivery_radius_km) {
    return null
  }
  
  return nearest
}

// Get stores within delivery range
export function getStoresInRange(
  stores: Store[],
  userLocation: Coordinates,
  maxDistanceKm?: number
): StoreWithDistance[] {
  const storesWithDistance = calculateStoreDistances(stores, userLocation)
  return storesWithDistance.filter(store => 
    maxDistanceKm ? store.distanceKm <= maxDistanceKm : store.distanceKm <= store.delivery_radius_km
  )
}

// Check if a specific location is within a store's delivery radius
export function isWithinDeliveryRadius(
  store: Store,
  userLocation: Coordinates
): boolean {
  const distance = calculateDistance(
    store.latitude,
    store.longitude,
    userLocation.latitude,
    userLocation.longitude
  )
  return distance <= store.delivery_radius_km
}

// Lagos fallback coordinates for major areas (used if geolocation fails)
export const LAGOS_AREA_COORDINATES: Record<string, Coordinates> = {
  ikoyi: { latitude: 6.4529, longitude: 3.4248 },
  vi: { latitude: 6.4355, longitude: 3.4550 },
  lekki: { latitude: 6.4698, longitude: 3.5852 },
  yaba: { latitude: 6.5095, longitude: 3.3711 },
  surulere: { latitude: 6.5005, longitude: 3.3581 },
  ikeja: { latitude: 6.6059, longitude: 3.3491 },
  gbagada: { latitude: 6.5538, longitude: 3.3869 },
  ogudu: { latitude: 6.6018, longitude: 3.3515 },
  oshodi: { latitude: 6.5578, longitude: 3.3436 },
  ajah: { latitude: 6.4708, longitude: 3.5889 }
}

// Main composable
export const useStoreLocator = () => {
  const stores = ref<Store[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userLocation = ref<Coordinates | null>(null)

  // Fetch all active stores from Supabase
  const fetchStores = async (supabase: any) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: supabaseError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('is_flagship', { ascending: false })
        
      if (supabaseError) throw supabaseError
      
      stores.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch stores'
      console.error('Error fetching stores:', e)
    } finally {
      loading.value = false
    }
  }

  // Detect user's location
  const detectUserLocation = async (): Promise<Coordinates | null> => {
    try {
      const location = await getUserLocation()
      userLocation.value = location
      return location
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Location detection failed'
      console.error('Location detection failed:', e)
      return null
    }
  }

  // Get nearest store suggestion
  const getNearestStoreSuggestion = async (
    fallbackArea?: string
  ): Promise<StoreWithDistance | null> => {
    if (stores.value.length === 0) return null

    // Try browser geolocation first
    let location = await detectUserLocation()
    
    // Fallback to predefined coordinates if geolocation fails
    if (!location && fallbackArea && LAGOS_AREA_COORDINATES[fallbackArea]) {
      location = LAGOS_AREA_COORDINATES[fallbackArea]
      userLocation.value = location
    }
    
    if (!location) return null
    
    return findNearestStore(stores.value, location)
  }

  // Calculate distance between two points
  const getDistance = (from: Coordinates, to: Coordinates): number => {
    return calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude)
  }

  return {
    stores,
    loading,
    error,
    userLocation,
    fetchStores,
    detectUserLocation,
    getNearestStoreSuggestion,
    getDistance,
    calculateDistance,
    formatDistance,
    estimateDeliveryTime,
    calculateStoreDistances,
    getStoresInRange,
    isWithinDeliveryRadius,
    LAGOS_AREA_COORDINATES
  }
}
