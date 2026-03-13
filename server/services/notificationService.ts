import { serverSupabaseClient } from "#supabase/server";
import {
  sendPushNotification,
  sendBulkPushNotifications,
  type PushPayload,
  type PushSubscription,
} from "./pushService";

export type UserRole = "customer" | "staff" | "branch_manager" | "super_admin";
export type NotificationType =
  | "order_placed"
  | "payment_successful"
  | "order_confirmed"
  | "driver_assigned"
  | "driver_picked_up"
  | "driver_arrived"
  | "order_delivered"
  | "order_cancelled"
  | "new_order"
  | "branch_alert"
  | "system_alert";

export interface OrderNotificationData {
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerId?: string;
  storeId?: string;
  storeName?: string;
  branchId?: string;
  branchName?: string;
  driverName?: string;
  total?: number;
  status: string;
  url?: string;
  message?: string;
}

// Message templates for different notification types and roles
const notificationTemplates: Record<
  NotificationType,
  Record<
    UserRole | "default",
    (data: OrderNotificationData) => {
      title: string;
      message: string;
      url: string;
    }
  >
> = {
  order_placed: {
    customer: (data) => ({
      title: "Order Placed",
      message: `Your order ${data.orderNumber ? "#" + data.orderNumber : ""} has been received and is being processed.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "New Order Received",
      message: `New order ${data.orderNumber ? "#" + data.orderNumber : ""} from ${data.customerName || "a customer"} at ${data.storeName || "your store"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "New Order Alert",
      message: `New order ${data.orderNumber ? "#" + data.orderNumber : ""} received at ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "System Alert: New Order",
      message: `New order ${data.orderNumber ? "#" + data.orderNumber : ""} placed at ${data.storeName || "a store"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "New Order",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} has been placed.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  payment_successful: {
    customer: (data) => ({
      title: "Payment Confirmed",
      message: `Your payment for order ${data.orderNumber ? "#" + data.orderNumber : ""} was successful.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "Payment Received",
      message: `Payment confirmed for order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "Payment Alert",
      message: `Payment received for order ${data.orderNumber ? "#" + data.orderNumber : ""} at ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "Payment Confirmed",
      message: `Payment received for order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "Payment Successful",
      message: `Payment for order ${data.orderNumber ? "#" + data.orderNumber : ""} confirmed.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  order_confirmed: {
    customer: (data) => ({
      title: "Order Confirmed",
      message: "Your order is confirmed and being prepared.",
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "Order Confirmed",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} confirmed and ready for preparation.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "Branch Alert: Order Confirmed",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} confirmed at ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "Order Confirmed",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} has been confirmed.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "Order Confirmed",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} confirmed.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  driver_assigned: {
    customer: (data) => ({
      title: "Driver Assigned",
      message: `${data.driverName || "A driver"} has been assigned to deliver your order.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "Driver Assigned",
      message: `Driver ${data.driverName || "assigned"} for order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "Delivery Update",
      message: `Driver assigned for order ${data.orderNumber ? "#" + data.orderNumber : ""} at ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "Driver Assignment",
      message: `Driver assigned for order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "Driver Assigned",
      message: "A driver has been assigned to your order.",
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  driver_picked_up: {
    customer: (data) => ({
      title: "Order Picked Up",
      message: `Your order has been picked up by ${data.driverName || "the driver"} and is on the way.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "Order Picked Up",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} picked up by driver.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "Pickup Complete",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} picked up from ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "Order Picked Up",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} has been picked up.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "Order Picked Up",
      message: "Your order is on the way.",
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  driver_arrived: {
    customer: (data) => ({
      title: "Driver Arrived",
      message: `${data.driverName || "Your driver"} has arrived at your location.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "Driver Arrived",
      message: `Driver arrived at customer location for order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "Delivery Arrived",
      message: `Driver arrived at destination for order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "Driver Arrived",
      message: `Driver arrived for order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "Driver Arrived",
      message: "Your driver has arrived.",
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  order_delivered: {
    customer: (data) => ({
      title: "Order Delivered",
      message: `Your order has been delivered. Enjoy!`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "Order Delivered",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} successfully delivered.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "Delivery Complete",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} delivered from ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "Order Delivered",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} has been delivered.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "Order Delivered",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} delivered successfully.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  order_cancelled: {
    customer: (data) => ({
      title: "Order Cancelled",
      message: `Your order ${data.orderNumber ? "#" + data.orderNumber : ""} has been cancelled.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "Order Cancelled",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} has been cancelled.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "Cancellation Alert",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} cancelled at ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "Order Cancelled",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} has been cancelled.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "Order Cancelled",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} cancelled.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  new_order: {
    customer: (data) => ({
      title: "New Order",
      message: `You have a new order ${data.orderNumber ? "#" + data.orderNumber : ""}.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
    staff: (data) => ({
      title: "New Order",
      message: `New order ${data.orderNumber ? "#" + data.orderNumber : ""} received.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    branch_manager: (data) => ({
      title: "New Order Alert",
      message: `New order ${data.orderNumber ? "#" + data.orderNumber : ""} at ${data.branchName || "your branch"}.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    super_admin: (data) => ({
      title: "System: New Order",
      message: `New order ${data.orderNumber ? "#" + data.orderNumber : ""} received.`,
      url: data.url || `/admin/orders/${data.orderId}`,
    }),
    default: (data) => ({
      title: "New Order",
      message: `Order ${data.orderNumber ? "#" + data.orderNumber : ""} received.`,
      url: data.url || `/orders/${data.orderId}`,
    }),
  },
  branch_alert: {
    customer: (data) => ({
      title: "Branch Update",
      message: `Update from ${data.branchName || "your branch"}.`,
      url: data.url || `/`,
    }),
    staff: (data) => ({
      title: "Branch Alert",
      message: `Alert from ${data.branchName || "your branch"}.`,
      url: data.url || `/admin`,
    }),
    branch_manager: (data) => ({
      title: "Branch Alert",
      message: `Important update for ${data.branchName || "your branch"}.`,
      url: data.url || `/admin`,
    }),
    super_admin: (data) => ({
      title: "System: Branch Alert",
      message: `Alert from ${data.branchName || "branch"}.`,
      url: data.url || `/admin/branches`,
    }),
    default: (data) => ({
      title: "Branch Alert",
      message: `Update from ${data.branchName || "branch"}.`,
      url: data.url || `/`,
    }),
  },
  system_alert: {
    customer: (data) => ({
      title: "System Update",
      message: data.message || "System maintenance in progress.",
      url: data.url || `/`,
    }),
    staff: (data) => ({
      title: "System Alert",
      message: data.message || "System notification.",
      url: data.url || `/admin`,
    }),
    branch_manager: (data) => ({
      title: "System Alert",
      message: data.message || "System-level notification.",
      url: data.url || `/admin`,
    }),
    super_admin: (data) => ({
      title: "System Alert",
      message: data.message || "System notification for admin.",
      url: data.url || `/admin`,
    }),
    default: (data) => ({
      title: "System Alert",
      message: data.message || "System notification.",
      url: data.url || `/`,
    }),
  },
};

/**
 * Get subscriptions by user role
 */
async function getSubscriptionsByRole(
  event: any,
  role: UserRole | UserRole[],
  options?: { branchId?: string; storeId?: string; userId?: string },
): Promise<PushSubscription[]> {
  const client = await serverSupabaseClient(event);

  let query = client
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, role, user_id");

  // Filter by role(s)
  if (Array.isArray(role)) {
    query = query.in("role", role);
  } else {
    query = query.eq("role", role);
  }

  // Filter by specific user if provided
  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  // Filter by branch (requires joining with profiles or stores)
  if (options?.branchId) {
    // Get users from this branch
    const { data: branchUsers } = await client
      .from("profiles")
      .select("id")
      .eq("branch_id", options.branchId);

    const userIds = branchUsers?.map((u: { id: string }) => u.id) || [];
    if (userIds.length > 0) {
      query = query.in("user_id", userIds);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[NotificationService] Error fetching subscriptions:", error);
    return [];
  }

  return (data || []).map(
    (row: { endpoint: string; p256dh: string; auth: string }) => ({
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    }),
  );
}

/**
 * Send notification to specific user
 */
export async function notifyUser(
  event: any,
  userId: string,
  type: NotificationType,
  data: OrderNotificationData,
): Promise<{ sent: number; failed: number }> {
  const templates = notificationTemplates[type];
  const template = templates.customer || templates.default;
  const content = template(data);

  const subscriptions = await getSubscriptionsByRole(event, "customer", {
    userId,
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload: PushPayload = {
    title: content.title,
    message: content.message,
    url: content.url,
    orderId: data.orderId,
    type,
    tag: `${type}_${data.orderId}`,
    requireInteraction: type === "order_cancelled" || type === "driver_arrived",
  };

  const result = await sendBulkPushNotifications(subscriptions, payload);

  // Clean up expired subscriptions
  if (result.expired > 0) {
    await cleanupExpiredSubscriptions(event, subscriptions);
  }

  return { sent: result.sent, failed: result.failed };
}

/**
 * Send notification to staff by branch
 */
export async function notifyBranchStaff(
  event: any,
  branchId: string,
  type: NotificationType,
  data: OrderNotificationData,
): Promise<{ sent: number; failed: number }> {
  const templates = notificationTemplates[type];
  const template = templates.staff || templates.default;
  const content = template(data);

  const subscriptions = await getSubscriptionsByRole(
    event,
    ["staff", "branch_manager"],
    { branchId },
  );

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload: PushPayload = {
    title: content.title,
    message: content.message,
    url: content.url,
    orderId: data.orderId,
    type,
    tag: `${type}_${data.orderId}`,
    requireInteraction: false,
  };

  const result = await sendBulkPushNotifications(subscriptions, payload);

  if (result.expired > 0) {
    await cleanupExpiredSubscriptions(event, subscriptions);
  }

  return { sent: result.sent, failed: result.failed };
}

/**
 * Send notification to managers
 */
export async function notifyManagers(
  event: any,
  type: NotificationType,
  data: OrderNotificationData,
  options?: { branchId?: string },
): Promise<{ sent: number; failed: number }> {
  const templates = notificationTemplates[type];
  const template = templates.branch_manager || templates.default;
  const content = template(data);

  const subscriptions = await getSubscriptionsByRole(
    event,
    ["branch_manager", "super_admin"],
    options,
  );

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload: PushPayload = {
    title: content.title,
    message: content.message,
    url: content.url,
    orderId: data.orderId,
    type,
    tag: `${type}_${data.orderId}`,
    requireInteraction: false,
  };

  const result = await sendBulkPushNotifications(subscriptions, payload);

  if (result.expired > 0) {
    await cleanupExpiredSubscriptions(event, subscriptions);
  }

  return { sent: result.sent, failed: result.failed };
}

/**
 * Send notification by role
 */
export async function notifyByRole(
  event: any,
  role: UserRole | UserRole[],
  type: NotificationType,
  data: OrderNotificationData,
  options?: { branchId?: string; storeId?: string },
): Promise<{ sent: number; failed: number }> {
  const templates = notificationTemplates[type];

  // Get template based on role
  let template = templates.default;
  if (typeof role === "string" && templates[role]) {
    template = templates[role];
  }

  const content = template(data);

  const subscriptions = await getSubscriptionsByRole(event, role, options);

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload: PushPayload = {
    title: content.title,
    message: content.message,
    url: content.url,
    orderId: data.orderId,
    type,
    tag: `${type}_${data.orderId}`,
    requireInteraction: false,
  };

  const result = await sendBulkPushNotifications(subscriptions, payload);

  if (result.expired > 0) {
    await cleanupExpiredSubscriptions(event, subscriptions);
  }

  return { sent: result.sent, failed: result.failed };
}

/**
 * Notify all admins
 */
export async function notifyAdmins(
  event: any,
  type: NotificationType,
  data: OrderNotificationData,
): Promise<{ sent: number; failed: number }> {
  return notifyByRole(event, "super_admin", type, data);
}

/**
 * Clean up expired subscriptions
 */
async function cleanupExpiredSubscriptions(
  event: any,
  subscriptions: PushSubscription[],
): Promise<void> {
  const client = await serverSupabaseClient(event);
  const expiredEndpoints = subscriptions.map((s) => s.endpoint);

  if (expiredEndpoints.length === 0) return;

  const { error } = await client
    .from("push_subscriptions")
    .delete()
    .in("endpoint", expiredEndpoints);

  if (error) {
    console.error(
      "[NotificationService] Error cleaning up subscriptions:",
      error,
    );
  }
}

/**
 * Send order status update notifications to all relevant parties
 */
export async function sendOrderStatusNotifications(
  event: any,
  status: NotificationType,
  data: OrderNotificationData,
): Promise<void> {
  // Notify customer
  if (data.customerId) {
    await notifyUser(event, data.customerId, status, data);
  }

  // Notify branch staff
  if (data.branchId) {
    await notifyBranchStaff(event, data.branchId, status, data);
  }

  // Notify managers for important status updates
  if (
    ["order_placed", "payment_successful", "order_cancelled"].includes(status)
  ) {
    await notifyManagers(event, status, data, { branchId: data.branchId });
  }
}
