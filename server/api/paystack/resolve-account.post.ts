import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";
import type { Database } from "~/types/database.types";

interface Body {
  bank_code: string;
  account_number: string;
}

interface PaystackResolveResponse {
  status: boolean;
  message: string;
  data?: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const supabase = await serverSupabaseClient<Database>(event);

  const paystackSecret =
    (config.paystackSecretKey as string | undefined) ||
    (process.env.PAYSTACK_SECRET_KEY as string | undefined);

  if (!paystackSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Paystack secret key not configured",
    });
  }

  const body = await readBody<Body>(event);
  const bankCode = String(body?.bank_code || "").trim();
  const accountNumber = String(body?.account_number || "").trim();

  if (!bankCode || accountNumber.length !== 10) {
    throw createError({
      statusCode: 400,
      statusMessage: "bank_code and a 10-digit account_number are required",
    });
  }

  // Check if account is already registered by another user
  const { data: existingAccount, error: checkError } = await (supabase as any)
    .from("rider_onboarding_applications")
    .select("id, user_id, payout, status")
    .eq("status", "approved")
    .filter("payout->>account_number", "eq", accountNumber)
    .maybeSingle();

  if (checkError) {
    console.error(
      "[Resolve Account] Error checking existing account:",
      checkError,
    );
  }

  if (existingAccount) {
    throw createError({
      statusCode: 409,
      statusMessage: "This account is already registered to another rider",
    });
  }

  const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
    accountNumber,
  )}&bank_code=${encodeURIComponent(bankCode)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      "Content-Type": "application/json",
    },
  });

  const result = (await resp.json()) as PaystackResolveResponse;

  if (!resp.ok || !result.status) {
    console.error("[Paystack Resolve Error]", {
      status: resp.status,
      paystackStatus: result?.status,
      message: result?.message,
      bankCode,
      accountNumber:
        accountNumber.slice(0, 4) + "****" + accountNumber.slice(-2),
    });
    throw createError({
      statusCode: 400,
      statusMessage: result?.message || "Failed to resolve account",
    });
  }

  return {
    success: true,
    account_name: result.data?.account_name,
  };
});
