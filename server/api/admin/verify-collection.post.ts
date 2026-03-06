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

  if (!orderId || !code) {
    throw createError({
      statusCode: 400,
      statusMessage: "orderId and code are required",
    });
  }

  const { count, error: verifyErr } = await (admin as any)
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("id", orderId)
    .eq("confirmation_code", code);

  if (verifyErr) {
    throw createError({ statusCode: 500, statusMessage: verifyErr.message });
  }

  const isValid = Number(count || 0) === 1;

  if (!isValid) {
    try {
      await (admin as any).from("security_logs").insert({
        actor_id: callerId,
        action: "pickup_collection_failed",
        order_id: orderId,
        metadata: { code_length: code.length },
      });
    } catch {
      // ignore if table does not exist
    }

    throw createError({ statusCode: 400, statusMessage: "Validation failed" });
  }

  return { ok: true };
});
