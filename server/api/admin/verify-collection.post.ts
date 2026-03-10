import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface VerifyCollectionBody {
  orderId: string;
  code: string;
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
    .select("role")
    .eq("id", callerId)
    .single();

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message });
  }

  const isBranchManager = callerProfile?.role === "branch_manager";
  const isSuperAdmin = callerProfile?.role === "super_admin";
  const isStaff = callerProfile?.role === "staff";

  if (!isBranchManager && !isSuperAdmin && !isStaff) {
    throw createError({ statusCode: 403, statusMessage: "Not authorized" });
  }

  const body = await readBody<VerifyCollectionBody>(event);
  const orderId = body?.orderId;
  const code = String(body?.code || "").trim();

  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Order ID is required",
    });
  }

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please enter a verification code",
    });
  }

  // First check if order exists
  const { data: orderData, error: orderErr } = await (admin as any)
    .from("orders")
    .select("id, confirmation_code")
    .eq("id", orderId)
    .single();

  if (orderErr || !orderData) {
    throw createError({
      statusCode: 404,
      statusMessage: "Order not found",
    });
  }

  // Check if order has a confirmation code set
  if (!orderData.confirmation_code) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "This order does not have a pickup code. Please contact support.",
    });
  }

  // Verify the code matches
  if (orderData.confirmation_code !== code) {
    // Log failed attempt
    try {
      await (admin as any).from("security_logs").insert({
        actor_id: callerId,
        action: "pickup_collection_failed",
        order_id: orderId,
        metadata: {
          code_length: code.length,
          reason: "invalid_code",
        },
      });
    } catch {
      // ignore if table does not exist
    }

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid pickup code. Please check the code and try again.`,
    });
  }

  return { ok: true };
});
