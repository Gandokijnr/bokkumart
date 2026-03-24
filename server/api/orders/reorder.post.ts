import { defineEventHandler, readBody, createError } from "h3";
import { enforceRateLimit } from "../../utils/rateLimit";

interface ReorderRequest {
  orderId: string;
  userId: string;
}

interface CartItem {
  product_id: string;
  store_id: string;
  name: string;
  price: number;
  quantity: number;
  max_quantity: number;
  digital_buffer: number;
  image_url: string | null;
  options: any;
}

interface ReorderResponse {
  success: boolean;
  cartId: string;
  itemsAdded: number;
  itemsSkipped: number;
  skippedItems?: Array<{
    name: string;
    reason: string;
  }>;
}

export default defineEventHandler(async (event): Promise<ReorderResponse> => {
  try {
    const body = await readBody<ReorderRequest>(event);
    const { orderId, userId } = body;

    enforceRateLimit(event, {
      name: "orders_reorder",
      limit: 10,
      windowMs: 60_000,
      key: `${String(userId || "")}:${String(orderId || "")}`,
    });

    if (!orderId || !userId) {
      throw createError({
        statusCode: 400,
        message: "Missing required fields: orderId, userId",
      });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const config = useRuntimeConfig();

    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceRoleKey as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Fetch the original order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      throw createError({
        statusCode: 404,
        message: "Order not found or does not belong to user",
      });
    }

    // Get items from the order
    const items: CartItem[] = Array.isArray(order.items) ? order.items : [];

    if (items.length === 0) {
      throw createError({
        statusCode: 400,
        message: "No items found in the original order",
      });
    }

    // Check if user already has an active cart
    const { data: existingCart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .is("store_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let cartId: string;

    if (existingCart) {
      // Use existing cart
      cartId = existingCart.id;

      // Clear existing cart items
      await supabase.from("cart_items").delete().eq("cart_id", cartId);
    } else {
      // Create new cart
      const { data: newCart, error: cartError } = await supabase
        .from("carts")
        .insert({
          user_id: userId,
          store_id: null,
          store_name: null,
          delivery_method: null,
          delivery_address: null,
          contact_phone: null,
          delivery_zone: null,
        })
        .select("id")
        .single();

      if (cartError || !newCart) {
        throw createError({
          statusCode: 500,
          message: "Failed to create cart",
        });
      }

      cartId = newCart.id;
    }

    // Track results
    let itemsAdded = 0;
    let itemsSkipped = 0;
    const skippedItems: Array<{ name: string; reason: string }> = [];

    // Add items to cart with stock validation
    for (const item of items) {
      // Check product availability and stock
      const { data: inventory, error: inventoryError } = await supabase
        .from("store_inventory")
        .select("available_stock, is_visible, digital_buffer")
        .eq("product_id", item.product_id)
        .eq("store_id", order.store_id)
        .single();

      if (inventoryError || !inventory) {
        itemsSkipped++;
        skippedItems.push({
          name: item.name,
          reason: "Product no longer available",
        });
        continue;
      }

      if (!inventory.is_visible) {
        itemsSkipped++;
        skippedItems.push({
          name: item.name,
          reason: "Product currently unavailable",
        });
        continue;
      }

      // Calculate available stock considering digital buffer
      const effectiveStock =
        inventory.available_stock - (inventory.digital_buffer || 0);
      const requestedQuantity = item.quantity;
      const finalQuantity = Math.min(
        requestedQuantity,
        Math.max(0, effectiveStock),
      );

      if (finalQuantity <= 0) {
        itemsSkipped++;
        skippedItems.push({
          name: item.name,
          reason: "Out of stock",
        });
        continue;
      }

      // Add item to cart
      const { error: insertError } = await supabase.from("cart_items").insert({
        cart_id: cartId,
        product_id: item.product_id,
        store_id: order.store_id,
        name: item.name,
        price: item.price,
        quantity: finalQuantity,
        max_quantity: item.max_quantity || finalQuantity,
        digital_buffer: item.digital_buffer || 0,
        image_url: item.image_url,
        options: item.options || null,
      });

      if (insertError) {
        itemsSkipped++;
        skippedItems.push({
          name: item.name,
          reason: "Failed to add to cart",
        });
        continue;
      }

      itemsAdded++;
    }

    // Update cart with store info if items were added
    if (itemsAdded > 0) {
      const { data: store } = await supabase
        .from("stores")
        .select("name")
        .eq("id", order.store_id)
        .single();

      await supabase
        .from("carts")
        .update({
          store_id: order.store_id,
          store_name: store?.name || null,
          delivery_method: order.delivery_method,
          delivery_address: order.delivery_details,
          contact_phone: order.delivery_details?.contactPhone || null,
          delivery_zone: order.delivery_details?.address?.area || null,
        })
        .eq("id", cartId);
    }

    return {
      success: itemsAdded > 0,
      cartId,
      itemsAdded,
      itemsSkipped,
      skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
    };
  } catch (err: any) {
    console.error("Error reordering:", err);
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || "Failed to reorder",
    });
  }
});
