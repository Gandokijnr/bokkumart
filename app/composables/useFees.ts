import { computed, type ComputedRef, type Ref } from "vue";

type FulfillmentMode = "pickup" | "delivery" | null | undefined;

type MaybeRef<T> = Ref<T> | ComputedRef<T>;

/**
 * Robust Fee Calculator for HomeAffairs
 * Ensures platform NEVER runs at loss while maintaining store price parity
 *
 * Logic:
 * 1. Define Minimum Platform Margin (₦200 small, ₦500 large)
 * 2. Target Net = In-Store Subtotal + Minimum Margin
 * 3. Gross-Up Formula: Final Total = (Target Net + 100) / (1 - 0.015)
 * 4. Paystack Cap Check: If fee > ₦2,000, Final Total = Target Net + 2000
 *
 * This ensures after Paystack takes 1.5% + ₦100, platform keeps the minimum margin.
 */

/**
 * Calculate the final total customer should pay using gross-up formula
 * Ensures platform keeps minimum margin after Paystack fees
 */
function calculateFinalTotal(
  storeSubtotal: number,
  desiredProfit: number,
  paystackCap: number = 2000,
): {
  finalTotal: number;
  platformFee: number;
  paystackFee: number;
  platformProfit: number;
} {
  const targetNet = storeSubtotal + desiredProfit;
  const flatFee = 100;
  const percentFee = 0.015;

  // Paystack Gross-Up Formula: (Target Net + Flat Fee) / (1 - Percentage Fee)
  let finalTotal = (targetNet + flatFee) / (1 - percentFee);

  // Estimated Paystack fee
  let estimatedFee = finalTotal - targetNet;

  // Safety Check: Paystack caps local fees at ₦2,000
  if (estimatedFee > paystackCap) {
    finalTotal = targetNet + paystackCap;
    estimatedFee = paystackCap;
  }

  finalTotal = Math.ceil(finalTotal);

  // Calculate actual breakdown
  const paystackFee = Math.round(finalTotal * percentFee) + flatFee;
  const platformFee = finalTotal - storeSubtotal;
  const platformProfit = platformFee - paystackFee;

  return {
    finalTotal,
    platformFee,
    paystackFee,
    platformProfit,
  };
}

/**
 * Determine minimum platform margin based on order tier
 */
function getMinimumMargin(subtotal: number): number {
  // Small orders (< ₦10,000): ₦200 minimum margin
  if (subtotal < 10000) {
    return 200;
  }
  // Medium orders (₦10,000 - ₦30,000): ₦350 minimum margin
  if (subtotal <= 30000) {
    return 350;
  }
  // Large orders (> ₦30,000): ₦500 minimum margin
  return 500;
}

export function useFees(opts: {
  subtotal: MaybeRef<number>;
  fulfillmentMode: MaybeRef<FulfillmentMode>;
}) {
  /**
   * Core fee calculation using gross-up formula
   * Ensures platform never runs at loss
   */
  const feeBreakdown = computed(() => {
    const subtotal = Math.max(0, Number(opts.subtotal.value || 0));

    // Determine minimum margin for this order tier
    const minMargin = getMinimumMargin(subtotal);

    // Calculate final total using gross-up formula
    const breakdown = calculateFinalTotal(subtotal, minMargin);

    return breakdown;
  });

  /**
   * Platform fee = what customer pays above in-store price
   */
  const platformFee = computed(() => feeBreakdown.value.platformFee);

  /**
   * What Paystack charges on the total
   */
  const paystackFee = computed(() => feeBreakdown.value.paystackFee);

  /**
   * What the store receives (exact in-store price)
   */
  const storeReceives = computed(() => {
    return Number(opts.subtotal.value || 0);
  });

  /**
   * Platform net profit after Paystack costs
   * Guaranteed to be >= minimum margin
   */
  const platformProfit = computed(() => feeBreakdown.value.platformProfit);

  /**
   * Total amount customer pays
   */
  const totalWithFees = computed(() => feeBreakdown.value.finalTotal);

  /**
   * Convert to kobo for Paystack API
   */
  const platformFeeKobo = computed(() => Math.round(platformFee.value * 100));
  const paystackFeeKobo = computed(() => Math.round(paystackFee.value * 100));
  const storeReceivesKobo = computed(() =>
    Math.round(storeReceives.value * 100),
  );
  const totalKobo = computed(() => Math.round(totalWithFees.value * 100));

  /**
   * Get fee tier label for display purposes
   */
  const feeTier = computed(() => {
    const subtotal = Number(opts.subtotal.value || 0);
    if (subtotal < 10000) return "small";
    if (subtotal <= 30000) return "medium";
    return "large";
  });

  /**
   * Minimum margin for this order
   */
  const minimumMargin = computed(() =>
    getMinimumMargin(Number(opts.subtotal.value || 0)),
  );

  /**
   * Fee description for customer transparency
   */
  const feeDescription = computed(() => {
    const tier = feeTier.value;
    const margin = minimumMargin.value;

    if (tier === "small") {
      return `₦${platformFee.value} covers secure payment processing and specialized grocery packaging. Platform margin: ₦${margin}`;
    }
    if (tier === "medium") {
      return `₦${platformFee.value} covers secure payment processing and specialized grocery packaging. Platform margin: ₦${margin}`;
    }
    return `₦${platformFee.value} covers secure payment processing, packaging, and bulk order handling. Platform margin: ₦${margin}`;
  });

  return {
    // Core values
    platformFee,
    platformFeeKobo,
    paystackFee,
    paystackFeeKobo,
    storeReceives,
    storeReceivesKobo,
    platformProfit,
    totalWithFees,
    totalKobo,
    feeTier,
    feeDescription,
    minimumMargin,
    feeBreakdown,
    // Legacy aliases for backward compatibility
    serviceFee: platformFee,
    serviceFeeKobo: platformFeeKobo,
  };
}
