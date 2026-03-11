import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface PaystackInitializeRequest {
  email: string;
  amount: number; // in kobo (Naira * 100) - total customer pays
  platform_fee_kobo?: number; // Platform fee for processing & packaging (what platform keeps)
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
    platform_fee?: number;
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as ReturnType<typeof createClient<Database>>;

    const storeId = String(body.metadata?.store_id || "").trim();
    if (!storeId) {
      throw createError({
        statusCode: 400,
        statusMessage: "metadata.store_id is required",
      });
    }

    const { data: storeRow, error: storeErr } = await (admin as any)
      .from("stores")
      .select("id, paystack_subaccount_code")
      .eq("id", storeId)
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

    // Platform fee (Processing & Packaging fee) - what platform keeps
    const platformFeeKobo = Math.max(
      0,
      Math.round(Number(body.platform_fee_kobo || 0)),
    );

    // Price Parity Configuration:
    // Customer pays: subtotal + platform_fee
    // Store must receive: EXACT subtotal (in-store price)
    // Platform bears: Paystack fee (1.5% + ₦100)
    //
    // Solution:
    // - bearer: "account" means main (platform) account bears Paystack fees
    // - transaction_charge: platform fee goes to main account
    // - subaccount receives: amount - transaction_charge = store subtotal
    // - Since bearer is "account", Paystack fee is deducted from main account
    // Result: Store gets EXACT subtotal (price parity achieved)

    // Calculate what Paystack will charge (1.5% + ₦100 on total)
    const totalAmountKobo = body.amount;
    const paystackFeeKobo = Math.round(totalAmountKobo * 0.015) + 100;

    // Store subtotal in kobo (what store should receive)
    const storeSubtotalKobo = totalAmountKobo - platformFeeKobo;

    // Build callback URL
    const siteUrlRaw = config.public.siteUrl || "http://localhost:3000";
    const siteUrl = String(siteUrlRaw).replace(/\/+$/, "");

    const callbackUrl = body.callback_url
      ? new URL(String(body.callback_url), siteUrl).toString()
      : `${siteUrl}/checkout/verify`;

    const payload = {
      email: body.email,
      amount: body.amount,
      currency: "NGN",
      callback_url: callbackUrl,
      subaccount: subaccountCode,
      bearer: "account", // Platform (main account) bears Paystack fees - ensures price parity
      transaction_charge: platformFeeKobo, // Platform keeps this amount
      metadata: {
        ...body.metadata,
        platform: "homeaffairs-digital",
        price_parity: {
          store_receives_exact_subtotal: true,
          platform_bears_paystack_fee: true,
          store_name: storeRow.name,
          store_id: storeId,
          subaccount: subaccountCode,
          subtotal_kobo: storeSubtotalKobo,
          platform_fee_kobo: platformFeeKobo,
          paystack_fee_kobo: paystackFeeKobo,
          total_customer_paid_kobo: totalAmountKobo,
          settlement: {
            store_gets_kobo: storeSubtotalKobo,
            platform_gets_kobo: Math.max(0, platformFeeKobo - paystackFeeKobo), // Platform profit after Paystack
            paystack_takes_kobo: paystackFeeKobo,
          },
        },
        custom_fields: [
          {
            display_name: "Store",
            variable_name: "store_name",
            value: storeRow.name || body.metadata.store_id,
          },
          {
            display_name: "Delivery Method",
            variable_name: "delivery_method",
            value: body.metadata.delivery_method,
          },
          {
            display_name: "Processing Fee",
            variable_name: "processing_fee",
            value: `₦${(platformFeeKobo / 100).toLocaleString()}`,
          },
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

    // Return authorization URL for redirect
    return {
      success: true,
      authorization_url: result.data?.authorization_url,
      reference: result.data?.reference,
      access_code: result.data?.access_code,
      settlement_preview: {
        store_receives: storeSubtotalKobo / 100,
        platform_receives: Math.max(
          0,
          (platformFeeKobo - paystackFeeKobo) / 100,
        ),
        paystack_fee: paystackFeeKobo / 100,
        customer_paid: totalAmountKobo / 100,
      },
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
