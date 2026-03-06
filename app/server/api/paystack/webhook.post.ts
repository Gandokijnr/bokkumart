import { defineEventHandler, createError, getHeader, readRawBody } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    reference: string;
    status: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      order_id?: string;
      user_id: string;
      store_id: string;
      items: Array<{
        product_id: string;
        name: string;
        quantity: number;
        price: number;
      }>;
      delivery_method: "pickup" | "delivery";
      delivery_details?: {
        area?: string;
        street?: string;
        houseNumber?: string;
        landmark?: string;
        contactPhone: string;
      };
      store_address?: string;
      subtotal: number;
      delivery_fee: number;
      service_fee?: number;
      pickup_store_id?: string | null;
      payment_expires_at?: string | null;
    };
    customer: {
      id: number;
      email: string;
    };
  };
}

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: any;
};

function generateClaimCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const rawBody = (await readRawBody(event)) as string;

    // Verify webhook signature (required)
    const paystackSecret =
      config.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    const signature = getHeader(event, "x-paystack-signature");

    if (!paystackSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: "Paystack secret key not configured",
      });
    }

    if (!signature) {
      throw createError({
        statusCode: 401,
        statusMessage: "Missing Paystack signature",
      });
    }

    if (!rawBody) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing request body",
      });
    }

    const crypto = await import("crypto");
    const expectedHex = crypto
      .createHmac("sha512", paystackSecret)
      .update(rawBody)
      .digest("hex");

    const sigOk = (() => {
      try {
        const expected = Buffer.from(expectedHex, "hex");
        const received = Buffer.from(String(signature), "hex");
        if (expected.length !== received.length) return false;
        return crypto.timingSafeEqual(expected, received);
      } catch {
        return false;
      }
    })();

    if (!sigOk) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid Paystack signature",
      });
    }

    let body: PaystackWebhookEvent;
    try {
      body = JSON.parse(rawBody) as PaystackWebhookEvent;
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid webhook payload",
      });
    }

    // Only process successful charges
    if (body.event !== "charge.success") {
      return {
        received: true,
        processed: false,
        reason: "Not a successful charge",
      };
    }

    const { data } = body;

    if (!data.reference || !data.metadata) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid webhook payload",
      });
    }

    const orderId = String((data.metadata as any)?.order_id || "").trim();
    if (!orderId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid webhook payload",
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

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as ReturnType<typeof createClient<Database>>;

    // Primary idempotency key: order_id from metadata
    const { data: existingOrder, error: fetchError } = await (supabase as any)
      .from("orders")
      .select(
        "id, status, confirmation_code, metadata, paystack_reference, payment_method",
      )
      .eq("id", orderId)
      .single();

    if (fetchError || !existingOrder) {
      console.error("Error fetching order:", fetchError);
      throw createError({ statusCode: 404, statusMessage: "Order not found" });
    }

    if (String((existingOrder as any).payment_method) !== "paystack") {
      throw createError({
        statusCode: 400,
        statusMessage: "Order is not an online-payment order",
      });
    }

    // If already paid, webhook retries are no-ops
    if ((existingOrder as any).status === "paid") {
      return { received: true, processed: false, reason: "Order already paid" };
    }

    const currentRef = String(
      (existingOrder as any).paystack_reference || "",
    ).trim();
    if (currentRef && currentRef !== String(data.reference)) {
      throw createError({
        statusCode: 409,
        statusMessage: "Payment reference mismatch for this order",
      });
    }

    const isPickup = data.metadata.delivery_method === "pickup";
    const claimCode = isPickup
      ? (existingOrder as any)?.confirmation_code || generateClaimCode()
      : null;
    const qrPayload =
      isPickup && claimCode
        ? JSON.stringify({
            order_id: (existingOrder as any)?.id || orderId,
            claim_code: claimCode,
          })
        : null;

    const mergedMetadata = {
      ...((existingOrder as any).metadata || {}),
      payment_channel: data.channel,
      customer_email: data.customer.email,
      ip_address: data.ip_address,
      currency: data.currency,
      ...(isPickup && claimCode ? { pickup_claim_qr: qrPayload } : {}),
    };

    const paymentSplitLog = {
      paystack_reference: String(data.reference),
      paystack_transaction_id: String(data.id),
      store_id: (data.metadata as any)?.store_id || null,
      subaccount: (data.metadata as any)?.routing?.subaccount || null,
      bearer: (data.metadata as any)?.routing?.bearer || null,
      transaction_charge_kobo:
        Number(
          (data.metadata as any)?.routing?.transaction_charge_kobo ?? NaN,
        ) || null,
      platform_percentage:
        Number((data.metadata as any)?.routing?.platform_percentage ?? NaN) ||
        null,
      fixed_commission_naira:
        Number(
          (data.metadata as any)?.routing?.fixed_commission_naira ?? NaN,
        ) || null,
      paid_at: data.paid_at || null,
    };

    let feesKobo: number | null = null;
    try {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(data.reference))}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
          },
        },
      );
      const verifyJson = (await verifyRes.json()) as PaystackVerifyResponse;
      const fee = Number((verifyJson as any)?.data?.fees ?? NaN);
      feesKobo = Number.isFinite(fee) ? fee : null;
    } catch {
      // best-effort
    }

    const normalizedPaymentSplitLog = {
      ...paymentSplitLog,
      transaction_charge_kobo: paymentSplitLog.transaction_charge_kobo || 0,
      platform_percentage: paymentSplitLog.platform_percentage || 0,
      fixed_commission_naira: paymentSplitLog.fixed_commission_naira || 0,
      fees_kobo: feesKobo,
      platform_net_kobo:
        feesKobo !== null
          ? Math.max(
              0,
              (paymentSplitLog.transaction_charge_kobo || 0) - feesKobo,
            )
          : null,
    };

    const { error: updateError } = await (supabase as any)
      .from("orders")
      .update({
        status: "paid",
        paystack_reference: data.reference,
        paystack_transaction_id: String(data.id),
        paid_at: data.paid_at,
        confirmation_code: isPickup ? claimCode : null,
        payment_split_log: normalizedPaymentSplitLog,
        metadata: mergedMetadata,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to update order",
      });
    }

    // Deduct loyalty points if points were redeemed for this order
    try {
      const { data: orderData } = await (supabase as any)
        .from("orders")
        .select("user_id, points_redeemed")
        .eq("id", orderId)
        .single();

      const pointsRedeemed = Number(orderData?.points_redeemed || 0);
      const userId = orderData?.user_id;

      if (pointsRedeemed > 0 && userId) {
        // Get current loyalty points
        const { data: profileData } = await (supabase as any)
          .from("profiles")
          .select("loyalty_points")
          .eq("id", userId)
          .single();

        const currentPoints = Number(profileData?.loyalty_points || 0);
        const newPoints = Math.max(0, currentPoints - pointsRedeemed);

        // Update user's loyalty points
        await (supabase as any)
          .from("profiles")
          .update({
            loyalty_points: newPoints,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // Log the redemption transaction
        await (supabase as any).from("loyalty_transactions").insert({
          user_id: userId,
          order_id: orderId,
          points: pointsRedeemed,
          type: "redeemed",
          description: `Redeemed ${pointsRedeemed} points for order discount`,
          created_at: new Date().toISOString(),
        });

        console.log(
          `[Loyalty] Deducted ${pointsRedeemed} points from user ${userId} for order ${orderId}`,
        );
      }
    } catch (e) {
      console.error("[Loyalty] Failed to deduct points:", e);
      // Don't fail the webhook if loyalty deduction fails
    }

    // Return success response to Paystack
    return {
      received: true,
      processed: true,
      reference: data.reference,
      order_id: (existingOrder as any)?.id,
    };
  } catch (error: any) {
    console.error("Paystack webhook error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Webhook processing failed",
    });
  }
});
