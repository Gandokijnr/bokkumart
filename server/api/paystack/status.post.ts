import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface StatusBody {
  reference: string;
}

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
      store_id?: string;
      items?: any[];
      delivery_method?: "pickup" | "delivery";
      delivery_details?: any;
      store_address?: string;
      subtotal?: number;
      delivery_fee?: number;
      service_fee?: number;
      pickup_store_id?: string | null;
      payment_expires_at?: string | null;
      routing?: {
        subaccount?: string;
        bearer?: string;
        transaction_charge_kobo?: number;
        platform_percentage?: number | null;
        fixed_commission_naira?: number | null;
      };
    };
  };
};

function generateClaimCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = (await readBody<StatusBody>(event)) || ({} as any);
  const reference = String((body as any)?.reference || "").trim();

  if (!reference) {
    throw createError({
      statusCode: 400,
      statusMessage: "reference is required",
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

  // STEP 1: Check database first
  console.log("[Paystack Status] Looking up order by reference:", reference);
  const { data: orderRow, error: orderErr } = await (admin as any)
    .from("orders")
    .select(
      "id, status, total_amount, delivery_method, confirmation_code, metadata, user_id, paystack_transaction_id, paystack_reference",
    )
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (orderErr) {
    console.error("[Paystack Status] DB lookup error:", orderErr);
    throw createError({
      statusCode: 500,
      statusMessage: orderErr.message,
    });
  }

  console.log("[Paystack Status] Order lookup result:", {
    found: !!orderRow,
    status: orderRow?.status,
    id: orderRow?.id,
  });

  // If already confirmed/paid in DB, return immediately
  if (orderRow && ["paid", "confirmed"].includes(String(orderRow.status))) {
    return {
      status: "confirmed",
      order_id: orderRow.id,
      total_amount: orderRow.total_amount,
      message: "Payment confirmed",
      source: "database",
    };
  }

  // STEP 2: Not confirmed in DB - check with Paystack
  console.log(
    "[Paystack Status] Checking Paystack API for reference:",
    reference,
  );
  const paystackSecret =
    config.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;

  if (!paystackSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Paystack secret key not configured",
    });
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
  console.log("[Paystack Status] Paystack verify response:", {
    status: verifyJson.status,
    dataStatus: verifyJson.data?.status,
    reference: verifyJson.data?.reference,
  });

  if (!verifyRes.ok || !verifyJson.status) {
    // Paystack couldn't verify - payment likely failed or doesn't exist
    return {
      status: "failed",
      reference,
      message: verifyJson.message || "Payment verification failed",
      source: "paystack",
    };
  }

  const tx = verifyJson.data;
  if (!tx) {
    return {
      status: "failed",
      reference,
      message: "Invalid Paystack response",
      source: "paystack",
    };
  }

  const feesKoboRaw = Number((tx as any)?.fees ?? NaN);
  const feesKobo = Number.isFinite(feesKoboRaw) ? feesKoboRaw : null;

  // Check if transaction was actually successful
  if (String(tx.status).toLowerCase() !== "success") {
    return {
      status: "pending",
      reference,
      paystack_status: tx.status,
      message: `Payment is ${tx.status}. Please wait or try again.`,
      source: "paystack",
    };
  }

  // STEP 3: Paystack says success - reconcile database
  console.log(
    "[Paystack Status] Paystack confirmed success, reconciling. Order exists:",
    !!orderRow,
  );

  let resolvedOrder: any = orderRow;
  if (!resolvedOrder && (tx.metadata as any)?.order_id) {
    const metaOrderId = String((tx.metadata as any).order_id || "").trim();
    if (metaOrderId) {
      console.log(
        "[Paystack Status] No order by reference. Looking up by metadata.order_id:",
        metaOrderId,
      );
      const { data: byId, error: byIdErr } = await (admin as any)
        .from("orders")
        .select(
          "id, status, total_amount, delivery_method, confirmation_code, metadata, user_id, paystack_transaction_id, paystack_reference",
        )
        .eq("id", metaOrderId)
        .maybeSingle();

      if (byIdErr) {
        console.error("[Paystack Status] DB lookup by id error:", byIdErr);
        throw createError({
          statusCode: 500,
          statusMessage: byIdErr.message,
        });
      }

      if (byId) {
        resolvedOrder = byId;
        console.log(
          "[Paystack Status] Found order by metadata.order_id:",
          byId.id,
        );
      }
    }
  }

  if (!resolvedOrder && (tx.metadata as any)?.user_id) {
    const metaUserId = String((tx.metadata as any).user_id || "").trim();
    const amountNaira = Number(tx.amount || 0) / 100;

    if (metaUserId && Number.isFinite(amountNaira) && amountNaira > 0) {
      console.log(
        "[Paystack Status] No order by reference/id. Trying fallback lookup by user+amount:",
        { metaUserId, amountNaira },
      );

      const { data: byUserAmt, error: byUserAmtErr } = await (admin as any)
        .from("orders")
        .select(
          "id, status, total_amount, delivery_method, confirmation_code, metadata, user_id, paystack_transaction_id, paystack_reference, payment_method, created_at",
        )
        .eq("user_id", metaUserId)
        .eq("total_amount", amountNaira)
        .eq("payment_method", "paystack")
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byUserAmtErr) {
        console.error(
          "[Paystack Status] Fallback lookup by user+amount error:",
          byUserAmtErr,
        );
      }

      if (byUserAmt) {
        resolvedOrder = byUserAmt;
        console.log(
          "[Paystack Status] Found order by fallback user+amount:",
          byUserAmt.id,
        );
      }
    }
  }

  // If we have an existing order, update it
  if (resolvedOrder) {
    console.log("[Paystack Status] Updating existing order:", resolvedOrder.id);
    // Validate amount matches
    const amountNaira = Number(tx.amount || 0) / 100;
    const expected = Number(resolvedOrder.total_amount || 0);
    if (
      Number.isFinite(expected) &&
      expected > 0 &&
      Math.abs(amountNaira - expected) > 0.01
    ) {
      return {
        status: "mismatch",
        order_id: resolvedOrder.id,
        reference,
        message: "Payment amount does not match order",
        source: "reconcile",
      };
    }

    // Check if already linked to a different transaction
    if (
      resolvedOrder.paystack_transaction_id &&
      String(resolvedOrder.paystack_transaction_id) !== String(tx.id)
    ) {
      return {
        status: "conflict",
        order_id: resolvedOrder.id,
        reference,
        message: "Order already linked to a different transaction",
        source: "reconcile",
      };
    }

    const deliveryMethodRaw = String(resolvedOrder.delivery_method || "");
    const deliveryMethodNorm = deliveryMethodRaw.toLowerCase();
    const isPickup =
      deliveryMethodNorm === "pickup" || deliveryMethodNorm === "pick";

    // Generate confirmation code for ALL orders
    const claimCode = resolvedOrder.confirmation_code || generateClaimCode();

    const qrPayload =
      isPickup && claimCode
        ? JSON.stringify({ order_id: resolvedOrder.id, claim_code: claimCode })
        : null;

    const mergedMetadata = {
      ...(resolvedOrder.metadata || {}),
      payment_channel: tx.channel,
      customer_email: tx.customer?.email,
      currency: tx.currency,
      ...(isPickup && claimCode ? { pickup_claim_qr: qrPayload } : {}),
    };

    const transactionChargeKoboRaw = Number(
      (tx.metadata as any)?.routing?.transaction_charge_kobo ?? NaN,
    );
    const transactionChargeKobo = Number.isFinite(transactionChargeKoboRaw)
      ? transactionChargeKoboRaw
      : null;

    const paymentSplitLog = {
      paystack_reference: reference,
      paystack_transaction_id: String(tx.id),
      store_id: (tx.metadata as any)?.store_id || null,
      subaccount: (tx.metadata as any)?.routing?.subaccount || null,
      bearer: (tx.metadata as any)?.routing?.bearer || null,
      transaction_charge_kobo: transactionChargeKobo,
      platform_percentage:
        Number((tx.metadata as any)?.routing?.platform_percentage ?? NaN) ||
        null,
      fixed_commission_naira:
        Number((tx.metadata as any)?.routing?.fixed_commission_naira ?? NaN) ||
        null,
      fees_kobo: feesKobo,
      platform_net_kobo:
        feesKobo !== null && transactionChargeKobo !== null
          ? Math.max(0, transactionChargeKobo - feesKobo)
          : null,
      paid_at: tx.paid_at || null,
    };

    // Idempotent update - only if not already confirmed
    console.log("[Paystack Status] Executing order update...");
    const { data: updated, error: updateErr } = await (admin as any)
      .from("orders")
      .update({
        status: "confirmed",
        paystack_transaction_id: String(tx.id),
        paid_at: tx.paid_at || new Date().toISOString(),
        paystack_reference: resolvedOrder.paystack_reference || reference,
        confirmation_code: claimCode, // All orders get a confirmation code
        payment_split_log: paymentSplitLog,
        metadata: mergedMetadata,
      })
      .eq("id", resolvedOrder.id)
      .not("status", "in", "(paid,confirmed)")
      .select("id, status, total_amount")
      .maybeSingle();

    if (updateErr) {
      console.error("[Paystack Status] Order update error:", updateErr);
      throw createError({
        statusCode: 500,
        statusMessage: updateErr.message,
      });
    }

    console.log("[Paystack Status] Order update result:", {
      updated: !!updated,
    });

    // Return success even if row wasn't updated (idempotent)
    return {
      status: "confirmed",
      order_id: resolvedOrder.id,
      total_amount: resolvedOrder.total_amount,
      message: "Payment confirmed and order updated",
      source: updated?.id ? "reconcile" : "database",
      reconciled: !!updated?.id,
    };
  }

  return {
    status: "conflict",
    reference,
    message:
      "Payment was successful on Paystack but no matching order was found to update.",
    source: "reconcile",
  };
});
