import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";
import {
  calculateHaversineDistance,
  getDeliveryFeeByDistance,
  formatDistance,
  isOguduHubStore,
  type DeliveryCalculation,
} from "~/utils/delivery";

interface DeliveryFeeRequest {
  userLat: number;
  userLng: number;
  storeId?: string;
  productId?: string;
  cartItems?: Array<{ productId: string; quantity: number }>;
}

interface StoreFromDB {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  base_delivery_fee: number;
  per_km_delivery_fee: number;
  delivery_radius_km: number;
  congestion_multiplier: number | null;
  is_active: boolean;
}

interface StoreWithDistance extends StoreFromDB {
  distance: number;
  hasStock: boolean;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<DeliveryFeeRequest>(event);

  // Validate request
  if (
    typeof body.userLat !== "number" ||
    typeof body.userLng !== "number" ||
    isNaN(body.userLat) ||
    isNaN(body.userLng)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Valid user latitude and longitude are required",
    });
  }

  const supabase = await serverSupabaseClient(event);

  try {
    let selectedStore: StoreFromDB | null = null;
    let calculation: DeliveryCalculation | null = null;

    // Fetch all active stores
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select(
        "id, name, code, address, city, state, latitude, longitude, phone, email, base_delivery_fee, per_km_delivery_fee, delivery_radius_km, congestion_multiplier, is_active",
      )
      .eq("is_active", true);

    if (storesError) {
      console.error("[Delivery API] Error fetching stores:", storesError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch store information. Please try again.",
      });
    }

    if (!stores || stores.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "No stores are currently available for delivery.",
      });
    }

    const typedStores = stores as StoreFromDB[];

    // If specific store requested, use it
    if (body.storeId) {
      selectedStore = typedStores.find((s) => s.id === body.storeId) || null;

      if (!selectedStore) {
        throw createError({
          statusCode: 404,
          statusMessage: "Selected store not found",
        });
      }
    } else {
      // Calculate distances for all stores
      const storesWithDistance: StoreWithDistance[] = typedStores.map(
        (store) => ({
          ...store,
          distance: calculateHaversineDistance(
            body.userLat,
            body.userLng,
            store.latitude,
            store.longitude,
          ),
          hasStock: true,
        }),
      );

      // Sort by distance
      storesWithDistance.sort((a, b) => a.distance - b.distance);

      // Handle Ogudu Hub logic if productId provided
      const oguduStores = storesWithDistance.filter((s) =>
        isOguduHubStore(s.code),
      );
      const otherStores = storesWithDistance.filter(
        (s) => !isOguduHubStore(s.code),
      );

      if (oguduStores.length > 0 && body.productId) {
        const productId = body.productId; // Capture in local const
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
              hasStock:
                ((data as unknown as { available_stock?: number })
                  ?.available_stock || 0) > 0,
            };
          }),
        );

        // Filter to only Ogudu stores with stock
        const oguduWithStock = stockChecks.filter((s) => s.hasStock);

        if (oguduWithStock.length > 0) {
          // Use nearest Ogudu store with stock
          selectedStore = oguduWithStock[0] ?? null;
        } else {
          // No Ogudu store has stock, use nearest other store
          selectedStore = otherStores[0] ?? null;
        }
      } else {
        // No product specified or no Ogudu stores - use nearest
        selectedStore = storesWithDistance[0] ?? null;
      }

      if (!selectedStore) {
        throw createError({
          statusCode: 404,
          statusMessage: "No suitable store found for your location",
        });
      }
    }

    // Calculate distance and delivery fee
    const distance = calculateHaversineDistance(
      body.userLat,
      body.userLng,
      selectedStore.latitude,
      selectedStore.longitude,
    );

    const tierInfo = getDeliveryFeeByDistance(distance);
    const congestionMultiplier = selectedStore.congestion_multiplier || 1.0;

    if (tierInfo.outsideZone) {
      calculation = {
        distance,
        baseFee: 0,
        finalFee: 0,
        tier: tierInfo.tier,
        tierLabel: tierInfo.label,
        congestionMultiplier,
        outsideZone: true,
        message: "Address outside standard delivery zone. Surcharge may apply.",
      };
    } else {
      const baseFee = tierInfo.fee!;
      const finalFee = Math.round(baseFee * congestionMultiplier);

      calculation = {
        distance,
        baseFee,
        finalFee,
        tier: tierInfo.tier,
        tierLabel: tierInfo.label,
        congestionMultiplier,
        outsideZone: false,
      };
    }

    // Calculate fees for all stores (for alternatives)
    const allCalculations = typedStores
      .map((store) => {
        const dist = calculateHaversineDistance(
          body.userLat,
          body.userLng,
          store.latitude,
          store.longitude,
        );
        const tier = getDeliveryFeeByDistance(dist);
        const multiplier = store.congestion_multiplier || 1.0;

        return {
          store,
          distance: dist,
          fee: tier.outsideZone ? null : Math.round(tier.fee! * multiplier),
          outsideZone: tier.outsideZone,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    // Return response
    return {
      success: true,
      selectedStore: {
        id: selectedStore.id,
        name: selectedStore.name,
        code: selectedStore.code,
        address: selectedStore.address,
        city: selectedStore.city,
        latitude: selectedStore.latitude,
        longitude: selectedStore.longitude,
      },
      delivery: {
        ...calculation,
        distanceFormatted: formatDistance(calculation.distance),
        feeFormatted: calculation.outsideZone
          ? null
          : new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
              maximumFractionDigits: 0,
            }).format(calculation.finalFee),
      },
      alternatives: allCalculations
        .filter((alt) => alt.store.id !== selectedStore!.id)
        .slice(0, 3) // Top 3 alternatives
        .map((alt) => ({
          store: {
            id: alt.store.id,
            name: alt.store.name,
            code: alt.store.code,
          },
          distance: alt.distance,
          distanceFormatted: formatDistance(alt.distance),
          fee: alt.fee,
          feeFormatted: alt.fee
            ? new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                maximumFractionDigits: 0,
              }).format(alt.fee)
            : null,
          outsideZone: alt.outsideZone,
        })),
    };
  } catch (error: any) {
    console.error("[Delivery API] Error:", error);

    // Return safe error message
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to calculate delivery fee. Please try again.",
    });
  }
});
