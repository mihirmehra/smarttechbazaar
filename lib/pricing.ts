import { type UserRole } from "@/models/User";

/**
 * Customer type based on GST verification status
 * - B2B: Business customers with verified GST number
 * - B2C: Regular retail customers without GST verification
 */
export type CustomerType = "B2B" | "B2C";

/**
 * Pricing information for a product
 */
export interface PricingInfo {
  /** The price to display to the customer */
  displayPrice: number;
  /** Original MRP for discount calculation */
  mrp: number;
  /** Discount percentage */
  discount: number;
  /** Amount saved */
  savings: number;
  /** Whether customer is B2B */
  isB2B: boolean;
  /** Whether user can see both prices (admin/super_admin) */
  canSeeBothPrices: boolean;
  /** B2B price (only included if canSeeBothPrices is true) */
  priceB2B?: number;
  /** B2C price (only included if canSeeBothPrices is true) */
  priceB2C?: number;
}

/**
 * Determines the customer type based on user session data
 * @param isGstVerified - Whether the user has a verified GST number
 * @returns CustomerType - B2B if GST verified, B2C otherwise
 */
export function getCustomerType(isGstVerified: boolean | undefined): CustomerType {
  return isGstVerified === true ? "B2B" : "B2C";
}

/**
 * Checks if a user role can see both B2B and B2C prices
 * @param role - User role from session
 * @returns boolean - true if admin or super_admin
 */
export function canSeeBothPrices(role: UserRole | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * Gets the display price based on customer type
 * @param priceB2C - B2C price
 * @param priceB2B - B2B price
 * @param customerType - Customer type (B2B or B2C)
 * @returns number - The appropriate price for the customer type
 */
export function getDisplayPrice(
  priceB2C: number | undefined | null,
  priceB2B: number | undefined | null,
  customerType: CustomerType
): number {
  const b2cPrice = Number(priceB2C) || 0;
  const b2bPrice = Number(priceB2B) || 0;
  return customerType === "B2B" ? b2bPrice : b2cPrice;
}

/**
 * Calculates discount percentage
 * @param mrp - Maximum retail price
 * @param price - Current selling price
 * @returns number - Discount percentage (0-100)
 */
export function calculateDiscount(mrp: number | undefined | null, price: number): number {
  const safeMrp = Number(mrp) || 0;
  if (safeMrp <= price || safeMrp === 0) return 0;
  return Math.round(((safeMrp - price) / safeMrp) * 100);
}

/**
 * Calculates savings amount
 * @param mrp - Maximum retail price
 * @param price - Current selling price
 * @returns number - Amount saved
 */
export function calculateSavings(mrp: number | undefined | null, price: number): number {
  const safeMrp = Number(mrp) || 0;
  return safeMrp > price ? safeMrp - price : 0;
}

/**
 * Gets complete pricing information for a product
 * @param product - Product with pricing fields
 * @param session - User session data
 * @returns PricingInfo - Complete pricing information
 */
export function getPricingInfo(
  product: {
    priceB2C?: number | null;
    priceB2B?: number | null;
    mrp?: number | null;
  },
  session: {
    user?: {
      isGstVerified?: boolean;
      role?: UserRole;
    };
  } | null
): PricingInfo {
  const isGstVerified = session?.user?.isGstVerified === true;
  const role = session?.user?.role;
  const customerType = getCustomerType(isGstVerified);
  const showBothPrices = canSeeBothPrices(role);
  
  // Get raw values and ensure they are valid numbers
  const rawMrp = Number(product.mrp) || 0;
  const rawPriceB2C = Number(product.priceB2C) || 0;
  const rawPriceB2B = Number(product.priceB2B) || 0;
  
  // Apply fallbacks: if price is 0, use MRP as fallback (same logic as homepage)
  const mrp = rawMrp;
  const priceB2C = rawPriceB2C > 0 ? rawPriceB2C : rawMrp;
  const priceB2B = rawPriceB2B > 0 ? rawPriceB2B : (rawPriceB2C > 0 ? rawPriceB2C : rawMrp);
  
  // Get display price based on customer type
  const displayPrice = customerType === "B2B" ? priceB2B : priceB2C;
  
  const result: PricingInfo = {
    displayPrice,
    mrp,
    discount: calculateDiscount(mrp, displayPrice),
    savings: calculateSavings(mrp, displayPrice),
    isB2B: customerType === "B2B",
    canSeeBothPrices: showBothPrices,
  };
  
  // Include both prices for admin users
  if (showBothPrices) {
    result.priceB2B = priceB2B;
    result.priceB2C = priceB2C;
  }
  
  return result;
}

/**
 * Formats price for display in Indian locale
 * @param price - Price to format
 * @returns string - Formatted price string
 */
export function formatPrice(price: number | undefined | null): string {
  const safePrice = Number(price) || 0;
  return `₹${safePrice.toLocaleString("en-IN")}`;
}

/**
 * Gets customer type label for display
 * @param isB2B - Whether customer is B2B
 * @returns string - "B2B" or "B2C"
 */
export function getCustomerTypeLabel(isB2B: boolean): string {
  return isB2B ? "B2B" : "B2C";
}
