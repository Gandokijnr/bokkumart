import { defineEventHandler, readBody, createError } from "h3";
import { sendPushNotification } from "../../services/pushService";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { endpoint, keys, title, message, url } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw createError({
        statusCode: 400,
        statusMessage: "Subscription and message data required",
      });
    }

    const result = await sendPushNotification(
      { endpoint, keys },
      {
        title: title || "Test Notification",
        message:
          message || "This is a test push notification from HomeAffairs!",
        url: url || "/",
        icon: "/pwa-192x192.png",
        badge: "/pwa-64x64.png",
      },
    );

    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || "Failed to send notification",
      });
    }

    return { success: true, message: "Notification sent successfully" };
  } catch (error: any) {
    console.error("[API] test-push error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal server error",
    });
  }
});
