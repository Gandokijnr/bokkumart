/**
 * OpenStreetMap Nominatim Geocoding Service
 * Free geocoding with proper rate limiting and caching
 *
 * Terms of Service:
 * - Max 1 request/second
 * - Cache results
 * - Display attribution: "© OpenStreetMap contributors"
 * - Include valid User-Agent
 *
 * Docs: https://nominatim.org/release-docs/develop/api/Search/
 */

import { createError } from "h3";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Simple in-memory cache (use Redis in production for multi-server setups)
const geocodeCache = new Map<string, GeocodeResult>();
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  boundingBox: [string, string, string, string];
  cached?: boolean;
  cachedAt?: number;
}

export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string];
}

/**
 * Geocode an address using Nominatim
 * Includes caching and rate limiting
 */
export async function geocodeWithNominatim(
  address: string,
  options: {
    countryCodes?: string[]; // e.g., ['ng'] for Nigeria only
    limit?: number;
    email?: string; // Required by Nominatim ToS for high-volume users
  } = {},
): Promise<GeocodeResult | null> {
  // Check cache first
  const cacheKey = `${address.toLowerCase().trim()}_${options.countryCodes?.join(",") || "all"}`;
  const cached = geocodeCache.get(cacheKey);

  if (cached && Date.now() - (cached.cachedAt || 0) < CACHE_TTL_MS) {
    console.log(`[Nominatim] Cache hit for: ${address}`);
    return { ...cached, cached: true };
  }

  // Build query params
  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: String(options.limit || 1),
    addressdetails: "1",
    "accept-language": "en",
  });

  if (options.countryCodes?.length) {
    params.set("countrycodes", options.countryCodes.join(","));
  }

  if (options.email) {
    params.set("email", options.email);
  }

  const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

  try {
    console.log(`[Nominatim] Geocoding: ${address}`);

    const response = await fetch(url, {
      headers: {
        // Required by Nominatim ToS - identifies your application
        "User-Agent": "BokkuXpress-Geocoder/1.0 (contact@bokkuxpress.ng)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("[Nominatim] Rate limited - too many requests");
        throw createError({
          statusCode: 429,
          statusMessage:
            "Geocoding rate limit exceeded. Please try again in a moment.",
        });
      }

      console.error(
        `[Nominatim] HTTP ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    const results: NominatimResponse[] = await response.json();

    if (!results || results.length === 0) {
      console.warn(`[Nominatim] No results for: ${address}`);
      return null;
    }

    const first = results[0];

    if (!first?.lat || !first?.lon) {
      console.warn(`[Nominatim] Invalid result for: ${address}`);
      return null;
    }

    const result: GeocodeResult = {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
      address: {
        house_number: first.address?.house_number,
        road: first.address?.road,
        suburb: first.address?.suburb,
        city:
          first.address?.city || first.address?.town || first.address?.village,
        state: first.address?.state,
        postcode: first.address?.postcode,
        country: first.address?.country,
      },
      boundingBox: first.boundingbox,
      cachedAt: Date.now(),
    };

    // Store in cache
    geocodeCache.set(cacheKey, result);

    return result;
  } catch (error: any) {
    console.error("[Nominatim] Geocoding error:", error);

    if (error.statusCode) {
      throw error;
    }

    return null;
  }
}

/**
 * Reverse geocode: coordinates to address
 */
export async function reverseGeocodeWithNominatim(
  lat: number,
  lng: number,
  options: { email?: string } = {},
): Promise<GeocodeResult | null> {
  // Check cache
  const cacheKey = `reverse_${lat.toFixed(6)}_${lng.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);

  if (cached && Date.now() - (cached.cachedAt || 0) < CACHE_TTL_MS) {
    return { ...cached, cached: true };
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
  });

  if (options.email) {
    params.set("email", options.email);
  }

  const url = `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "BokkuXpress-Geocoder/1.0 (contact@bokkuxpress.ng)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[Nominatim] HTTP ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    const result: NominatimResponse = await response.json();

    if (!result || !result.lat) {
      return null;
    }

    const parsed: GeocodeResult = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        house_number: result.address?.house_number,
        road: result.address?.road,
        suburb: result.address?.suburb,
        city:
          result.address?.city ||
          result.address?.town ||
          result.address?.village,
        state: result.address?.state,
        postcode: result.address?.postcode,
        country: result.address?.country,
      },
      boundingBox: result.boundingbox,
      cachedAt: Date.now(),
    };

    geocodeCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error("[Nominatim] Reverse geocoding error:", error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses with rate limiting
 * Processes 1 per second to respect Nominatim limits
 */
export async function batchGeocodeWithNominatim(
  addresses: Array<{ id: string; address: string }>,
  options: { countryCodes?: string[]; email?: string } = {},
): Promise<Record<string, GeocodeResult | null>> {
  const results: Record<string, GeocodeResult | null> = {};

  for (const { id, address } of addresses) {
    // Rate limiting: wait 1 second between requests
    if (Object.keys(results).length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    const result = await geocodeWithNominatim(address, options);
    results[id] = result;

    console.log(`[BatchGeocode] ${id}: ${result ? "✓" : "✗"} ${address}`);
  }

  return results;
}

/**
 * Get cache stats
 */
export function getGeocodeCacheStats(): {
  size: number;
  entries: Array<{ key: string; cachedAt: number; age: string }>;
} {
  const entries = Array.from(geocodeCache.entries()).map(([key, value]) => ({
    key: key.substring(0, 50) + (key.length > 50 ? "..." : ""),
    cachedAt: value.cachedAt || 0,
    age: value.cachedAt
      ? `${Math.round((Date.now() - value.cachedAt) / 1000 / 60)}m ago`
      : "unknown",
  }));

  return {
    size: geocodeCache.size,
    entries,
  };
}

/**
 * Clear geocode cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
  console.log("[Nominatim] Cache cleared");
}

/**
 * Required attribution for OpenStreetMap
 * Display this in your UI where map/location data is shown
 */
export const OPENSTREETMAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Check if an address is in Nigeria
 */
export function isNigerianAddress(address: string): boolean {
  const nigeriaKeywords = [
    "nigeria",
    "lagos",
    "abuja",
    "ikeja",
    "gbagada",
    "lekki",
    "ogba",
    "ogudu",
    "omole",
    "victoria island",
    "yaba",
    "surulere",
    "apapa",
  ];

  const lowerAddress = address.toLowerCase();
  return nigeriaKeywords.some((kw) => lowerAddress.includes(kw));
}
