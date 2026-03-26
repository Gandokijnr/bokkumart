// Service Worker for Web Push Notifications
// This file handles push events and notification clicks

self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activated");
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);

  if (!event.data) {
    console.error("[SW] Push event has no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("[SW] Push data:", data);

    const title = data.title || "BokkuXpress";
    const options = {
      body: data.message || data.body || "",
      icon: data.icon || "/pwa-192x192.png",
      badge: data.badge || "/pwa-64x64.png",
      tag: data.tag || "default",
      requireInteraction: data.requireInteraction || false,
      data: {
        url: data.url || "/",
        orderId: data.orderId,
        type: data.type,
        ...data,
      },
      actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("[SW] Error showing notification:", error);
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification("BokkuXpress", {
        body: "You have a new notification",
        icon: "/pwa-192x192.png",
      }),
    );
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event);

  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || "/";

  // Handle action buttons
  if (event.action) {
    console.log("[SW] Action clicked:", event.action);
    // Handle specific actions here
    switch (event.action) {
      case "open":
        event.waitUntil(openUrl(url));
        break;
      case "dismiss":
        // Just close, already done above
        break;
      default:
        event.waitUntil(openUrl(url));
    }
  } else {
    // Default click - open the URL
    event.waitUntil(openUrl(url));
  }
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event);
});

// Helper function to open URL
async function openUrl(url) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  // If a window is already open, focus it
  for (const client of clients) {
    if (client.url === url && "focus" in client) {
      return client.focus();
    }
  }

  // If a window exists but not on this URL, navigate to it
  for (const client of clients) {
    if ("navigate" in client) {
      await client.navigate(url);
      return client.focus();
    }
  }

  // Otherwise open a new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
