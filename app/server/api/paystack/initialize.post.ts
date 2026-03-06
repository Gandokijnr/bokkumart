import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface PaystackInitializeRequest {
  email: string;
  amount: number; // in kobo (Naira * 100)
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
  callback_url?: string;
}

interface PaystackResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

type PaystackInitMetadata = {
  authorization_url?: string;
  access_code?: string;
  reference?: string;
  initialized_at?: string;
};

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = await readBody<PaystackInitializeRequest>(event);

    // Validate required fields
    if (!body.email || !body.amount || !body.metadata) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields: email, amount, metadata",
      });
    }

    // Validate amount (minimum 100 kobo = ₦1)
    if (body.amount < 100) {
      throw createError({
        statusCode: 400,
        statusMessage: "Amount must be at least 100 kobo (₦1)",
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

    // Validate order is still payable (prevents paying for cancelled/paid orders)
    const orderId = body.metadata?.order_id;
    if (!orderId) {
      throw createError({
        statusCode: 400,
        statusMessage: "metadata.order_id is required",
      });
    }

    const userId = String((body as any)?.metadata?.user_id || "").trim();
    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: "metadata.user_id is required",
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as ReturnType<typeof createClient<Database>>;

    const { data: orderRow, error: orderErr } = await (admin as any)
      .from("orders")
      .select(
        "id, status, payment_method, items, store_id, user_id, paystack_reference, metadata",
      )
      .eq("id", orderId)
      .single();

    if (orderErr || !orderRow) {
      throw createError({
        statusCode: 400,
        statusMessage: orderErr?.message || "Order not found",
      });
    }

    if (String(orderRow.payment_method) !== "paystack") {
      throw createError({
        statusCode: 400,
        statusMessage: "Order is not an online-payment order",
      });
    }

    if (String(orderRow.status) !== "pending") {
      throw createError({
        statusCode: 400,
        statusMessage: `Order is not payable (status: ${orderRow.status})`,
      });
    }

    if (String((orderRow as any).user_id || "") !== userId) {
      throw createError({
        statusCode: 403,
        statusMessage: "Order does not belong to this user",
      });
    }

    const existingReference = String(
      (orderRow as any)?.paystack_reference || "",
    ).trim();
    const existingInit = ((orderRow as any)?.metadata as any)?.paystack_init as
      | PaystackInitMetadata
      | undefined;
    if (existingReference) {
      const existingAuthUrl = String(
        existingInit?.authorization_url || "",
      ).trim();
      const existingAccessCode = String(existingInit?.access_code || "").trim();

      if (existingAuthUrl) {
        return {
          success: true,
          authorization_url: existingAuthUrl,
          reference: existingReference,
          access_code: existingAccessCode || undefined,
        };
      }

      throw createError({
        statusCode: 409,
        statusMessage:
          "A payment attempt is already in progress for this order. Please refresh and try again.",
      });
    }

    const { data: storeRow, error: storeErr } = await (admin as any)
      .from("stores")
      .select(
        "id, paystack_subaccount_code, platform_percentage, fixed_commission",
      )
      .eq("id", String(orderRow.store_id))
      .single();

    if (storeErr || !storeRow) {
      throw createError({
        statusCode: 400,
        statusMessage: storeErr?.message || "Store not found",
      });
    }

    const subaccountCode = storeRow.paystack_subaccount_code
      ? String(storeRow.paystack_subaccount_code)
      : null;

    if (!subaccountCode) {
      throw createError({
        statusCode: 400,
        statusMessage: "This store is not configured for online payments",
      });
    }

    const toFiniteNumberOrNull = (v: any): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const platformPercentage = toFiniteNumberOrNull(
      (storeRow as any).platform_percentage,
    );

    const fixedCommissionNaira = toFiniteNumberOrNull(
      (storeRow as any).fixed_commission,
    );

    const amountKobo = Number(body.amount || 0);
    const fixedCommissionKobo = fixedCommissionNaira
      ? Math.max(0, Math.round(fixedCommissionNaira * 100))
      : 0;

    const percentageCommissionKobo =
      platformPercentage !== null
        ? Math.max(0, Math.round((amountKobo * platformPercentage) / 100))
        : 0;

    const transactionChargeKobo = Math.min(
      amountKobo,
      Math.max(fixedCommissionKobo, percentageCommissionKobo),
    );

    // Optional stock recheck right before payment initialization
    if ((config as any).inventoryRecheckBeforePayment) {
      const items = Array.isArray(orderRow.items) ? orderRow.items : [];
      const productIds = Array.from(
        new Set(
          items.map((i: any) => String(i?.product_id || "")).filter(Boolean),
        ),
      );
      if (productIds.length > 0) {
        const { data: invRows, error: invErr } = await (admin as any)
          .from("store_inventory")
          .select("product_id, available_stock, digital_buffer, is_visible")
          .eq("store_id", String(orderRow.store_id))
          .in("product_id", productIds);

        if (invErr) {
          throw createError({ statusCode: 500, statusMessage: invErr.message });
        }

        const invMap = new Map<string, any>();
        for (const r of (invRows || []) as any[])
          invMap.set(String(r.product_id), r);

        for (const it of items as any[]) {
          const pid = String(it?.product_id || "");
          const qty = Number(it?.quantity || 0);
          if (!pid || !Number.isFinite(qty) || qty <= 0) continue;

          const inv = invMap.get(pid);
          const rawAvail = inv ? Number(inv.available_stock || 0) : 0;
          const buffer = inv ? Number(inv.digital_buffer || 0) : 0;
          const avail = Math.max(0, rawAvail - buffer);
          const visible = inv ? !!inv.is_visible : false;

          if (!inv || !visible || avail < qty) {
            throw createError({
              statusCode: 409,
              statusMessage:
                "Some items are no longer available. Please refresh your cart.",
            });
          }
        }
      }
    }

    // Build callback URL
    const siteUrlRaw = config.public.siteUrl || "http://localhost:3000";
    const siteUrl = String(siteUrlRaw).replace(/\/+$/, "");

    const callbackUrl = body.callback_url
      ? new URL(String(body.callback_url), siteUrl).toString()
      : `${siteUrl}/checkout/verify`;

    const customerName = String(
      (body as any)?.metadata?.customer_name || "",
    ).trim();
    const customerPhone = String(
      (body as any)?.metadata?.customer_phone || "",
    ).trim();

    // Prepare Paystack payload
    const payload = {
      email: body.email,
      amount: body.amount,
      currency: "NGN",
      callback_url: callbackUrl,
      subaccount: subaccountCode,
      bearer: "account",
      transaction_charge: transactionChargeKobo,
      metadata: {
        ...body.metadata,
        routing: {
          store_id: String(orderRow.store_id),
          subaccount: subaccountCode,
          bearer: "account",
          transaction_charge_kobo: transactionChargeKobo,
          platform_percentage: platformPercentage,
          fixed_commission_naira: fixedCommissionNaira,
        },
        custom_fields: [
          {
            display_name: "Store",
            variable_name: "store_name",
            value: body.metadata.store_id,
          },
          {
            display_name: "Delivery Method",
            variable_name: "delivery_method",
            value: body.metadata.delivery_method,
          },
          ...(customerName
            ? [
                {
                  display_name: "Customer Name",
                  variable_name: "customer_name",
                  value: customerName,
                },
              ]
            : []),
          ...(customerPhone
            ? [
                {
                  display_name: "Customer Phone",
                  variable_name: "customer_phone",
                  value: customerPhone,
                },
              ]
            : []),
        ],
      },
    };

    // Call Paystack API
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const result: PaystackResponse = await response.json();

    if (!response.ok || !result.status) {
      console.error("Paystack initialize error:", result);
      throw createError({
        statusCode: 400,
        statusMessage: result.message || "Failed to initialize payment",
      });
    }

    const initMeta: PaystackInitMetadata = {
      authorization_url: result.data?.authorization_url,
      access_code: result.data?.access_code,
      reference: result.data?.reference,
      initialized_at: new Date().toISOString(),
    };

    const mergedMetadata = {
      ...(((orderRow as any)?.metadata || {}) as any),
      paystack_init: initMeta,
    };

    const { error: updateErr } = await ((admin as any).from("orders") as any)
      .update({
        paystack_reference: result.data?.reference || null,
        metadata: mergedMetadata,
      })
      .eq("id", orderId);

    if (updateErr) {
      throw createError({ statusCode: 500, statusMessage: updateErr.message });
    }

    // Return authorization URL for redirect
    return {
      success: true,
      authorization_url: result.data?.authorization_url,
      reference: result.data?.reference,
      access_code: result.data?.access_code,
    };
  } catch (error: any) {
    console.error("Paystack initialize error:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
