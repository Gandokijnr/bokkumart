import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface UpdateOrderStatusBody {
  orderId: string;
  status: Database["public"]["Tables"]["orders"]["Row"]["status"];
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
      statusMessage: "Server not configured for admin order updates",
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
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid session",
    });
  }

  const callerId = callerData.user.id;
  const { data: callerProfile, error: profileErr } = await (admin as any)
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  if (profileErr) {
    throw createError({
      statusCode: 500,
      statusMessage: profileErr.message,
    });
  }

  const role = (callerProfile as any)?.role;
  const allowedRoles = [
    "admin",
    "super_admin",
    "branch_manager",
    "staff",
    "manager",
  ];
  if (!allowedRoles.includes(role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Not authorized",
    });
  }

  const body = await readBody<UpdateOrderStatusBody>(event);
  if (!body?.orderId || !body?.status) {
    throw createError({
      statusCode: 400,
      statusMessage: "orderId and status are required",
    });
  }

  const { data: existingOrder, error: fetchErr } = await (admin as any)
    .from("orders")
    .select("id, status, store_id, items, metadata")
    .eq("id", body.orderId)
    .single();

  if (fetchErr || !existingOrder) {
    throw createError({
      statusCode: 400,
      statusMessage: fetchErr?.message || "Order not found",
    });
  }

  const oldStatus = String(existingOrder.status);
  const newStatus = String(body.status);
  const items = Array.isArray(existingOrder.items) ? existingOrder.items : [];

  // Enforce POS-first transition: must complete_in_pos before assigned
  if (newStatus === "assigned" && oldStatus !== "completed_in_pos") {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Order must be marked as completed_in_pos before assigning a rider",
    });
  }

  const updates: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "delivered") {
    updates.delivered_at = new Date().toISOString();
  }

  const { data, error } = await (admin as any)
    .from("orders")
    .update(updates)
    .eq("id", body.orderId)
    .select("id, status, updated_at")
    .single();

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message,
    });
  }

  return { success: true, order: data };
});
