import type { Store, DeliveryAddress } from "~/stores/store";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// Lagos delivery configuration
export const LAGOS_DELIVERY_CONFIG = {
  baseFee: 1500, // NGN
  perKmFee: 100, // NGN per km
  minFee: 1000, // Minimum delivery fee
  maxFee: 5000, // Maximum cap
  freeDeliveryThreshold: 50000, // Free delivery for orders above N50,000
  trafficMultiplier: 1.3, // 30% surcharge during peak hours (5-8pm weekdays)
  islandSurcharge: 500, // Extra for VI, Ikoyi, Lekki deliveries
  mainlandBase: 1500,
  islandBase: 2000,
};

// Lagos island areas (for surcharge calculation)
const ISLAND_AREAS = [
  "ikoyi",
  "vi",
  "victoria island",
  "lekki",
  "banana island",
  "maroko",
];

// Check if address is on Lagos Island
function isIslandLocation(address: string): boolean {
  const lowerAddress = address.toLowerCase();
  return ISLAND_AREAS.some((area) => lowerAddress.includes(area));
}

// Check if current time is peak traffic hour in Lagos
function isPeakTrafficHour(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Peak hours: 7-9am and 5-8pm on weekdays
  const isWeekday = day >= 1 && day <= 5;
  const isMorningRush = hour >= 7 && hour < 9;
  const isEveningRush = hour >= 17 && hour < 20;

  return isWeekday && (isMorningRush || isEveningRush);
}

// Calculate delivery fee based on store and delivery address
function calculateDeliveryFee(
  store: Store,
  deliveryAddress: DeliveryAddress,
  orderValue: number = 0,
): {
  fee: number;
  distance: number;
  breakdown: {
    baseFee: number;
    distanceFee: number;
    trafficSurcharge: number;
    islandSurcharge: number;
    discount: number;
  };
} {
  // Check for free delivery threshold
  if (orderValue >= LAGOS_DELIVERY_CONFIG.freeDeliveryThreshold) {
    return {
      fee: 0,
      distance: 0,
      breakdown: {
        baseFee: 0,
        distanceFee: 0,
        trafficSurcharge: 0,
        islandSurcharge: 0,
        discount: 0,
      },
    };
  }

  // Calculate distance from store to delivery address
  const distance = calculateDistance(
    store.latitude,
    store.longitude,
    deliveryAddress.latitude,
    deliveryAddress.longitude,
  );

  // Determine if store or delivery is on the island
  const storeIsIsland = isIslandLocation(store.address);
  const deliveryIsIsland = isIslandLocation(deliveryAddress.address);

  // Base fee calculation
  let baseFee =
    storeIsIsland || deliveryIsIsland
      ? LAGOS_DELIVERY_CONFIG.islandBase
      : store.base_delivery_fee;

  // Distance fee
  const distanceFee = Math.round(distance * store.per_km_delivery_fee);

  // Traffic surcharge during peak hours
  let trafficSurcharge = 0;
  if (isPeakTrafficHour()) {
    trafficSurcharge = Math.round(
      (baseFee + distanceFee) * (LAGOS_DELIVERY_CONFIG.trafficMultiplier - 1),
    );
  }

  // Island surcharge for cross-mainland/island deliveries
  let islandSurcharge = 0;
  if (
    (storeIsIsland && !deliveryIsIsland) ||
    (!storeIsIsland && deliveryIsIsland)
  ) {
    islandSurcharge = LAGOS_DELIVERY_CONFIG.islandSurcharge;
  }

  // Calculate total
  let totalFee = baseFee + distanceFee + trafficSurcharge + islandSurcharge;

  // Apply min/max constraints
  totalFee = Math.max(totalFee, LAGOS_DELIVERY_CONFIG.minFee);
  totalFee = Math.min(totalFee, LAGOS_DELIVERY_CONFIG.maxFee);

  return {
    fee: totalFee,
    distance,
    breakdown: {
      baseFee,
      distanceFee,
      trafficSurcharge,
      islandSurcharge,
      discount: 0,
    },
  };
}

// Calculate pickup time estimate (for click & collect)
function calculatePickupTime(store: Store): string {
  const now = new Date();
  const currentHour = now.getHours();

  // Standard prep time: 30 minutes
  const prepTime = 30;
  const pickupTime = new Date(now.getTime() + prepTime * 60000);

  const hours = pickupTime.getHours().toString().padStart(2, "0");
  const minutes = pickupTime.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

// Validate if delivery is possible to the given address
function validateDelivery(
  store: Store,
  deliveryAddress: DeliveryAddress,
): {
  valid: boolean;
  reason?: string;
  distance?: number;
} {
  const distance = calculateDistance(
    store.latitude,
    store.longitude,
    deliveryAddress.latitude,
    deliveryAddress.longitude,
  );

  if (distance > store.delivery_radius_km) {
    return {
      valid: false,
      reason: `Delivery not available beyond ${store.delivery_radius_km}km from this store. Distance: ${distance.toFixed(1)}km`,
      distance,
    };
  }

  return {
    valid: true,
    distance,
  };
}

// Format delivery fee for display
function formatDeliveryFee(fee: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(fee);
}

// Get delivery zones for a store
export async function getStoreDeliveryZones(supabase: any, storeId: string) {
  const { data, error } = await supabase
    .from("store_delivery_zones")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("min_distance_km", { ascending: true });

  if (error) {
    console.error("Error fetching delivery zones:", error);
    return [];
  }

  return data || [];
}

// Get delivery fee from predefined zones (if available)
export async function getZoneBasedDeliveryFee(
  supabase: any,
  storeId: string,
  distance: number,
): Promise<number | null> {
  const zones = await getStoreDeliveryZones(supabase, storeId);

  const matchingZone = zones.find(
    (zone: {
      min_distance_km: number;
      max_distance_km: number;
      delivery_fee: number;
    }) => distance >= zone.min_distance_km && distance <= zone.max_distance_km,
  );

  return matchingZone?.delivery_fee || null;
}

// Main composable
export const useDeliveryPricing = () => {
  const deliveryFee = ref(0);
  const distance = ref(0);
  const feeBreakdown = ref({
    baseFee: 0,
    distanceFee: 0,
    trafficSurcharge: 0,
    islandSurcharge: 0,
    discount: 0,
  });
  const estimatedTime = ref("");
  const loading = ref(false);

  // Calculate and update delivery fee
  const calculateFee = (
    store: Store,
    deliveryAddress: DeliveryAddress,
    orderValue: number = 0,
  ) => {
    loading.value = true;

    const result = calculateDeliveryFee(store, deliveryAddress, orderValue);

    deliveryFee.value = result.fee;
    distance.value = result.distance;
    feeBreakdown.value = result.breakdown;
    estimatedTime.value = estimateDeliveryTime(store, deliveryAddress);

    loading.value = false;

    return result;
  };

  // Estimate delivery time based on distance and traffic
  const estimateDeliveryTime = (
    store: Store,
    deliveryAddress: DeliveryAddress,
  ): string => {
    const dist = calculateDistance(
      store.latitude,
      store.longitude,
      deliveryAddress.latitude,
      deliveryAddress.longitude,
    );

    // Base: 30 mins prep + 3 mins per km
    let minutes = 30 + dist * 3;

    // Add traffic buffer during peak hours
    if (isPeakTrafficHour()) {
      minutes += 20;
    }

    // Island deliveries take longer
    if (isIslandLocation(deliveryAddress.address)) {
      minutes += 15;
    }

    if (minutes < 60) {
      return `${Math.ceil(minutes)} mins`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.ceil(minutes % 60);
    return remainingMins > 0 ? `${hours}hr ${remainingMins}m` : `${hours}hr`;
  };

  // Check if delivery is valid
  const validate = (store: Store, deliveryAddress: DeliveryAddress) => {
    return validateDelivery(store, deliveryAddress);
  };

  return {
    deliveryFee,
    distance,
    feeBreakdown,
    estimatedTime,
    loading,
    calculateFee,
    validate,
    formatDeliveryFee,
    isPeakTrafficHour,
    isIslandLocation,
    LAGOS_DELIVERY_CONFIG,
  };
};
