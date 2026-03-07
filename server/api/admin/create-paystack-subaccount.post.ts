import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

type Body = {
  store_id: string;
  settlement_bank_code: string;
  account_number: string;
  business_name?: string;
  // Commission configuration (stored on store)
  platform_percentage?: number | null;
  fixed_commission?: number | null;
};

type PaystackSubaccountResponse = {
  status: boolean;
  message: string;
  data?: {
    subaccount_code: string;
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge: number;
  };
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

  const paystackSecret =
    config.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Paystack secret key not configured",
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
  const storeId = String(body?.store_id || "").trim();
  const settlementBankCode = String(body?.settlement_bank_code || "").trim();
  const accountNumber = String(body?.account_number || "").trim();

  if (!storeId || !settlementBankCode || !accountNumber) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "store_id, settlement_bank_code, account_number are required",
    });
  }

  const { data: storeRow, error: storeErr } = await (admin as any)
    .from("stores")
    .select("id, name, paystack_subaccount_code")
    .eq("id", storeId)
    .single();

  if (storeErr || !storeRow) {
    throw createError({
      statusCode: 400,
      statusMessage: storeErr?.message || "Store not found",
    });
  }

  const platformPercentage =
    typeof body?.platform_percentage === "number"
      ? body.platform_percentage
      : null;

  const fixedCommission =
    typeof body?.fixed_commission === "number" ? body.fixed_commission : null;

  if (storeRow.paystack_subaccount_code) {
    const { error: updateExistingErr } = await (admin as any)
      .from("stores")
      .update({
        paystack_settlement_account_number: accountNumber,
        platform_percentage: platformPercentage,
        fixed_commission: fixedCommission,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    if (updateExistingErr) {
      throw createError({
        statusCode: 500,
        statusMessage: updateExistingErr.message,
      });
    }

    return {
      success: true,
      store_id: storeId,
      subaccount_code: storeRow.paystack_subaccount_code,
      message:
        "Store already has a subaccount. Updated routing settings on store.",
    };
  }

  const businessName = String(
    body?.business_name || storeRow.name || "Store",
  ).trim();

  const paystackPayload = {
    business_name: businessName,
    settlement_bank: settlementBankCode,
    account_number: accountNumber,
    percentage_charge: 0,
  };

  const psRes = await fetch("https://api.paystack.co/subaccount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paystackPayload),
  });

  const psJson = (await psRes.json()) as PaystackSubaccountResponse;

  if (!psRes.ok || !psJson.status || !psJson.data?.subaccount_code) {
    console.error("Paystack subaccount create error:", psJson);
    throw createError({
      statusCode: 400,
      statusMessage: psJson.message || "Failed to create subaccount",
    });
  }

  const { error: updateErr } = await (admin as any)
    .from("stores")
    .update({
      paystack_subaccount_code: psJson.data.subaccount_code,
      paystack_settlement_bank_name: null,
      paystack_settlement_account_number: accountNumber,
      platform_percentage: platformPercentage,
      fixed_commission: fixedCommission,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message });
  }

  return {
    success: true,
    store_id: storeId,
    subaccount_code: psJson.data.subaccount_code,
  };
});
