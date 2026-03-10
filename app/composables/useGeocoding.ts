import {
  geocodeWithNominatim,
  reverseGeocodeWithNominatim,
  OPENSTREETMAP_ATTRIBUTION,
  isNigerianAddress,
  type GeocodeResult,
} from "~/utils/nominatim";

export interface UseGeocodingOptions {
  countryCodes?: string[];
  email?: string;
}

export interface UseGeocodingReturn {
  // State
  loading: Ref<boolean>;
  error: Ref<string | null>;
  result: Ref<GeocodeResult | null>;

  // Actions
  geocode: (address: string) => Promise<GeocodeResult | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<GeocodeResult | null>;
  clearError: () => void;

  // Constants
  attribution: string;
}

/**
 * Composable for geocoding addresses using Nominatim
 * Free alternative to Google Maps/Mapbox
 *
 * Usage:
 * ```ts
 * const { geocode, loading, result, error } = useGeocoding()
 *
 * await geocode('116 Ogudu Road, Lagos')
 * // result.value = { lat: 6.5821, lng: 3.3756, ... }
 * ```
 */
export function useGeocoding(
  options: UseGeocodingOptions = {},
): UseGeocodingReturn {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const result = ref<GeocodeResult | null>(null);

  const geocode = async (address: string): Promise<GeocodeResult | null> => {
    if (!address || typeof address !== "string") {
      error.value = "Please provide a valid address";
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      // Call server API to avoid exposing Nominatim directly
      const response = await $fetch<{
        success: boolean;
        result: GeocodeResult;
        attribution: string;
      }>("/api/geocode", {
        method: "POST",
        body: {
          address,
          type: "forward",
        },
      });

      if (response.success) {
        result.value = response.result;
        return response.result;
      }

      return null;
    } catch (err: any) {
      console.error("[useGeocoding] Error:", err);
      error.value = err?.data?.message || "Failed to geocode address";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const reverseGeocode = async (
    lat: number,
    lng: number,
  ): Promise<GeocodeResult | null> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<{
        success: boolean;
        result: GeocodeResult;
        attribution: string;
      }>("/api/geocode", {
        method: "POST",
        body: {
          lat,
          lng,
          type: "reverse",
        },
      });

      if (response.success) {
        result.value = response.result;
        return response.result;
      }

      return null;
    } catch (err: any) {
      console.error("[useGeocoding] Reverse geocode error:", err);
      error.value = err?.data?.message || "Failed to reverse geocode";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    loading,
    error,
    result,
    geocode,
    reverseGeocode,
    clearError,
    attribution: OPENSTREETMAP_ATTRIBUTION,
  };
}

/**
 * Composable for batch geocoding
 */
export function useBatchGeocoding() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const results = ref<Record<string, GeocodeResult | null>>({});
  const progress = ref(0);

  const geocodeBatch = async (
    addresses: Array<{ id: string; address: string }>,
  ): Promise<Record<string, GeocodeResult | null>> => {
    if (!addresses.length) {
      return {};
    }

    loading.value = true;
    error.value = null;
    progress.value = 0;

    try {
      const response = await $fetch<{
        success: boolean;
        results: Record<string, GeocodeResult | null>;
        processed: number;
        failed: number;
        attribution: string;
      }>("/api/geocode", {
        method: "POST",
        body: {
          type: "batch",
          addresses,
        },
      });

      if (response.success) {
        results.value = response.results;
        progress.value = 100;
        return response.results;
      }

      return {};
    } catch (err: any) {
      console.error("[useBatchGeocoding] Error:", err);
      error.value = err?.data?.message || "Failed to batch geocode";
      return {};
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    results,
    progress,
    geocodeBatch,
    attribution: OPENSTREETMAP_ATTRIBUTION,
  };
}

// Re-export types
export type { GeocodeResult };
export { OPENSTREETMAP_ATTRIBUTION, isNigerianAddress };
