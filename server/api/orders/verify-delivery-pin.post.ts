import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface VerifyDeliveryPinBody {
  orderId: string;
  pin: string;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

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

  const authHeader = event.node.req.headers["authorization"];
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token =
    typeof bearer === "string" && bearer.startsWith("Bearer ")
      ? bearer.slice("Bearer ".length)
      : null;

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Authorization Bearer token",
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as ReturnType<typeof createClient<Database>>;

  const { data: callerData, error: callerErr } =
    await admin.auth.getUser(token);
  if (callerErr || !callerData?.user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }

  const callerId = callerData.user.id;

  const { data: callerProfile, error: profileErr } = await (admin as any)
    .from("profiles")
    .select("role, store_id, managed_store_ids")
    .eq("id", callerId)
    .single();

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message });
  }

  const role = String((callerProfile as any)?.role || "");
  const isDriver = role === "driver";
  const isBranchManager = role === "branch_manager";
  const isSuperAdmin = role === "super_admin";

  if (!isDriver && !isBranchManager && !isSuperAdmin) {
    throw createError({ statusCode: 403, statusMessage: "Not authorized" });
  }

  const body = await readBody<VerifyDeliveryPinBody>(event);
  const orderId = String(body?.orderId || "").trim();
  const pin = String(body?.pin || "").trim();

  if (!orderId || !pin) {
    throw createError({
      statusCode: 400,
      statusMessage: "orderId and pin are required",
    });
  }

  const { data: order, error: orderErr } = await (admin as any)
    .from("orders")
    .select(
      "id, store_id, driver_id, delivery_method, status, confirmation_code",
    )
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    throw createError({
      statusCode: 404,
      statusMessage: "Order not found",
    });
  }

  if (String(order.delivery_method) !== "delivery") {
    throw createError({
      statusCode: 400,
      statusMessage: "This is not a delivery order",
    });
  }

  if (isDriver) {
    if (String(order.driver_id || "") !== callerId) {
      throw createError({
        statusCode: 403,
        statusMessage: "You are not assigned to this order",
      });
    }
  } else if (!isSuperAdmin) {
    const orderStoreId = String((order as any)?.store_id || "").trim();
    const callerStoreId = String((callerProfile as any)?.store_id || "").trim();
    const managedStoreIds = Array.isArray(
      (callerProfile as any)?.managed_store_ids,
    )
      ? ((callerProfile as any)?.managed_store_ids as any[]).map((x) =>
          String(x),
        )
      : [];

    const allowedStoreIds = [callerStoreId, ...managedStoreIds].filter(Boolean);
    if (
      !orderStoreId ||
      allowedStoreIds.length === 0 ||
      !allowedStoreIds.includes(orderStoreId)
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: "Not authorized to confirm delivery for this order",
      });
    }
  }

  const status = String(order.status || "");
  if (status !== "arrived") {
    throw createError({
      statusCode: 400,
      statusMessage: `Cannot confirm delivery PIN while status is ${status}`,
    });
  }

  const expected = String(order.confirmation_code || "").trim();
  if (!expected) {
    throw createError({
      statusCode: 400,
      statusMessage: "Order has no confirmation code",
    });
  }

  if (expected !== pin) {
    throw createError({ statusCode: 400, statusMessage: "Invalid PIN" });
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await (admin as any)
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: now,
      updated_at: now,
    })
    .eq("id", orderId);

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message });
  }

  return { success: true };
});
