import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

type Body = {
  applicationId: string;
  reason?: string;
};

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

  if (String((callerProfile as any)?.role) !== "super_admin") {
    throw createError({ statusCode: 403, statusMessage: "Not authorized" });
  }

  const body = await readBody<Body>(event);
  const applicationId = String(body?.applicationId || "").trim();
  const reason = String(body?.reason || "").trim();

  if (!applicationId) {
    throw createError({
      statusCode: 400,
      statusMessage: "applicationId is required",
    });
  }

  const { data: appRow, error: appErr } = await (admin as any)
    .from("rider_onboarding_applications")
    .select("id, user_id, status")
    .eq("id", applicationId)
    .single();

  if (appErr || !appRow) {
    throw createError({
      statusCode: 404,
      statusMessage: appErr?.message || "Application not found",
    });
  }

  if (String(appRow.status) !== "pending") {
    throw createError({
      statusCode: 400,
      statusMessage: "Only pending applications can be rejected",
    });
  }

  const now = new Date().toISOString();

  const { error: appUpdateErr } = await (admin as any)
    .from("rider_onboarding_applications")
    .update({
      status: "rejected",
      reviewed_by: callerId,
      reviewed_at: now,
      updated_at: now,
      rejection_reason: reason || null,
    })
    .eq("id", applicationId);

  if (appUpdateErr) {
    throw createError({ statusCode: 400, statusMessage: appUpdateErr.message });
  }

  return { success: true };
});
