/**
 * Geospatial Delivery Fee Calculator for BokkuMart
 * Uses Haversine Formula for accurate distance calculations
 */

import type { Store } from "~/stores/store";

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

// Lagos branch coordinates (to be populated via geocoding script)
export const BRANCH_COORDINATES: Record<
  string,
  { lat: number; lng: number; address: string }
> = {
  gbagada: {
    lat: 6.5537,
    lng: 3.3863,
    address: "Gbagada, Lagos",
  },
  lekki: {
    lat: 6.4698,
    lng: 3.5852,
    address: "Lekki, Lagos",
  },
  ogba: {
    lat: 6.6323,
    lng: 3.3375,
    address: "Ogba, Lagos",
  },
  "ogudu-i": {
    lat: 6.5821,
    lng: 3.3756,
    address: "116 Ogudu Road, Ogudu, Lagos",
  },
  "ogudu-ii": {
    lat: 6.5825,
    lng: 3.376,
    address: "135 Ogudu Road, Ogudu, Lagos",
  },
  omole: {
    lat: 6.6234,
    lng: 3.3589,
    address: "Omole, Lagos",
  },
};

// Delivery fee pricing tiers (in NGN)
export const DELIVERY_TIERS = {
  tier1: { minKm: 0, maxKm: 3, fee: 1000, label: "0-3km" },
  tier2: { minKm: 3, maxKm: 7, fee: 1500, label: "3-7km" },
  tier3: { minKm: 7, maxKm: 12, fee: 2500, label: "7-12km" },
  outsideZone: { minKm: 12, maxKm: Infinity, fee: null, label: ">12km" },
} as const;

export const OUTSIDE_ZONE_MESSAGE =
  "Address outside standard delivery zone. Surcharge may apply.";

// Ogudu hub configuration
export const OGUDU_HUB = {
  stores: ["ogudu-i", "ogudu-ii"],
  treatAsSingleHub: true,
  hubName: "Ogudu Hub",
};

export interface DeliveryCalculation {
  distance: number;
  baseFee: number;
  finalFee: number;
  tier: keyof typeof DELIVERY_TIERS;
  tierLabel: string;
  congestionMultiplier: number;
  outsideZone: boolean;
  message?: string;
}

export interface StoreWithDistance extends Store {
  distance: number;
  hasStock: boolean;
}

/**
 * Haversine Formula: Calculate straight-line distance between two coordinates
 * @param lat1 - Latitude of point 1 (in decimal degrees)
 * @param lng1 - Longitude of point 1 (in decimal degrees)
 * @param lat2 - Latitude of point 2 (in decimal degrees)
 * @param lng2 - Longitude of point 2 (in decimal degrees)
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Get delivery fee based on distance tier
 */
export function getDeliveryFeeByDistance(distanceKm: number): {
  fee: number | null;
  tier: keyof typeof DELIVERY_TIERS;
  label: string;
  outsideZone: boolean;
} {
  if (distanceKm <= DELIVERY_TIERS.tier1.maxKm) {
    return {
      fee: DELIVERY_TIERS.tier1.fee,
      tier: "tier1",
      label: DELIVERY_TIERS.tier1.label,
      outsideZone: false,
    };
  }

  if (distanceKm <= DELIVERY_TIERS.tier2.maxKm) {
    return {
      fee: DELIVERY_TIERS.tier2.fee,
      tier: "tier2",
      label: DELIVERY_TIERS.tier2.label,
      outsideZone: false,
    };
  }

  if (distanceKm <= DELIVERY_TIERS.tier3.maxKm) {
    return {
      fee: DELIVERY_TIERS.tier3.fee,
      tier: "tier3",
      label: DELIVERY_TIERS.tier3.label,
      outsideZone: false,
    };
  }

  return {
    fee: null,
    tier: "outsideZone",
    label: DELIVERY_TIERS.outsideZone.label,
    outsideZone: true,
  };
}

/**
 * Calculate final delivery fee with congestion multiplier
 */
export function calculateDeliveryFee(
  userLat: number,
  userLng: number,
  storeLat: number,
  storeLng: number,
  congestionMultiplier: number = 1.0,
): DeliveryCalculation {
  const distance = calculateHaversineDistance(
    userLat,
    userLng,
    storeLat,
    storeLng,
  );

  const tierInfo = getDeliveryFeeByDistance(distance);

  if (tierInfo.outsideZone) {
    return {
      distance,
      baseFee: 0,
      finalFee: 0,
      tier: tierInfo.tier,
      tierLabel: tierInfo.label,
      congestionMultiplier,
      outsideZone: true,
      message: OUTSIDE_ZONE_MESSAGE,
    };
  }

  const baseFee = tierInfo.fee!;
  const finalFee = Math.round(baseFee * congestionMultiplier);

  return {
    distance,
    baseFee,
    finalFee,
    tier: tierInfo.tier,
    tierLabel: tierInfo.label,
    congestionMultiplier,
    outsideZone: false,
  };
}

/**
 * Check if a store is part of the Ogudu Hub
 */
export function isOguduHubStore(storeCode: string): boolean {
  return OGUDU_HUB.stores.includes(storeCode.toLowerCase());
}

/**
 * Find the nearest store to a given address
 * For Ogudu I and II, treat as single hub and select based on stock availability
 */
export async function findNearestStore(
  userLat: number,
  userLng: number,
  stores: Store[],
  productId?: string,
  supabase?: any,
): Promise<StoreWithDistance | null> {
  if (stores.length === 0) return null;

  // Calculate distances for all stores
  const storesWithDistance: StoreWithDistance[] = stores.map((store) => ({
    ...store,
    distance: calculateHaversineDistance(
      userLat,
      userLng,
      store.latitude,
      store.longitude,
    ),
    hasStock: true, // Default to true, will update if productId provided
  }));

  // Sort by distance
  storesWithDistance.sort((a, b) => a.distance - b.distance);

  // Handle Ogudu Hub logic
  const oguduStores = storesWithDistance.filter((s) => isOguduHubStore(s.code));
  const otherStores = storesWithDistance.filter(
    (s) => !isOguduHubStore(s.code),
  );

  if (oguduStores.length > 0 && productId && supabase) {
    // Check stock for Ogudu stores
    const stockChecks = await Promise.all(
      oguduStores.map(async (store) => {
        const { data } = await supabase
          .from("store_inventory")
          .select("available_stock")
          .eq("store_id", store.id)
          .eq("product_id", productId)
          .single();

        return {
          ...store,
          hasStock: (data?.available_stock || 0) > 0,
        };
      }),
    );

    // Filter to only Ogudu stores with stock
    const oguduWithStock = stockChecks.filter((s) => s.hasStock);

    if (oguduWithStock.length > 0) {
      // Return nearest Ogudu store with stock
      return oguduWithStock[0] ?? null;
    }

    // No Ogudu store has stock, return nearest other store
    return otherStores[0] ?? null;
  }

  // No product specified or no Ogudu stores - return nearest
  return storesWithDistance[0] ?? null;
}

/**
 * Get congestion multiplier for current conditions
 * Can be fetched from settings table or calculated based on time
 */
export function getDefaultCongestionMultiplier(): number {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // Lagos rush hours: 7-9 AM and 5-8 PM on weekdays
  const isWeekday = day >= 1 && day <= 5;
  const isRushHour =
    isWeekday && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20));

  if (isRushHour) {
    return 1.2; // 20% surcharge during rush hour
  }

  return 1.0;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Format delivery fee for display in Naira
 */
export function formatDeliveryFee(fee: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(fee);
}

/**
 * Geocode an address to coordinates (placeholder - requires geocoding service)
 * In production, use Google Maps, Mapbox, or Nominatim (OpenStreetMap)
 */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  // This is a placeholder implementation
  // In production, integrate with a geocoding service:
  // - Google Maps Geocoding API
  // - Mapbox Geocoding API
  // - OpenStreetMap Nominatim

  console.warn(
    "geocodeAddress: Implement with actual geocoding service",
    address,
  );
  return null;
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocodeAddresses(
  addresses: Array<{ name: string; address: string }>,
): Promise<Record<string, { lat: number; lng: number }>> {
  const results: Record<string, { lat: number; lng: number }> = {};

  for (const { name, address } of addresses) {
    const coords = await geocodeAddress(address);
    if (coords) {
      results[name] = coords;
    }
  }

  return results;
}
