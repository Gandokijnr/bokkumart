import { defineEventHandler, readBody, createError } from "h3";
import {
  geocodeWithNominatim,
  reverseGeocodeWithNominatim,
  batchGeocodeWithNominatim,
  OPENSTREETMAP_ATTRIBUTION,
  getGeocodeCacheStats,
  clearGeocodeCache,
  isNigerianAddress,
} from "~/utils/nominatim";

interface GeocodeRequest {
  address: string;
  type?: "forward" | "reverse" | "batch";
  lat?: number;
  lng?: number;
  addresses?: Array<{ id: string; address: string }>;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GeocodeRequest>(event);

  // Validate request
  if (!body.type || body.type === "forward") {
    if (!body.address || typeof body.address !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Address is required for forward geocoding",
      });
    }

    // Validate Nigerian address
    if (!isNigerianAddress(body.address)) {
      console.warn(`[GeocodeAPI] Non-Nigerian address: ${body.address}`);
      // Still allow it, but log for monitoring
    }

    try {
      const result = await geocodeWithNominatim(body.address, {
        countryCodes: ["ng"], // Restrict to Nigeria
        email: "contact@homeaffairs.ng",
      });

      if (!result) {
        throw createError({
          statusCode: 404,
          statusMessage:
            "Address not found. Please check the address and try again.",
        });
      }

      return {
        success: true,
        result,
        attribution: OPENSTREETMAP_ATTRIBUTION,
      };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      console.error("[GeocodeAPI] Forward geocoding error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to geocode address. Please try again.",
      });
    }
  }

  // Reverse geocoding
  if (body.type === "reverse") {
    if (
      typeof body.lat !== "number" ||
      typeof body.lng !== "number" ||
      isNaN(body.lat) ||
      isNaN(body.lng)
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Valid lat and lng are required for reverse geocoding",
      });
    }

    try {
      const result = await reverseGeocodeWithNominatim(body.lat, body.lng, {
        email: "contact@homeaffairs.ng",
      });

      if (!result) {
        throw createError({
          statusCode: 404,
          statusMessage: "No address found for these coordinates.",
        });
      }

      return {
        success: true,
        result,
        attribution: OPENSTREETMAP_ATTRIBUTION,
      };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      console.error("[GeocodeAPI] Reverse geocoding error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to reverse geocode. Please try again.",
      });
    }
  }

  // Batch geocoding
  if (body.type === "batch") {
    if (
      !body.addresses ||
      !Array.isArray(body.addresses) ||
      body.addresses.length === 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Addresses array is required for batch geocoding",
      });
    }

    if (body.addresses.length > 10) {
      throw createError({
        statusCode: 400,
        statusMessage: "Batch geocoding limited to 10 addresses at a time",
      });
    }

    try {
      const results = await batchGeocodeWithNominatim(body.addresses, {
        countryCodes: ["ng"],
        email: "contact@homeaffairs.ng",
      });

      return {
        success: true,
        results,
        attribution: OPENSTREETMAP_ATTRIBUTION,
        processed: body.addresses.length,
        failed: Object.values(results).filter((r) => r === null).length,
      };
    } catch (error: any) {
      console.error("[GeocodeAPI] Batch geocoding error:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to batch geocode. Please try again.",
      });
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage:
      "Invalid geocoding type. Use 'forward', 'reverse', or 'batch'.",
  });
});
