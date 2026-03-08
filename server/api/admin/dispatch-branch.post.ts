import { defineEventHandler, readBody, createError } from "h3";

interface BranchDispatchRequest {
  orderId: string;
  storeId: string;
  riderName: string;
  riderPhone?: string;
  riderVehicleType?: string;
  estimatedArrival?: string;
  dispatchedBy: string;
}

interface BranchDispatchResponse {
  success: boolean;
  dispatchId: string;
  message: string;
  branchEnforced: boolean;
}

export default defineEventHandler(
  async (event): Promise<BranchDispatchResponse> => {
    try {
      const body = await readBody<BranchDispatchRequest>(event);
      const {
        orderId,
        storeId,
        riderName,
        riderPhone,
        riderVehicleType,
        estimatedArrival,
        dispatchedBy,
      } = body;

      if (!orderId || !storeId || !riderName || !dispatchedBy) {
        throw createError({
          statusCode: 400,
          message:
            "Missing required fields: orderId, storeId, riderName, dispatchedBy",
        });
      }

      // Check branch scope permissions
      const allowedStoreIds = event.context.allowedStoreIds as string[] | null;
      const isSuperAdmin = event.context.isSuperAdmin as boolean;

      // Enforce branch scope - dispatchers can only dispatch to their assigned branch
      if (
        !isSuperAdmin &&
        allowedStoreIds &&
        !allowedStoreIds.includes(storeId)
      ) {
        throw createError({
          statusCode: 403,
          message:
            "Access denied. You can only dispatch orders for your assigned branch.",
        });
      }

      const { createClient } = await import("@supabase/supabase-js");
      const config = useRuntimeConfig();

      const supabase = createClient(
        config.supabaseUrl as string,
        config.supabaseServiceRoleKey as string,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );

      // Verify order belongs to the specified store
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, store_id, status")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        throw createError({
          statusCode: 404,
          message: "Order not found",
        });
      }

      if (order.store_id !== storeId) {
        throw createError({
          statusCode: 403,
          message: "Order does not belong to the specified branch",
        });
      }

      // Only allow dispatch for orders in appropriate status
      const allowedStatuses = ["completed_in_pos", "assigned", "picked_up"];
      if (!allowedStatuses.includes(order.status)) {
        throw createError({
          statusCode: 400,
          message: `Cannot dispatch order in status: ${order.status}. Must be: ${allowedStatuses.join(", ")}`,
        });
      }

      // Verify driver is assigned to this branch (if driver record exists)
      const { data: driverProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "driver")
        .eq("store_id", storeId)
        .ilike("full_name", riderName)
        .single();

      // Create the dispatch record
      const { data: dispatch, error: dispatchError } = await supabase
        .from("rider_dispatches")
        .insert({
          order_id: orderId,
          store_id: storeId,
          rider_name: riderName,
          rider_phone: riderPhone || null,
          rider_vehicle_type: riderVehicleType || "motorcycle",
          dispatched_by: dispatchedBy,
          dispatched_at: new Date().toISOString(),
          estimated_arrival: estimatedArrival || null,
          status: "dispatched",
          customer_notified: false,
          metadata: {
            driver_profile_id: driverProfile?.id || null,
            branch_enforced: true,
            dispatched_from_branch: storeId,
          },
        })
        .select("id")
        .single();

      if (dispatchError) {
        console.error("Dispatch creation error:", {
          dispatchError,
          orderId,
          storeId,
          dispatchedBy,
          riderName,
        });
        throw createError({
          statusCode: 500,
          message: dispatchError.message || "Failed to create dispatch record",
          data: {
            code: (dispatchError as any)?.code,
            details: (dispatchError as any)?.details,
            hint: (dispatchError as any)?.hint,
          },
        });
      }

      // Update order status to assigned if not already
      if (order.status !== "assigned") {
        await supabase
          .from("orders")
          .update({
            status: "assigned",
            assigned_at: new Date().toISOString(),
            driver_id: driverProfile?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }

      return {
        success: true,
        dispatchId: dispatch.id,
        message: `Rider ${riderName} dispatched for order at branch ${storeId}`,
        branchEnforced: true,
      };
    } catch (err: any) {
      console.error("Error in branch dispatch:", err);
      throw createError({
        statusCode: err.statusCode || 500,
        message: err.message || "Failed to dispatch rider",
      });
    }
  },
);
