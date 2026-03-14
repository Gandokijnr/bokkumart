/**
 * BokkuMart Pricing Utility
 * 
 * Implements the "Technology Markup" Engine that adds a configurable
 * percentage to base prices for partnership revenue model.
 * 
 * This allows the platform to earn maintenance fees via a small
 * tech-token added to online prices without charging upfront.
 */

import { useRuntimeConfig } from "#app";

export interface PricingBreakdown {
  /** Original store/base price */
  basePrice: number;
  /** Technology markup amount */
  markupAmount: number;
  /** Final price displayed to customer */
  displayPrice: number;
  /** Markup percentage used */
  markupPercentage: number;
}

/**
 * Calculate the display price with technology markup
 * 
 * @param basePrice - The original product price
 * @returns PricingBreakdown with full transparency
 */
export function calculateDisplayPrice(basePrice: number): PricingBreakdown {
  // Get markup percentage from runtime config (allows partner-specific configuration)
  const config = useRuntimeConfig();
  const markupPercentage = Number(config.public.markupPercentage || 2); // Default 2%
  
  const markupAmount = basePrice * (markupPercentage / 100);
  const displayPrice = basePrice + markupAmount;
  
  return {
    basePrice: Math.round(basePrice * 100) / 100,
    markupAmount: Math.round(markupAmount * 100) / 100,
    displayPrice: Math.round(displayPrice * 100) / 100,
    markupPercentage,
  };
}

/**
 * Get just the display price (for simple use cases)
 * 
 * @param basePrice - The original product price
 * @returns Display price with markup
 */
export function getDisplayPrice(basePrice: number): number {
  return calculateDisplayPrice(basePrice).displayPrice;
}

/**
 * Format price for display in Naira
 * 
 * @param price - Price to format
 * @returns Formatted price string (e.g., "₦1,234.56")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Calculate cart total with markup
 * 
 * @param items - Array of items with price and quantity
 * @returns Cart total with markup applied
 */
export function calculateCartTotal(
  items: Array<{ price: number; quantity: number }>
): PricingBreakdown {
  const basePrice = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  
  return calculateDisplayPrice(basePrice);
}

/**
 * For Admin Dashboard: Compare Bokku Price vs App Price
 * 
 * @param basePrice - The Bokku/partner store price
 * @returns Object showing both prices for transparency
 */
export function comparePrices(basePrice: number): {
  bokkuPrice: string;
  appPrice: string;
  markupAmount: string;
  markupPercentage: number;
} {
  const pricing = calculateDisplayPrice(basePrice);
  
  return {
    bokkuPrice: formatPrice(pricing.basePrice),
    appPrice: formatPrice(pricing.displayPrice),
    markupAmount: formatPrice(pricing.markupAmount),
    markupPercentage: pricing.markupPercentage,
  };
}
