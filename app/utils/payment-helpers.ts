/**
 * Payment Helpers - No-Loss Fee Calculator
 * Ensures platform never runs at a loss on any transaction
 */

export interface FeeCalculation {
  subtotal: number;
  platformProfit: number;
  targetNet: number;
  finalTotal: number;
  paystackFee: number;
  logisticsBundleFee: number;
}

/**
 * Calculates the "No-Loss" total using Paystack's Gross-Up formula
 *
 * Paystack Nigeria 2026 Rules:
 * - Percent Fee: 1.5% (0.015)
 * - Flat Fee: ₦100 (ONLY if final total >= ₦2,500)
 * - Max Fee Cap: ₦2,000
 *
 * @param subtotal - The in-store subtotal (what merchant receives)
 * @param platformProfit - Desired platform profit (e.g., 200 for small orders, 500 for large)
 * @returns The total amount customer should pay
 */
export const calculateNoLossTotal = (
  subtotal: number,
  platformProfit: number,
): number => {
  const targetNet = subtotal + platformProfit;
  const percent = 0.015;
  const flat = 100;
  const cap = 2000;
  const flatFeeThreshold = 2500;

  // 1. Initial guess using standard "Gross-Up" formula (with flat fee)
  // Formula: Total = (Net + Flat) / (1 - Percent)
  let total = (targetNet + flat) / (1 - percent);

  // 2. Handle the "Under ₦2,500" Rule (₦100 flat fee is waived)
  if (total < flatFeeThreshold) {
    total = targetNet / (1 - percent);
  }

  // 3. Handle the ₦2,000 Fee Cap
  // If (Total - TargetNet) > 2000, Paystack only takes 2000
  if (total - targetNet > cap) {
    total = targetNet + cap;
  }

  return Math.ceil(total);
};

/**
 * Complete fee breakdown for transparency
 */
export const calculateFeeBreakdown = (
  subtotal: number,
  platformProfit: number,
): FeeCalculation => {
  const targetNet = subtotal + platformProfit;
  const finalTotal = calculateNoLossTotal(subtotal, platformProfit);
  const paystackFee = finalTotal - targetNet;
  const logisticsBundleFee = finalTotal - subtotal;

  return {
    subtotal,
    platformProfit,
    targetNet,
    finalTotal,
    paystackFee,
    logisticsBundleFee,
  };
};

/**
 * Determines platform profit based on order size
 * - Small orders (< ₦10,000): ₦200 profit
 * - Large orders (>= ₦10,000): ₦500 profit
 */
export const getPlatformProfit = (subtotal: number): number => {
  const SMALL_ORDER_THRESHOLD = 10000;
  const SMALL_ORDER_PROFIT = 200;
  const LARGE_ORDER_PROFIT = 500;

  return subtotal < SMALL_ORDER_THRESHOLD
    ? SMALL_ORDER_PROFIT
    : LARGE_ORDER_PROFIT;
};

/**
 * Example calculations:
 *
 * Small order (₦5,000 subtotal):
 * - Target Net = 5,000 + 200 = 5,200
 * - Gross-up = (5,200 + 100) / 0.985 = 5,380
 * - Check: 5,380 < 2,500? No, so flat fee applies
 * - Paystack fee = 5,380 - 5,200 = 180
 * - Customer pays = 5,380
 * - Merchant receives = 5,000
 * - Platform keeps = 200
 *
 * Large order (₦89,500 subtotal):
 * - Target Net = 89,500 + 500 = 90,000
 * - Gross-up = (90,000 + 100) / 0.985 = 91,477
 * - Check fee cap: 91,477 - 90,000 = 1,477 (< 2,000, so no cap)
 * - Customer pays = 91,477
 * - Merchant receives = 89,500
 * - Platform keeps = 500
 * - Paystack keeps = 1,477
 */
