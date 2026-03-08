import { defineEventHandler, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

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

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
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

  if (String((callerProfile as any)?.role) !== "super_admin") {
    throw createError({ statusCode: 403, statusMessage: "Not authorized" });
  }

  const { data, error } = await (admin as any)
    .from("payout_requests")
    .select(
      "id, driver_id, amount, status, bank_details, transaction_reference, paid_at, created_at, updated_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const driverIds = Array.from(
    new Set(((data as any[]) || []).map((r) => r.driver_id).filter(Boolean)),
  );

  let driverMap = new Map<string, any>();
  if (driverIds.length > 0) {
    const { data: drivers } = await (admin as any)
      .from("profiles")
      .select("id, full_name, phone_number")
      .in("id", driverIds);

    for (const d of (drivers || []) as any[]) {
      driverMap.set(d.id, d);
    }
  }

  const rows = ((data as any[]) || []).map((r) => ({
    ...r,
    driver: driverMap.get(r.driver_id) || null,
  }));

  return { payouts: rows };
});
