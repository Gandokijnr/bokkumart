<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />

    <main class="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div class="text-center">
        <div
          v-if="verifying"
          class="mx-auto h-20 w-20 animate-spin rounded-full border-4 border-red-200 border-t-red-600"
        ></div>
        <div
          v-else-if="success"
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
        >
          <svg
            class="h-10 w-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div
          v-else-if="pending"
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100"
        >
          <svg
            class="h-10 w-10 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div
          v-else
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100"
        >
          <svg
            class="h-10 w-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 class="mt-6 text-2xl font-bold text-gray-900">
          {{
            verifying
              ? "Verifying Payment..."
              : success
                ? "Payment Successful!"
                : pending
                  ? "Payment Pending"
                  : "Payment Failed"
          }}
        </h1>
        <p class="mt-2 text-gray-600">{{ message }}</p>

        <!-- Bank transfer notice -->
        <div
          v-if="verifying"
          class="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-4"
        >
          <p class="text-sm text-blue-700">
            If you paid via Bank Transfer, please wait a moment for
            confirmation. Do not close this page.
          </p>
        </div>
      </div>

      <div v-if="!verifying" class="mt-8 space-y-3">
        <NuxtLink
          :to="success ? '/' : '/checkout'"
          class="w-full rounded-xl py-3.5 text-sm font-bold text-white text-center inline-block"
          :class="
            success
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-600 hover:bg-gray-700'
          "
        >
          {{ success ? "Continue Shopping" : "Try Again" }}
        </NuxtLink>
        <NuxtLink
          v-if="success"
          to="/profile"
          class="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 text-center inline-block"
        >
          View My Orders
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from "~/stores/useCartStore";

const cartStore = useCartStore();
const route = useRoute();
const supabase = useSupabaseClient();

const verifying = ref(true);
const success = ref(false);
const pending = ref(false);
const message = ref("Please wait while we confirm your payment...");

const handledConfirmed = ref(false);

const reference = route.query.reference as string;
const trxref = route.query.trxref as string;

function isPaidStatus(status: unknown): boolean {
  return (
    String(status || "") === "paid" || String(status || "") === "confirmed"
  );
}

async function handleConfirmedPayment(order: {
  id: string;
  total_amount: number;
}) {
  if (handledConfirmed.value) return;
  handledConfirmed.value = true;
  verifying.value = false;
  pending.value = false;
  success.value = true;
  message.value = `Your payment of ${formatPrice(order.total_amount)} has been confirmed!`;

  // Clear cart locally first
  cartStore.clearCart();

  // Persist empty cart to database (delete the cart record)
  try {
    const result = await cartStore.saveToDatabase(supabase as any);
    if (!result) {
      console.error(
        "[Verify] saveToDatabase returned false - cart may not have been deleted",
      );
    } else {
      console.log("[Verify] Cart cleared and saved to database successfully");
    }
  } catch (err) {
    console.error("[Verify] Failed to save cleared cart to database:", err);
  }

  setTimeout(() => navigateTo(`/checkout/success?order=${order.id}`), 1500);
}

async function verifyPayment() {
  const paymentRef = reference || trxref;

  if (!paymentRef) {
    verifying.value = false;
    success.value = false;
    pending.value = false;
    message.value = "No payment reference found.";
    return;
  }

  try {
    // Use the unified status endpoint that checks DB first, then Paystack, and reconciles
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds total (15 x 2s)

    while (attempts < maxAttempts) {
      try {
        const statusRes = await $fetch<{
          status: "confirmed" | "pending" | "failed" | "mismatch" | "conflict";
          order_id?: string;
          total_amount?: number;
          message?: string;
          source?: string;
          paystack_status?: string;
        }>("/api/paystack/status", {
          method: "POST",
          body: { reference: paymentRef },
        });

        // Payment confirmed - either from DB or reconciled from Paystack
        if (statusRes.status === "confirmed" && statusRes.order_id) {
          await handleConfirmedPayment({
            id: statusRes.order_id,
            total_amount: statusRes.total_amount || 0,
          });
          return;
        }

        // Payment failed permanently
        if (statusRes.status === "failed") {
          verifying.value = false;
          success.value = false;
          pending.value = false;
          message.value =
            statusRes.message ||
            "Payment could not be verified. Please try again.";
          return;
        }

        // Mismatch or conflict - requires attention
        if (
          statusRes.status === "mismatch" ||
          statusRes.status === "conflict"
        ) {
          verifying.value = false;
          success.value = false;
          pending.value = false;
          message.value =
            statusRes.message ||
            "Payment verification issue. Please contact support.";
          return;
        }

        // Still pending - wait and retry
        if (statusRes.status === "pending") {
          // Continue to next attempt
        }
      } catch (err: any) {
        // Network errors - continue retrying
        console.error("Status check error:", err);
      }

      // Wait 2 seconds before next attempt
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
    }

    // Max attempts reached - show pending state (not failed)
    verifying.value = false;
    success.value = false;
    pending.value = true;
    message.value =
      "Your payment is still being processed by Paystack. This can take a few minutes for bank transfers. You can safely leave this page and check your orders in your profile.";
  } catch (error) {
    console.error("Verification error:", error);
    verifying.value = false;
    success.value = false;
    pending.value = false;
    message.value =
      "An error occurred while verifying your payment. Please contact support if this persists.";
  }
}

function formatPrice(price: number): string {
  return "₦" + price.toLocaleString("en-NG");
}

let channel: any = null;

onMounted(() => {
  const paymentRef = reference || trxref;
  if (paymentRef) {
    channel = supabase
      .channel(`paystack-verify:${paymentRef}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `paystack_reference=eq.${paymentRef}`,
        },
        (payload: any) => {
          const row = payload?.new;
          if (
            row?.id &&
            Number.isFinite(Number(row?.total_amount)) &&
            isPaidStatus(row?.status)
          ) {
            handleConfirmedPayment({
              id: String(row.id),
              total_amount: Number(row.total_amount),
            });
          }
        },
      )
      .subscribe();
  }

  verifyPayment();
});

onUnmounted(() => {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
});
</script>
