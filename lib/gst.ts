/**
 * GST Calculation Library
 * 
 * Handles GST calculation based on:
 * - Intra-state (Karnataka): CGST (9%) + SGST (9%) = 18%
 * - Inter-state (Other states): IGST (18%)
 * 
 * Business is registered in Karnataka (State Code: 29)
 */

// Business registration state code (Karnataka)
export const BUSINESS_STATE_CODE = "29";
export const BUSINESS_STATE_NAME = "Karnataka";

// GST Rate (18% total)
export const GST_RATE = 18;
export const CGST_RATE = 9;
export const SGST_RATE = 9;
export const IGST_RATE = 18;

// State codes mapping
export const STATE_CODES: { [key: string]: string } = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

export interface GSTBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  taxType: "INTRA" | "INTER";
  customerStateCode: string;
  customerStateName: string;
  isIntraState: boolean;
}

/**
 * Extract state code from GSTIN
 * First 2 digits of GSTIN represent the state code
 */
export function extractStateCodeFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null;
  const stateCode = gstin.substring(0, 2);
  return STATE_CODES[stateCode] ? stateCode : null;
}

/**
 * Get state name from state code
 */
export function getStateName(stateCode: string): string {
  return STATE_CODES[stateCode] || "Unknown";
}

/**
 * Determine if transaction is intra-state (within Karnataka)
 */
export function isIntraStateTransaction(customerStateCode: string): boolean {
  return customerStateCode === BUSINESS_STATE_CODE;
}

/**
 * Calculate GST breakdown based on subtotal and customer state
 * 
 * @param subtotal - Amount before tax (in paise for Razorpay, or rupees)
 * @param customerStateCode - Customer's state code (from GSTIN or shipping address)
 * @param inPaise - Whether the subtotal is in paise (for Razorpay) or rupees
 * @returns GST breakdown with all tax components
 */
export function calculateGST(
  subtotal: number,
  customerStateCode: string,
  inPaise: boolean = false
): GSTBreakdown {
  // Convert to rupees for calculation if in paise
  const subtotalInRupees = inPaise ? subtotal / 100 : subtotal;
  
  const isIntra = isIntraStateTransaction(customerStateCode);
  
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  
  if (isIntra) {
    // Intra-state: CGST + SGST
    cgst = Math.round((subtotalInRupees * CGST_RATE) / 100 * 100) / 100;
    sgst = Math.round((subtotalInRupees * SGST_RATE) / 100 * 100) / 100;
  } else {
    // Inter-state: IGST
    igst = Math.round((subtotalInRupees * IGST_RATE) / 100 * 100) / 100;
  }
  
  const totalTax = cgst + sgst + igst;
  const grandTotal = Math.round((subtotalInRupees + totalTax) * 100) / 100;
  
  return {
    subtotal: subtotalInRupees,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
    taxType: isIntra ? "INTRA" : "INTER",
    customerStateCode,
    customerStateName: getStateName(customerStateCode),
    isIntraState: isIntra,
  };
}

/**
 * Calculate GST for Razorpay (returns amounts in paise)
 */
export function calculateGSTForRazorpay(
  subtotalInPaise: number,
  customerStateCode: string
): GSTBreakdown & { grandTotalInPaise: number } {
  const breakdown = calculateGST(subtotalInPaise, customerStateCode, true);
  
  return {
    ...breakdown,
    grandTotalInPaise: Math.round(breakdown.grandTotal * 100),
  };
}

/**
 * Validate GSTIN format
 * Format: 2 digits (state code) + 5 letters (PAN first 5) + 4 digits + 1 letter + 1 alphanumeric + Z + 1 check digit
 */
export function validateGSTIN(gstin: string): {
  valid: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
} {
  if (!gstin) {
    return { valid: false, error: "GSTIN is required" };
  }

  const upperGSTIN = gstin.toUpperCase().trim();

  if (upperGSTIN.length !== 15) {
    return { valid: false, error: "GSTIN must be exactly 15 characters" };
  }

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstRegex.test(upperGSTIN)) {
    return { valid: false, error: "Invalid GSTIN format" };
  }

  const stateCode = upperGSTIN.substring(0, 2);
  const stateName = STATE_CODES[stateCode];

  if (!stateName) {
    return { valid: false, error: "Invalid state code in GSTIN" };
  }

  return {
    valid: true,
    stateCode,
    stateName,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get tax summary text for invoice/display
 */
export function getTaxSummaryText(breakdown: GSTBreakdown): string {
  if (breakdown.isIntraState) {
    return `CGST @${CGST_RATE}% + SGST @${SGST_RATE}%`;
  }
  return `IGST @${IGST_RATE}%`;
}
