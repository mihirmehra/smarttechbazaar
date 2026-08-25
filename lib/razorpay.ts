import Razorpay from "razorpay";

/**
 * Lazily-initialized Razorpay client.
 *
 * IMPORTANT: never instantiate `new Razorpay()` at module scope. The SDK throws
 * "key_id or oauthToken is mandatory" the moment it is constructed without
 * credentials, which crashes `next build` while it is collecting page data for
 * any route that imports the module. Creating the client inside the request
 * handler keeps the build green when the env vars are absent.
 */
let cachedClient: Razorpay | null = null;

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Returns a singleton Razorpay client, or `null` when credentials are missing.
 * Callers should respond with a 503 when this returns `null`.
 */
export function getRazorpay(): Razorpay | null {
  if (!isRazorpayConfigured()) return null;

  if (!cachedClient) {
    cachedClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  return cachedClient;
}

/** Standard JSON body used when payments are not configured. */
export const RAZORPAY_NOT_CONFIGURED = {
  error:
    "Payments are not configured on this server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
} as const;
