import { defineEventHandler, readBody, createError } from "h3";

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
