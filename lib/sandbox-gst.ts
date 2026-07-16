/**
 * Sandbox GST Verification Library
 * 
 * Integrates with Sandbox.co.in API for real GST verification
 * Documentation: https://developer.sandbox.co.in
 */

const SANDBOX_BASE_URL = "https://api.sandbox.co.in";

interface SandboxAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Response from Search GSTIN API (abbreviated field names)
interface SandboxGSTData {
  gstin: string;
  lgnm?: string; // Legal name
  tradeNam?: string; // Trade name
  stj?: string; // State jurisdiction
  stjCd?: string; // State jurisdiction code
  ctj?: string; // Center jurisdiction
  ctjCd?: string; // Center jurisdiction code
  rgdt?: string; // Registration date
  dty?: string; // Dealer type / taxpayer type
  cxdt?: string; // Cancellation date
  sts?: string; // Status (Active/Cancelled/Suspended)
  ctb?: string; // Constitution of business
  nba?: string[]; // Nature of business activities
  pradr?: {
    addr?: {
      bnm?: string;
      st?: string;
      loc?: string;
      bno?: string;
      dst?: string;
      stcd?: string;
      pncd?: string;
    };
    ntr?: string;
  };
  einvoiceStatus?: string;
}

// The actual API response structure: { code, data: { data: {...}, status_cd }, message, ... }
interface SandboxGSTSearchResponse {
  code: number;
  timestamp: number;
  transaction_id?: string;
  data?: {
    data?: SandboxGSTData;
    status_cd?: string;
  };
  message?: string;
  error?: {
    message: string;
    code: string;
  };
}

export interface GSTVerificationResult {
  valid: boolean;
  verified: boolean;
  error?: string;
  data?: {
    gstin: string;
    businessName: string;
    legalName: string;
    state: string;
    stateCode: string;
    registrationDate: string;
    constitutionOfBusiness: string;
    taxpayerType: string;
    status: string;
    address?: string;
    tradeName?: string;
  };
}

export interface GSTOTPRequestResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface GSTOTPVerifyResult {
  success: boolean;
  verified: boolean;
  error?: string;
  message?: string;
  taxpayerToken?: string;
  tokenExpiry?: string;
  sessionExpiry?: string;
}

// Cache for access tokens
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Authenticate with Sandbox API to get access token
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const apiKey = process.env.SANDBOX_API_KEY;
  const apiSecret = process.env.SANDBOX_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Sandbox API credentials not configured");
  }

  const response = await fetch(`${SANDBOX_BASE_URL}/authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
      "x-api-version": "1.0",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[v0] Sandbox auth error:", response.status, errorText);
    throw new Error(`Failed to authenticate with Sandbox API: ${response.status}`);
  }

  const data: SandboxAuthResponse = await response.json();
  
  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return data.access_token;
}

/**
 * Verify GST number using Sandbox API
 */
export async function verifyGSTNumber(gstin: string): Promise<GSTVerificationResult> {
  // Basic format validation first
  const formatValidation = validateGSTFormat(gstin);
  if (!formatValidation.valid) {
    return {
      valid: false,
      verified: false,
      error: formatValidation.error,
    };
  }

  try {
    const accessToken = await getAccessToken();
    const upperGST = gstin.toUpperCase().trim();

    const response = await fetch(`${SANDBOX_BASE_URL}/gst/compliance/public/gstin/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": accessToken,
        "x-api-key": process.env.SANDBOX_API_KEY!,
        "x-api-version": "1.0.0",
      },
      body: JSON.stringify({ gstin: upperGST }),
    });

    const responseText = await response.text();
    
    let data: SandboxGSTSearchResponse;
    try {
      data = JSON.parse(responseText);
    } catch {
      return {
        valid: false,
        verified: false,
        error: "Failed to parse API response. Please try again.",
      };
    }

    // Handle error responses
    if (response.status === 400) {
      return {
        valid: false,
        verified: true,
        error: data.message || "Invalid GST number format",
      };
    }

    if (response.status === 404) {
      return {
        valid: false,
        verified: true,
        error: "GST number not found in government database",
      };
    }

    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      return {
        valid: false,
        verified: false,
        error: "GST verification service temporarily unavailable",
      };
    }

    if (response.status !== 200 || data.code !== 200) {
      return {
        valid: false,
        verified: true,
        error: data.message || "GST verification failed",
      };
    }

    // Extract GST data from nested response: data.data.data
    const gstData = data.data?.data;
    
    if (!gstData || !gstData.gstin) {
      return {
        valid: false,
        verified: true,
        error: "GST number not found in government database",
      };
    }
    
    // Check GST status
    const status = gstData.sts?.toLowerCase() || "";
    const isActive = status === "active";

    // Build address string
    let address = "";
    if (gstData.pradr?.addr) {
      const addr = gstData.pradr.addr;
      const parts = [addr.bno, addr.bnm, addr.st, addr.loc, addr.dst, addr.pncd].filter(Boolean);
      address = parts.join(", ");
    }

    // Get state from state jurisdiction or state codes
    const stateName = gstData.pradr?.addr?.stcd || gstData.stj || STATE_CODES[upperGST.substring(0, 2)] || "";
    const stateCode = gstData.stjCd || upperGST.substring(0, 2);

    const resultData = {
      gstin: gstData.gstin,
      businessName: gstData.tradeNam || gstData.lgnm || "",
      legalName: gstData.lgnm || "",
      state: stateName,
      stateCode: stateCode,
      registrationDate: gstData.rgdt || "",
      constitutionOfBusiness: gstData.ctb || "",
      taxpayerType: gstData.dty || "",
      status: gstData.sts || "",
      address: address,
      tradeName: gstData.tradeNam,
    };

    if (!isActive) {
      return {
        valid: false,
        verified: true,
        error: `GST is ${gstData.sts || "inactive"}. Only active GST numbers are accepted.`,
        data: resultData,
      };
    }

    return {
      valid: true,
      verified: true,
      data: resultData,
    };
  } catch (error) {
    console.error("[v0] GST verification error:", error);
    return {
      valid: false,
      verified: false,
      error: "Could not verify GST. Please try again.",
    };
  }
}

/**
 * Validate GST number format (without API call)
 */
export function validateGSTFormat(gstin: string): { valid: boolean; error?: string; stateCode?: string } {
  if (!gstin) {
    return { valid: false, error: "GST number is required" };
  }

  const upperGST = gstin.toUpperCase().trim();

  if (upperGST.length !== 15) {
    return { valid: false, error: "GST number must be exactly 15 characters" };
  }

  // GST Format: 2 digits state + 10 char PAN + 1 entity + Z + 1 check digit
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstRegex.test(upperGST)) {
    return { valid: false, error: "Invalid GST number format" };
  }

  const stateCode = upperGST.substring(0, 2);
  if (!STATE_CODES[stateCode]) {
    return { valid: false, error: "Invalid state code in GST number" };
  }

  return { valid: true, stateCode };
}

/**
 * Request OTP for GST taxpayer authentication
 * Sends OTP to the registered mobile number and email of the GST account
 * 
 * Note: The taxpayer must have API access enabled on their GST portal
 * Path: View Profile > Manage API Access
 */
export async function requestGSTOTP(gstin: string, username: string): Promise<GSTOTPRequestResult> {
  try {
    const accessToken = await getAccessToken();
    const upperGST = gstin.toUpperCase().trim();

    const response = await fetch(`${SANDBOX_BASE_URL}/gst/compliance/tax-payer/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": accessToken,
        "x-api-key": process.env.SANDBOX_API_KEY!,
        "x-api-version": "1.0.0",
        "x-source": "primary",
        "accept": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        gstin: upperGST,
      }),
    });

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[v0] GST OTP request parse error:", responseText);
      return {
        success: false,
        error: "Failed to parse API response. Please try again.",
      };
    }

    // Handle error responses
    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      return {
        success: false,
        error: "GST verification service temporarily unavailable. Please try again.",
      };
    }

    if (response.status === 400) {
      return {
        success: false,
        error: data.message || "Invalid request. Please check your GST number and username.",
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        error: "GST account not found or API access is not enabled on the GST portal.",
      };
    }

    if (response.status === 422) {
      return {
        success: false,
        error: data.message || "Invalid GSTIN pattern or username format.",
      };
    }

    if (response.status !== 200 || (data.code && data.code !== 200)) {
      return {
        success: false,
        error: data.message || "Failed to send OTP. Please try again.",
      };
    }

    return {
      success: true,
      message: "OTP sent to your registered mobile number and email address.",
    };
  } catch (error) {
    console.error("[v0] GST OTP request error:", error);
    return {
      success: false,
      error: "Could not send OTP. Please try again.",
    };
  }
}

/**
 * Verify OTP for GST taxpayer authentication
 * Returns a taxpayer access token valid for 6 hours if successful
 */
export async function verifyGSTOTP(
  gstin: string, 
  username: string, 
  otp: string
): Promise<GSTOTPVerifyResult> {
  try {
    const accessToken = await getAccessToken();
    const upperGST = gstin.toUpperCase().trim();

    const response = await fetch(
      `${SANDBOX_BASE_URL}/gst/compliance/tax-payer/otp/verify?otp=${encodeURIComponent(otp.trim())}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": accessToken,
          "x-api-key": process.env.SANDBOX_API_KEY!,
          "x-api-version": "1.0.0",
          "x-source": "primary",
          "accept": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          gstin: upperGST,
        }),
      }
    );

    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[v0] GST OTP verify parse error:", responseText);
      return {
        success: false,
        verified: false,
        error: "Failed to parse API response. Please try again.",
      };
    }

    // Handle error responses
    if (response.status === 401 || response.status === 403) {
      cachedToken = null;
      return {
        success: false,
        verified: false,
        error: "GST verification service temporarily unavailable. Please try again.",
      };
    }

    if (response.status === 400) {
      // Check if it's an invalid OTP error
      const message = data.message?.toLowerCase() || "";
      if (message.includes("otp") || message.includes("invalid")) {
        return {
          success: false,
          verified: false,
          error: "Invalid OTP. Please check and try again.",
        };
      }
      return {
        success: false,
        verified: false,
        error: data.message || "Invalid request. Please try again.",
      };
    }

    if (response.status === 422) {
      return {
        success: false,
        verified: false,
        error: data.message || "Invalid OTP format or expired session.",
      };
    }

    if (response.status !== 200 || (data.code && data.code !== 200)) {
      return {
        success: false,
        verified: false,
        error: data.message || "OTP verification failed. Please try again.",
      };
    }

    // Extract taxpayer token from response
    const taxpayerToken = data.data?.access_token || data.access_token;
    const tokenExpiry = data.data?.token_expiry || data.token_expiry;
    const sessionExpiry = data.data?.session_expiry || data.session_expiry;

    return {
      success: true,
      verified: true,
      message: "GST verification successful. Your GST number has been verified.",
      taxpayerToken,
      tokenExpiry,
      sessionExpiry,
    };
  } catch (error) {
    console.error("[v0] GST OTP verify error:", error);
    return {
      success: false,
      verified: false,
      error: "Could not verify OTP. Please try again.",
    };
  }
}

// State codes mapping
const STATE_CODES: { [key: string]: string } = {
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
