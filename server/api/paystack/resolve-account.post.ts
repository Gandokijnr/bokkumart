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
      statusMessage: "Service temporarily unavailable. Please try again later.",
    });
  }

  const body = await readBody<Body>(event);
  const bankCode = String(body?.bank_code || "").trim();
  const accountNumber = String(body?.account_number || "").trim();

  if (!bankCode || accountNumber.length !== 10) {
    throw createError({
      statusCode: 400,
      statusMessage: "Please check your information and try again.",
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
      statusMessage:
        "This account is already registered. Please use a different account.",
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
    // Log internal details server-side only (with masked account number)
    console.error("[Paystack Resolve Error]", {
      status: resp.status,
      paystackMessage: result?.message,
      bankCode,
    });

    // Return safe user-facing message based on Paystack error
    let userMessage =
      "We couldn't verify that account. Please check the details and try again.";

    if (
      result?.message?.toLowerCase().includes("test mode") &&
      result?.message?.toLowerCase().includes("limit")
    ) {
      userMessage =
        "Please use Test Bank (001 or 011) for testing, or switch to live mode.";
    }

    throw createError({
      statusCode: 400,
      statusMessage: userMessage,
    });
  }

  return {
    success: true,
    account_name: result.data?.account_name,
  };
});
