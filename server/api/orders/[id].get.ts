import { defineEventHandler, createError, getQuery } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const query = getQuery(event);
    const orderId = String(
      (event.context as any)?.params?.id || (query as any)?.order || "",
    ).trim();

    if (!orderId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Order ID is required",
      });
    }

    const supabaseUrl =
      ((config.public as any)?.supabase?.url as string | undefined) ||
      (process.env.SUPABASE_URL as string | undefined);

    const serviceRoleKey =
      (config.supabaseServiceRoleKey as string | undefined) ||
      (process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined);

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Server not configured",
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as ReturnType<typeof createClient<Database>>;

    // Fetch order with confirmation code
    const { data: order, error } = await (admin as any)
      .from("orders")
      .select(
        "id, items, confirmation_code, delivery_method, status, total_amount, store_id, created_at, store:stores!orders_store_id_fkey(name)",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("[Order Details] Error fetching order:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch order details",
      });
    }

    if (!order) {
      throw createError({
        statusCode: 404,
        statusMessage: "Order not found",
      });
    }

    return {
      order_id: order.id,
      items: order.items,
      confirmation_code: order.confirmation_code,
      delivery_method: order.delivery_method,
      status: order.status,
      total_amount: order.total_amount,
      store_id: order.store_id,
      store_name: (order as any)?.store?.name || null,
      created_at: order.created_at,
    };
  } catch (error: any) {
    console.error("[Order Details] Error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to fetch order details",
    });
  }
});
