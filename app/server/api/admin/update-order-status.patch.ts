import { defineEventHandler, readBody, createError } from "h3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

interface UpdateOrderStatusBody {
  orderId: string;
  newStatus?: Database["public"]["Tables"]["orders"]["Row"]["status"];
  status?: Database["public"]["Tables"]["orders"]["Row"]["status"];
}

function normalizePhoneToE164(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";

  // Nigeria defaults
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  return digits;
}

function buildWhatsAppUrl(phoneE164: string, message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phoneE164}?text=${encoded}`;
}

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

  const isBranchManager = callerProfile?.role === "branch_manager";
  const isSuperAdmin = callerProfile?.role === "super_admin";
  const isStaff = callerProfile?.role === "staff";

  if (!isBranchManager && !isSuperAdmin && !isStaff) {
    throw createError({ statusCode: 403, statusMessage: "Not authorized" });
  }

  const rawBody = await readBody<any>(event);
  const body: UpdateOrderStatusBody | null = (() => {
    if (!rawBody) return null;
    if (typeof rawBody === "string") {
      try {
        return JSON.parse(rawBody) as UpdateOrderStatusBody;
      } catch {
        return null;
      }
    }
    return rawBody as UpdateOrderStatusBody;
  })();

  const desiredStatus = body?.newStatus ?? body?.status;

  if (!body?.orderId || !desiredStatus) {
    throw createError({
      statusCode: 400,
      statusMessage: "orderId and status are required",
    });
  }

  const { data: existingOrder, error: fetchErr } = await (admin as any)
    .from("orders")
    .select(
      "id, user_id, status, delivery_method, delivery_details, contact_phone, metadata, store_id, items, subtotal, total_amount, delivery_fee, points_discount_amount",
    )
    .eq("id", body.orderId)
    .single();

  if (fetchErr || !existingOrder) {
    throw createError({
      statusCode: 400,
      statusMessage: fetchErr?.message || "Order not found",
    });
  }

  const oldStatus = String(existingOrder.status);
  const newStatus = String(desiredStatus);

  const items = Array.isArray(existingOrder.items) ? existingOrder.items : [];

  const shouldFinalizeStock =
    oldStatus !== "delivered" &&
    newStatus === "delivered" &&
    !(existingOrder.metadata as any)?.stock_finalized_at;

  const shouldAwardLoyaltyPoints =
    oldStatus !== "delivered" &&
    newStatus === "delivered" &&
    !(existingOrder.metadata as any)?.loyalty_points_awarded_at;

  const updates: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "delivered") {
    updates.delivered_at = new Date().toISOString();
  }

  if (shouldFinalizeStock || shouldAwardLoyaltyPoints) {
    const mergedMetadata = {
      ...(existingOrder.metadata || {}),
      ...(shouldFinalizeStock && {
        stock_finalized_at: new Date().toISOString(),
        stock_finalized_by: callerId,
      }),
      ...(shouldAwardLoyaltyPoints && {
        loyalty_points_awarded_at: new Date().toISOString(),
        loyalty_points_awarded_by: callerId,
      }),
    };
    updates.metadata = mergedMetadata;
  }

  const { data: updatedOrder, error: updateErr } = await (admin as any)
    .from("orders")
    .update(updates)
    .eq("id", body.orderId)
    .select(
      "id, user_id, status, delivery_method, delivery_details, contact_phone, metadata, store_id, items, subtotal, total_amount, delivery_fee, points_discount_amount",
    )
    .single();

  if (updateErr || !updatedOrder) {
    throw createError({
      statusCode: 400,
      statusMessage: updateErr?.message || "Failed to update order",
    });
  }

  if (shouldFinalizeStock) {
    const orderStoreId = String(existingOrder.store_id || "");
    for (const item of items as any[]) {
      const productId = String(item?.product_id || "");
      const quantity = Number(item?.quantity || 0);
      const storeId = String(item?.store_id || orderStoreId);

      if (!productId || !storeId || !Number.isFinite(quantity) || quantity <= 0)
        continue;

      try {
        const { data: invRow, error: invErr } = await (admin as any)
          .from("store_inventory")
          .select(
            "id, stock_level, reserved_stock, available_stock, digital_buffer, is_visible",
          )
          .eq("store_id", storeId)
          .eq("product_id", productId)
          .single();

        if (invErr || !invRow) continue;

        const currentStock = Number(invRow.stock_level || 0);
        const currentReserved = Number(invRow.reserved_stock || 0);

        const nextStock = Math.max(0, currentStock - quantity);
        const nextReserved = Math.max(0, currentReserved - quantity);
        const nextAvailable = Math.max(0, nextStock - nextReserved);

        await (admin as any)
          .from("store_inventory")
          .update({
            stock_level: nextStock,
            reserved_stock: nextReserved,
            available_stock: nextAvailable,
            is_visible: nextAvailable > 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invRow.id);
      } catch (e) {
        console.error("[Stock Finalize] Failed item update:", e);
      }
    }
  }

  // Award loyalty points when order is first marked as delivered
  if (shouldAwardLoyaltyPoints) {
    try {
      const itemsArray = Array.isArray(existingOrder.items)
        ? (existingOrder.items as any[])
        : [];

      // Prefer order.subtotal (authoritative), fall back to items sum.
      const fallbackSubtotal = itemsArray.reduce((sum: number, item: any) => {
        const qty = Number(item?.quantity || 0);
        const unit = Number(
          item?.unit_price ?? item?.price ?? item?.unitPrice ?? 0,
        );
        if (!Number.isFinite(qty) || qty <= 0) return sum;
        if (!Number.isFinite(unit) || unit < 0) return sum;
        return sum + unit * qty;
      }, 0);

      const rawSubtotal = Number(existingOrder.subtotal);
      const subtotalToUse = Number.isFinite(rawSubtotal)
        ? rawSubtotal
        : fallbackSubtotal;

      const pointsDiscountAmount = Math.max(
        0,
        Number(existingOrder.points_discount_amount || 0),
      );

      // Earn points on spend AFTER loyalty discount (and excluding delivery by using subtotal)
      const eligibleSpend = Math.max(0, subtotalToUse - pointsDiscountAmount);

      // Calculate points: 1 point per ₦1000 spent (rounded down)
      const pointsToAward = Math.floor(eligibleSpend / 1000);

      if (pointsToAward > 0) {
        const userId = (existingOrder as any)?.user_id;

        if (userId) {
          // Get current loyalty points
          const { data: profileData } = await (admin as any)
            .from("profiles")
            .select("loyalty_points")
            .eq("id", userId)
            .single();

          const currentPoints = Number(profileData?.loyalty_points || 0);
          const newPoints = currentPoints + pointsToAward;

          // Update user's loyalty points
          await (admin as any)
            .from("profiles")
            .update({
              loyalty_points: newPoints,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          // Log the loyalty transaction
          await (admin as any).from("loyalty_transactions").insert({
            user_id: userId,
            order_id: body.orderId,
            points_earned: pointsToAward,
            points_redeemed: 0,
            transaction_type: "earned",
            description: `Earned ${pointsToAward} points from order delivery (₦${eligibleSpend.toLocaleString()})`,
            created_at: new Date().toISOString(),
          });

          console.log(
            `[Loyalty] Awarded ${pointsToAward} points to user ${userId} for order ${body.orderId}`,
          );
        }
      }
    } catch (e) {
      console.error("[Loyalty] Failed to award points:", e);
      // Don't fail the order update if loyalty fails
    }
  }

  // WhatsApp trigger (Option A): when delivery order transitions to picked_up
  const shouldNotifyOutForDelivery =
    existingOrder.delivery_method === "delivery" &&
    oldStatus !== "picked_up" &&
    newStatus === "picked_up";

  if (shouldNotifyOutForDelivery) {
    try {
      const customerPhoneRaw =
        (existingOrder.delivery_details as any)?.contactPhone ||
        existingOrder.contact_phone ||
        (existingOrder.metadata as any)?.contact_phone ||
        "";

      const customerPhoneE164 = normalizePhoneToE164(customerPhoneRaw);

      if (customerPhoneE164) {
        const { data: dispatch, error: dispatchErr } = await (admin as any)
          .from("rider_dispatches")
          .select("id, rider_name, rider_phone, customer_notified")
          .eq("order_id", body.orderId)
          .order("dispatched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!dispatchErr && dispatch && !dispatch.customer_notified) {
          const riderName = dispatch.rider_name || "Rider";
          const riderPhone = dispatch.rider_phone || "";

          const message =
            `HomeAffairs Update: Your order is Out for Delivery. ` +
            `Rider: ${riderName}` +
            (riderPhone ? ` (${riderPhone})` : "") +
            `. Reply here if you need help.`;

          const whatsappUrl = buildWhatsAppUrl(customerPhoneE164, message);

          const mergedMetadata = {
            ...(existingOrder.metadata || {}),
            out_for_delivery_whatsapp_url: whatsappUrl,
            out_for_delivery_notified_at: new Date().toISOString(),
            rider_name: riderName,
            rider_phone: riderPhone || null,
          };

          await (admin as any)
            .from("orders")
            .update({
              metadata: mergedMetadata,
              updated_at: new Date().toISOString(),
            })
            .eq("id", body.orderId);

          await (admin as any)
            .from("rider_dispatches")
            .update({
              customer_notified: true,
              customer_notification_sent_at: new Date().toISOString(),
            })
            .eq("id", dispatch.id);
        }
      }
    } catch (e) {
      console.error("[WhatsApp Notify] Failed:", e);
    }
  }

  return {
    success: true,
    order: updatedOrder,
  };
});
