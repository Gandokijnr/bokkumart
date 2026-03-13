import { defineEventHandler, createError, getHeader, readRawBody } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";
import crypto from "node:crypto";
import { sendOrderStatusNotifications } from "../../services/notificationService";

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
      customer_name?: string;
      customer_phone?: string;
    };
    customer: {
      id: number;
      email: string;
    };
  };
}

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
    const rawBody = await readRawBody(event);
    if (!rawBody) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing request body",
      });
    }

    const body = JSON.parse(rawBody) as PaystackWebhookEvent;

    const paystackSecret =
      config.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    const signature = getHeader(event, "x-paystack-signature");

    if (!signature) {
      throw createError({
        statusCode: 401,
        statusMessage: "Missing Paystack signature",
      });
    }

    if (!paystackSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: "Paystack secret key not configured",
      });
    }

    const computed = crypto
      .createHmac("sha512", paystackSecret)
      .update(rawBody)
      .digest("hex");

    if (computed !== signature) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid Paystack signature",
      });
    }

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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as ReturnType<typeof createClient<Database>>;

    const metaOrderId = data.metadata?.order_id
      ? String(data.metadata.order_id)
      : null;

    let orderQuery = (supabase as any)
      .from("orders")
      .select("id, status, confirmation_code, metadata, paystack_reference");

    if (metaOrderId) {
      orderQuery = orderQuery.eq("id", metaOrderId);
    } else {
      orderQuery = orderQuery.eq("paystack_reference", data.reference);
    }

    const { data: existingOrder, error: fetchError } =
      await orderQuery.single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching order:", fetchError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch order",
      });
    }

    if (
      existingOrder &&
      ["confirmed", "paid"].includes(String((existingOrder as any).status))
    ) {
      return {
        received: true,
        processed: false,
        reason: "Order already processed",
      };
    }

    const isPickup = data.metadata.delivery_method === "pickup";
    // Generate confirmation code for ALL orders (not just pickup)
    const claimCode = generateClaimCode();
    const qrPayload =
      isPickup && claimCode
        ? JSON.stringify({
            order_id: (existingOrder as any)?.id || data.metadata.order_id,
            claim_code: claimCode,
          })
        : null;

    if (existingOrder) {
      const mergedMetadata = {
        ...((existingOrder as any).metadata || {}),
        payment_channel: data.channel,
        customer_email: data.customer.email,
        ip_address: data.ip_address,
        currency: data.currency,
        platform: "homeaffairs-digital",
        ...(isPickup && claimCode ? { pickup_claim_qr: qrPayload } : {}),
      };

      // Note: platform no longer tracks per-transaction commission
      // Revenue is calculated monthly via platform_revenue table
      const { error: updateError } = await (
        (supabase as any).from("orders") as any
      )
        .update({
          status: "confirmed",
          paystack_reference:
            (existingOrder as any).paystack_reference || data.reference,
          paystack_transaction_id: data.id.toString(),
          paid_at: data.paid_at,
          service_fee:
            typeof data.metadata.service_fee === "number"
              ? data.metadata.service_fee
              : undefined,
          confirmation_code: claimCode, // All orders get a confirmation code
          channel: "platform",
          payment_status: "paid",
          metadata: mergedMetadata,
        })
        .eq("id", (existingOrder as any).id);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to update order",
        });
      }

      // Send push notification for payment successful
      try {
        await sendOrderStatusNotifications(event, "payment_successful", {
          orderId: (existingOrder as any).id,
          customerId: data.metadata.user_id,
          customerName: data.metadata.customer_name,
          storeId: data.metadata.store_id,
          status: "confirmed",
          url: `/orders/${(existingOrder as any).id}`,
        });
      } catch (notifyErr) {
        console.error("[Push Notification] Failed to send:", notifyErr);
      }
    } else {
      const insertPayload: any = {
        user_id: data.metadata.user_id,
        store_id: data.metadata.store_id,
        items: data.metadata.items,
        subtotal: data.metadata.subtotal,
        delivery_fee: data.metadata.delivery_fee,
        service_fee:
          typeof data.metadata.service_fee === "number"
            ? data.metadata.service_fee
            : 0,
        total_amount: data.amount / 100,
        status: "confirmed",
        channel: "platform",
        payment_status: "paid",
        delivery_method: data.metadata.delivery_method,
        contact_name: data.metadata.customer_name,
        contact_phone: data.metadata.customer_phone,
        delivery_details: {
          ...data.metadata.delivery_details,
          ...(isPickup && {
            store_address: data.metadata.store_address,
          }),
        },
        paystack_reference: data.reference,
        paystack_transaction_id: data.id.toString(),
        paid_at: data.paid_at,
        payment_method: "online",
        confirmation_code: claimCode, // All orders get a confirmation code
        metadata: {
          payment_channel: data.channel,
          customer_email: data.customer.email,
          ip_address: data.ip_address,
          currency: data.currency,
          platform: "homeaffairs-digital",
          ...(isPickup && claimCode ? { pickup_claim_qr: qrPayload } : {}),
        },
      };

      const { error: insertError } = await (
        (supabase as any).from("orders") as any
      ).insert(insertPayload);

      if (insertError) {
        console.error("Error creating order:", insertError);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to create order",
        });
      }

      // Send push notification for new order placed
      try {
        const { data: newOrder } = await (supabase as any)
          .from("orders")
          .select("id, order_number")
          .eq("paystack_reference", data.reference)
          .single();

        if (newOrder) {
          await sendOrderStatusNotifications(event, "order_placed", {
            orderId: newOrder.id,
            orderNumber: newOrder.order_number,
            customerId: data.metadata.user_id,
            customerName: data.metadata.customer_name,
            storeId: data.metadata.store_id,
            status: "confirmed",
            url: `/orders/${newOrder.id}`,
          });
        }
      } catch (notifyErr) {
        console.error("[Push Notification] Failed to send:", notifyErr);
      }
    }

    return {
      received: true,
      processed: true,
      reference: data.reference,
      order_id: (existingOrder as any)?.id || "new",
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
