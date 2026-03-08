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
    throw createError({ statusCode: 500, statusMessage: "Server not configured" });
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

  const { data: rows, error } = await (admin as any)
    .from("rider_onboarding_applications")
    .select("id, user_id, status, personal, vehicle, payout, phone_verification, created_at, updated_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const bucket = "rider-documents";

  const enriched = await Promise.all(
    ((rows as any[]) || []).map(async (r) => {
      const idCardPath = r?.vehicle?.id_card_path || null;
      const vehicleRegPath = r?.vehicle?.vehicle_registration_path || null;

      const idCard = idCardPath
        ? await admin.storage.from(bucket).createSignedUrl(String(idCardPath), 10 * 60)
        : null;
      const vehicleReg = vehicleRegPath
        ? await admin.storage
            .from(bucket)
            .createSignedUrl(String(vehicleRegPath), 10 * 60)
        : null;

      return {
        ...r,
        documents: {
          id_card_url: idCard?.data?.signedUrl || null,
          vehicle_registration_url: vehicleReg?.data?.signedUrl || null,
        },
      };
    }),
  );

  return { riders: enriched };
});
