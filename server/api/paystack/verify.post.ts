import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

type RateEntry = { count: number; resetAt: number };
const rateBucket = new Map<string, RateEntry>();

function consumeRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const existing = rateBucket.get(key);

  if (!existing || existing.resetAt <= now) {
    rateBucket.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= limit) {
    throw createError({ statusCode: 429, statusMessage: "Too many requests" });
  }

  existing.count += 1;
  rateBucket.set(key, existing);
}

type VerifyBody = {
  reference: string;
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at?: string;
    channel?: string;
    customer?: {
      email?: string;
    };
    metadata?: {
      order_id?: string;
      user_id?: string;
    };
  };
};

function generateClaimCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = (await readBody<VerifyBody>(event)) || ({} as any);
  const reference = String((body as any)?.reference || "").trim();

  if (!reference) {
    throw createError({
      statusCode: 400,
      statusMessage: "reference is required",
    });
  }

  const xff = event.node.req.headers["x-forwarded-for"];
  const ipFromXff = Array.isArray(xff) ? xff[0] : xff;
  const ip = String(
    (ipFromXff || "").split(",")[0] ||
      event.node.req.socket?.remoteAddress ||
      "unknown",
  ).trim();

  const windowMs = 60_000;
  consumeRateLimit(`paystack_verify:ip:${ip}`, 60, windowMs);
  consumeRateLimit(`paystack_verify:ref:${reference}`, 12, windowMs);

  const paystackSecret =
    config.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Paystack secret key not configured",
    });
  }

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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as ReturnType<typeof createClient<Database>>;

  const authHeader = event.node.req.headers["authorization"];
  const bearer = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token =
    typeof bearer === "string" && bearer.startsWith("Bearer ")
      ? bearer.slice("Bearer ".length)
      : null;

  const caller = token ? await (admin as any).auth.getUser(token) : null;
  const callerUserId = caller?.data?.user?.id
    ? String(caller.data.user.id)
    : null;
  if (token && (!callerUserId || caller?.error)) {
    throw createError({ statusCode: 401, statusMessage: "Invalid session" });
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    },
  );

  const verifyJson = (await verifyRes.json()) as PaystackVerifyResponse;

  if (!verifyRes.ok || !verifyJson.status) {
    throw createError({
      statusCode: 400,
      statusMessage: verifyJson.message || "Failed to verify transaction",
    });
  }

  const tx = verifyJson.data;
  if (!tx?.reference) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Paystack verify response",
    });
  }

  if (tx.reference !== reference) {
    throw createError({ statusCode: 400, statusMessage: "Reference mismatch" });
  }

  if (tx.currency && String(tx.currency).toUpperCase() !== "NGN") {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported currency",
    });
  }

  const { data: orderRow, error: orderErr } = await (admin as any)
    .from("orders")
    .select(
      "id, status, total_amount, delivery_method, confirmation_code, metadata, user_id, paystack_transaction_id",
    )
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (orderErr) {
    throw createError({ statusCode: 500, statusMessage: orderErr.message });
  }

  if (!orderRow) {
    return {
      ok: false,
      verified: tx.status === "success",
      reason: "Order not found for reference",
    };
  }

  const orderUserId = (orderRow as any).user_id
    ? String((orderRow as any).user_id)
    : null;
  if (callerUserId && orderUserId && callerUserId !== orderUserId) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const metaUserId = tx.metadata?.user_id ? String(tx.metadata.user_id) : null;
  const metaOrderId = tx.metadata?.order_id
    ? String(tx.metadata.order_id)
    : null;
  if (orderUserId && metaUserId && metaUserId !== orderUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Transaction does not match order user",
    });
  }
  if (metaOrderId && String(orderRow.id) !== metaOrderId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Transaction does not match order",
    });
  }

  if (["paid", "confirmed"].includes(String(orderRow.status))) {
    return { ok: true, verified: true, order_id: orderRow.id };
  }

  if (
    (orderRow as any).paystack_transaction_id &&
    String((orderRow as any).paystack_transaction_id) !== String(tx.id)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Order already linked to a different transaction",
    });
  }

  const { data: txUsed } = await (admin as any)
    .from("orders")
    .select("id")
    .eq("paystack_transaction_id", String(tx.id))
    .maybeSingle();

  if (txUsed?.id && String(txUsed.id) !== String(orderRow.id)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Transaction already used",
    });
  }

  const isSuccess = String(tx.status) === "success";
  if (!isSuccess) {
    return {
      ok: true,
      verified: false,
      order_id: orderRow.id,
      status: tx.status,
    };
  }

  const amountNaira = Number(tx.amount || 0) / 100;
  const expected = Number(orderRow.total_amount || 0);
  if (
    Number.isFinite(expected) &&
    expected > 0 &&
    Math.abs(amountNaira - expected) > 0.01
  ) {
    return {
      ok: false,
      verified: false,
      order_id: orderRow.id,
      reason: "Amount mismatch",
    };
  }

  const isPickup = String(orderRow.delivery_method) === "pickup";
  // Generate confirmation code for ALL orders
  const claimCode = orderRow.confirmation_code || generateClaimCode();
  const qrPayload =
    isPickup && claimCode
      ? JSON.stringify({ order_id: orderRow.id, claim_code: claimCode })
      : null;

  const mergedMetadata = {
    ...(orderRow.metadata || {}),
    payment_channel: tx.channel,
    customer_email: tx.customer?.email,
    currency: tx.currency,
    ...(isPickup && claimCode ? { pickup_claim_qr: qrPayload } : {}),
  };

  const paymentSplitLog = {
    paystack_reference: reference,
    paystack_transaction_id: String(tx.id),
    store_id: (tx.metadata as any)?.store_id || null,
    subaccount: (tx.metadata as any)?.routing?.subaccount || null,
    bearer: (tx.metadata as any)?.routing?.bearer || null,
    transaction_charge_kobo:
      (tx.metadata as any)?.routing?.transaction_charge_kobo || null,
    platform_percentage:
      (tx.metadata as any)?.routing?.platform_percentage ?? null,
    fixed_commission_naira:
      (tx.metadata as any)?.routing?.fixed_commission_naira ?? null,
    paid_at: tx.paid_at || null,
  };

  const { data: updated, error: updateErr } = await (admin as any)
    .from("orders")
    .update({
      status: "confirmed",
      paystack_transaction_id: String(tx.id),
      paid_at: tx.paid_at || new Date().toISOString(),
      confirmation_code: claimCode, // All orders get a confirmation code
      payment_split_log: paymentSplitLog,
      metadata: mergedMetadata,
    })
    .eq("id", orderRow.id)
    .not("status", "in", "(paid,confirmed)")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    throw createError({ statusCode: 500, statusMessage: updateErr.message });
  }

  if (!updated?.id) {
    return { ok: true, verified: true, order_id: orderRow.id };
  }

  return { ok: true, verified: true, order_id: orderRow.id };
});
