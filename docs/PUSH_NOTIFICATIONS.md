# Web Push Notifications Setup Guide

## Overview
The HomeAffairs PWA now supports Web Push Notifications for real-time order updates across all user roles (customers, staff, branch managers, super admins).

## Quick Start

### 1. Generate VAPID Keys

Run the key generation script:

```bash
npx tsx scripts/generate-vapid-keys.ts
```

This will output:
```
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@homeaffairs.com
```

### 2. Add Environment Variables

Copy the keys to your `.env` file:

```env
VAPID_PUBLIC_KEY=BLhV... (long base64 string)
VAPID_PRIVATE_KEY=secret... (long base64 string)
VAPID_SUBJECT=mailto:admin@homeaffairs.com
```

### 3. Run Database Migration

Create the push_subscriptions table:

```bash
npx tsx scripts/db.ts sql scripts/migrations/006_push_subscriptions.sql
```

### 4. Restart Dev Server

```bash
npm run dev
```

## Architecture

### Database Schema
- **Table**: `push_subscriptions`
- **Columns**: user_id, role, endpoint, p256dh, auth, created_at
- **Indexes**: user_id, role, endpoint (unique)

### Server Components
- **pushService.ts**: Web Push library integration with VAPID
- **notificationService.ts**: Role-based notification logic & templates
- **API Routes**:
  - `POST /api/notifications/save-subscription`
  - `POST /api/notifications/delete-subscription`
  - `POST /api/notifications/test-push`

### Client Components
- **usePushNotifications.ts**: Composable for managing subscriptions
- **NotificationSettings.vue**: UI for enabling/disabling notifications
- **Service Worker**: `public/sw.js` handles push events

## Notification Triggers

| Event | Customer | Staff | Manager | Admin |
|-------|----------|-------|---------|-------|
| Order Placed | Yes | Yes | Yes | Yes |
| Payment Successful | Yes | Yes | Yes | No |
| Order Confirmed | Yes | Yes | Yes | No |
| Driver Assigned | Yes | Yes | Yes | No |
| Driver Picked Up | Yes | Yes | No | No |
| Order Delivered | Yes | Yes | Yes | No |
| Order Cancelled | Yes | Yes | Yes | Yes |

## Usage in Components

### Auto-subscribe on Login (Already configured in app.vue)

### Manual Subscribe
```vue
<script setup>
const { subscribe, isSupported, permission } = usePushNotifications()
const user = useSupabaseUser()

async function enableNotifications() {
  if (isSupported.value && permission.value === 'granted') {
    await subscribe(user.value)
  }
}
</script>
```

### Notification Settings Component
```vue
<template>
  <NotificationSettings :user="user" />
</template>
```

## Testing

1. Open app in browser (must be localhost or HTTPS)
2. Login as any user
3. Check browser console for "[Push] Push subscription created"
4. Subscribe should be saved to Supabase
5. Place a test order
6. Verify notification received

## Troubleshooting

### Notifications not appearing
- Check browser permission (bell icon in address bar)
- Verify service worker registered in DevTools > Application
- Check console for VAPID key errors

### 404 on API endpoint
- Ensure server restarted after adding files
- Check file exists in `server/api/notifications/`

### "subscription_expired" errors
- Subscription auto-cleanup is handled in notificationService.ts
- Expired subscriptions are removed automatically

## Security Notes

- VAPID private key must NEVER be committed to git
- Subscriptions are tied to user_id for targeted notifications
- Endpoint URLs are treated as sensitive data

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari (macOS): Supported with some limitations
- Safari (iOS): Not supported (requires native push)
