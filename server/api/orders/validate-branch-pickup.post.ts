import { defineEventHandler, readBody, createError } from "h3";

interface PickupValidationRequest {
  orderId: string;
  confirmationCode: string;
  storeId: string;
}

interface PickupValidationResponse {
  valid: boolean;
  orderId: string;
  storeId: string;
  storeName: string;
  customerName: string;
  message: string;
  canCollect: boolean;
}

export default defineEventHandler(
  async (event): Promise<PickupValidationResponse> => {
    try {
      const body = await readBody<PickupValidationRequest>(event);
      const { orderId, confirmationCode, storeId } = body;

      if (!orderId || !confirmationCode || !storeId) {
        throw createError({
          statusCode: 400,
          message:
            "Missing required fields: orderId, confirmationCode, storeId",
        });
      }

      const { createClient } = await import("@supabase/supabase-js");
      const config = useRuntimeConfig();

      const supabase = createClient(
        config.public.supabaseUrl as string,
        config.supabaseServiceRoleKey as string,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );

      // Fetch order with store details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          `
        id,
        store_id,
        confirmation_code,
        status,
        delivery_method,
        user_id,
        stores!inner(name, address, pickup_instructions)
      `,
        )
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        throw createError({
          statusCode: 404,
          message: "Order not found",
        });
      }

      // Extract store data from relation
      const storeData = (order as any).stores as {
        name: string;
        address: string;
        pickup_instructions: string | null;
      } | null;

      // BRANCH LOCK: Verify order belongs to the specified store
      if (order.store_id !== storeId) {
        return {
          valid: false,
          orderId,
          storeId,
          storeName: "",
          customerName: "",
          message:
            "ORDER NOT FROM THIS BRANCH - Customer must collect at: " +
            (storeData?.name || "different location"),
          canCollect: false,
        };
      }

      // Verify it's a pickup order
      if (order.delivery_method !== "pickup") {
        return {
          valid: false,
          orderId,
          storeId,
          storeName: storeData?.name || "",
          customerName: "",
          message: "This is a DELIVERY order, not pickup",
          canCollect: false,
        };
      }

      // Verify confirmation code
      if (order.confirmation_code !== confirmationCode.toUpperCase()) {
        return {
          valid: false,
          orderId,
          storeId,
          storeName: storeData?.name || "",
          customerName: "",
          message: "Invalid confirmation code",
          canCollect: false,
        };
      }

      // Check if order is ready for pickup
      const readyStatuses = ["picked_up", "arrived", "completed_in_pos"];
      if (!readyStatuses.includes(order.status)) {
        return {
          valid: true,
          orderId,
          storeId,
          storeName: storeData?.name || "",
          customerName: "",
          message: `Order verified but not ready. Current status: ${order.status}`,
          canCollect: false,
        };
      }

      // Get customer details
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", order.user_id)
        .single();

      return {
        valid: true,
        orderId,
        storeId,
        storeName: storeData?.name || "",
        customerName: profile?.full_name || "",
        message: `✓ VALID - Branch: ${storeData?.name}. Pickup Location: ${storeData?.address}. ${storeData?.pickup_instructions || ""}`,
        canCollect: true,
      };
    } catch (err: any) {
      console.error("Error validating branch pickup:", err);
      throw createError({
        statusCode: err.statusCode || 500,
        message: err.message || "Failed to validate pickup",
      });
    }
  },
);
