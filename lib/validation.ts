/**
 * Input Validation Utilities
 * 
 * Provides secure validation for user inputs to prevent injection attacks
 * and ensure data integrity.
 */

/**
 * Validate Indian phone number
 * Accepts 10-digit numbers with optional country code
 */
export function validatePhoneNumber(phone: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!phone || typeof phone !== "string") {
    return { valid: false, normalized: "", error: "Phone number is required" };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // Check for valid Indian phone number patterns
  // 10 digits, or 11 digits starting with 0, or 12 digits starting with 91
  if (digitsOnly.length === 10) {
    // Must start with 6, 7, 8, or 9
    if (!/^[6-9]/.test(digitsOnly)) {
      return { valid: false, normalized: "", error: "Invalid phone number format" };
    }
    return { valid: true, normalized: digitsOnly };
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    const withoutZero = digitsOnly.slice(1);
    if (!/^[6-9]/.test(withoutZero)) {
      return { valid: false, normalized: "", error: "Invalid phone number format" };
    }
    return { valid: true, normalized: withoutZero };
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    const withoutCode = digitsOnly.slice(2);
    if (!/^[6-9]/.test(withoutCode)) {
      return { valid: false, normalized: "", error: "Invalid phone number format" };
    }
    return { valid: true, normalized: withoutCode };
  }

  return { valid: false, normalized: "", error: "Phone number must be 10 digits" };
}

/**
 * Validate Indian PIN code (6 digits)
 */
export function validatePincode(pincode: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!pincode || typeof pincode !== "string") {
    return { valid: false, normalized: "", error: "PIN code is required" };
  }

  // Remove any spaces or non-digit characters
  const digitsOnly = pincode.replace(/\D/g, "");

  // Indian PIN codes are exactly 6 digits and don't start with 0
  if (digitsOnly.length !== 6) {
    return { valid: false, normalized: "", error: "PIN code must be 6 digits" };
  }

  if (digitsOnly.startsWith("0")) {
    return { valid: false, normalized: "", error: "Invalid PIN code" };
  }

  return { valid: true, normalized: digitsOnly };
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .slice(0, maxLength)
    // Remove any HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove null bytes
    .replace(/\0/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ");
}

/**
 * Validate email address
 */
export function validateEmail(email: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!email || typeof email !== "string") {
    return { valid: false, normalized: "", error: "Email is required" };
  }

  const normalized = email.trim().toLowerCase();

  // Basic email regex - not perfect but catches most issues
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalized)) {
    return { valid: false, normalized: "", error: "Invalid email format" };
  }

  if (normalized.length > 254) {
    return { valid: false, normalized: "", error: "Email too long" };
  }

  return { valid: true, normalized };
}

/**
 * Validate name (for addresses, etc.)
 */
export function validateName(name: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!name || typeof name !== "string") {
    return { valid: false, normalized: "", error: "Name is required" };
  }

  const normalized = sanitizeString(name, 100);

  if (normalized.length < 2) {
    return { valid: false, normalized: "", error: "Name must be at least 2 characters" };
  }

  // Only allow letters, spaces, dots, and common name characters
  if (!/^[a-zA-Z\s.'\-]+$/.test(normalized)) {
    return { valid: false, normalized: "", error: "Name contains invalid characters" };
  }

  return { valid: true, normalized };
}

/**
 * Validate address text
 * Minimum 5 characters to allow for short but valid addresses like "MG Road"
 */
export function validateAddress(address: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!address || typeof address !== "string") {
    return { valid: false, normalized: "", error: "Address is required" };
  }

  const normalized = sanitizeString(address, 500);

  if (normalized.length < 5) {
    return { valid: false, normalized: "", error: "Address must be at least 5 characters" };
  }

  if (normalized.length > 500) {
    return { valid: false, normalized: "", error: "Address too long" };
  }

  return { valid: true, normalized };
}

/**
 * Validate monetary amount
 */
export function validateAmount(amount: number): {
  valid: boolean;
  error?: string;
} {
  if (typeof amount !== "number" || isNaN(amount)) {
    return { valid: false, error: "Invalid amount" };
  }

  if (amount < 0) {
    return { valid: false, error: "Amount cannot be negative" };
  }

  // Razorpay has a minimum of ₹1
  if (amount < 1) {
    return { valid: false, error: "Minimum amount is ₹1" };
  }

  // Razorpay has a maximum limit per transaction
  if (amount > 50000000) { // ₹5 crore
    return { valid: false, error: "Amount exceeds maximum limit" };
  }

  return { valid: true };
}

/**
 * Validate quantity (for cart items)
 */
export function validateQuantity(quantity: number): {
  valid: boolean;
  error?: string;
} {
  if (typeof quantity !== "number" || isNaN(quantity)) {
    return { valid: false, error: "Invalid quantity" };
  }

  if (!Number.isInteger(quantity)) {
    return { valid: false, error: "Quantity must be a whole number" };
  }

  if (quantity < 1) {
    return { valid: false, error: "Quantity must be at least 1" };
  }

  if (quantity > 1000) {
    return { valid: false, error: "Quantity exceeds maximum limit" };
  }

  return { valid: true };
}

/**
 * Validate MongoDB ObjectId format
 */
export function validateObjectId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }
  return /^[a-fA-F0-9]{24}$/.test(id);
}
