"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { isMedianApp, nativeGoogleSignIn, nativeAppleSignIn } from "@/lib/native-app";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Truck,
  BadgePercent,
  Headphones,
} from "lucide-react";

const features = [
  { icon: ShieldCheck,   text: "Secure B2B & B2C transactions" },
  { icon: Truck,         text: "Fast delivery across India" },
  { icon: BadgePercent,  text: "Exclusive deals & GST invoicing" },
  { icon: Headphones,    text: "Dedicated 24/7 support" },
];

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") || "/";
  const error        = searchParams.get("error");

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error || "");
  const [isNativeApp, setIsNativeApp] = useState(false);

  // Detect if running inside Median.co native app
  useEffect(() => {
    setIsNativeApp(isMedianApp());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setErrorMessage(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    setErrorMessage("");

    try {
      if (isNativeApp) {
        // Median.co native app: use callback mode (NOT redirectUri mode)
        // nativeGoogleSignIn() opens the native Google picker, waits for callback,
        // decodes the idToken and returns user data — all in one promise.
        const nativeResult = await nativeGoogleSignIn();

        if (!nativeResult) {
          // Plugin not available or cancelled silently
          setErrorMessage("Google Sign-In is not available. Please use email/password.");
          setIsGoogleLoading(false);
          return;
        }

        // Sign in via NextAuth using the data from the native Google token
        const signInResult = await signIn("google-firebase", {
          email: nativeResult.email,
          name: nativeResult.name,
          googleId: nativeResult.userId,
          avatar: nativeResult.picture || null,
          redirect: false,
        });

        if (signInResult?.error) {
          setErrorMessage(signInResult.error);
          setIsGoogleLoading(false);
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
        return;
      }

      // Web browser: use Firebase popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const signInResult = await signIn("google-firebase", {
        email: user.email,
        name: user.displayName,
        googleId: user.uid,
        avatar: user.photoURL,
        redirect: false,
      });
      if (signInResult?.error) {
        setErrorMessage(signInResult.error);
        setIsGoogleLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("cancel")) {
        // User dismissed the picker — not an error
        setIsGoogleLoading(false);
        return;
      }
      setErrorMessage(msg || "Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  // Sign in with Apple handler - Required for iOS App Store compliance (Guideline 4.8)
  const handleAppleSignIn = async () => {
    if (isAppleLoading) return;

    setIsAppleLoading(true);
    setErrorMessage("");

    try {
      if (isNativeApp) {
        // Median.co native app: use native Apple Sign-In
        const nativeResult = await nativeAppleSignIn();

        if (!nativeResult) {
          setErrorMessage("Sign in with Apple is not available. Please use another method.");
          setIsAppleLoading(false);
          return;
        }

        // Decode identity token to get user info
        let email = nativeResult.email || "";
        let name = "";

        // Try to get name from fullName object
        if (nativeResult.fullName) {
          const givenName = nativeResult.fullName.givenName || "";
          const familyName = nativeResult.fullName.familyName || "";
          name = `${givenName} ${familyName}`.trim();
        }

        // If no name provided, try to decode from identityToken
        if (!name && nativeResult.identityToken) {
          try {
            const parts = nativeResult.identityToken.split(".");
            if (parts.length >= 2) {
              const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              const payload = JSON.parse(atob(base64));
              email = email || payload.email || "";
            }
          } catch (decodeError) {
            console.error("[Apple] Failed to decode identity token:", decodeError);
          }
        }

        // Sign in via NextAuth
        const signInResult = await signIn("apple", {
          email: email,
          name: name || email.split("@")[0],
          appleId: nativeResult.user || nativeResult.authorizationCode,
          identityToken: nativeResult.identityToken,
          redirect: false,
        });

        if (signInResult?.error) {
          setErrorMessage(signInResult.error);
          setIsAppleLoading(false);
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
        return;
      }

      // Web browser: Use Apple Sign-In JS SDK
      // Check if AppleID JS is available, if not load it
      if (typeof window !== "undefined") {
        // @ts-expect-error - AppleID is loaded via script
        if (!window.AppleID) {
          // Load Apple Sign-In JS SDK dynamically
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Apple Sign-In"));
            document.head.appendChild(script);
          });
        }

        // Initialize Apple Sign-In
        // @ts-expect-error - AppleID is loaded via script
        window.AppleID.auth.init({
          clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "com.sabkatechbazar.app",
          scope: "name email",
          redirectURI: `${window.location.origin}/api/auth/callback/apple`,
          usePopup: true,
        });

        // Trigger Apple Sign-In popup
        // @ts-expect-error - AppleID is loaded via script
        const response = await window.AppleID.auth.signIn();
        
        if (response && response.authorization) {
          const { id_token, code } = response.authorization;
          const user = response.user || {};
          
          // Decode the id_token to get user info
          let email = "";
          let name = "";
          
          if (id_token) {
            try {
              const parts = id_token.split(".");
              if (parts.length >= 2) {
                const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
                const payload = JSON.parse(atob(base64));
                email = payload.email || "";
              }
            } catch (e) {
              console.error("[Apple] Failed to decode id_token:", e);
            }
          }
          
          // Get name from user object (only available on first sign-in)
          if (user.name) {
            name = `${user.name.firstName || ""} ${user.name.lastName || ""}`.trim();
          }
          
          // Sign in via NextAuth
          const signInResult = await signIn("apple", {
            email: email || user.email || "",
            name: name || email.split("@")[0] || "Apple User",
            appleId: code || id_token,
            identityToken: id_token,
            redirect: false,
          });

          if (signInResult?.error) {
            setErrorMessage(signInResult.error);
          } else {
            router.push(callbackUrl);
            router.refresh();
          }
        }
      }
      
      setIsAppleLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("popup")) {
        setIsAppleLoading(false);
        return;
      }
      setErrorMessage(msg || "Failed to sign in with Apple. Please try again.");
      setIsAppleLoading(false);
    }
  };

  return (
    <>
      {/* ─────────────────── MOBILE layout ─────────────────────────── */}
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-primary md:hidden">
        {/* Red branded top */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-16">
          <Link href="/" className="mb-6 block">
            <Image
              src="/logo.png"
              alt="Smart Tech Bazaar"
              width={160}
              height={56}
              className="h-14 w-auto object-contain brightness-0 invert"
              priority
            />
          </Link>
          <p className="text-center text-sm font-medium text-white/80">
            India&apos;s trusted B2B &amp; B2C tech marketplace
          </p>
        </div>

        {/* White card */}
        <div className="w-full rounded-t-[28px] bg-white px-6 pb-10 pt-8 shadow-2xl animate-slide-up">
          <h1 className="mb-1 text-xl font-extrabold text-foreground">Welcome back</h1>
          <p className="mb-6 text-sm text-muted-foreground">Sign in to continue shopping</p>
          <MobileFormContent
            errorMessage={errorMessage}
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            showPassword={showPassword} setShowPassword={setShowPassword}
            isLoading={isLoading} isGoogleLoading={isGoogleLoading} isAppleLoading={isAppleLoading}
            isNativeApp={isNativeApp}
            handleSubmit={handleSubmit}
            handleGoogleSignIn={handleGoogleSignIn}
            handleAppleSignIn={handleAppleSignIn}
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {"Don't have an account? "}
            <Link href="/auth/register" className="font-semibold text-primary hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* ─────────────────── DESKTOP split-panel ───────────────────── */}
      <div className="hidden min-h-screen md:grid md:grid-cols-2">
        {/* Left — brand panel */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-primary px-10 py-12">
          {/* Subtle pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Logo */}
          <Link href="/" className="relative z-10">
            <Image
              src="/logo.png"
              alt="Smart Tech Bazaar"
              width={180}
              height={60}
              className="h-12 w-auto object-contain brightness-0 invert"
              priority
            />
          </Link>

          {/* Center copy */}
          <div className="relative z-10 my-auto py-12">
            <h2 className="text-4xl font-extrabold leading-tight text-white text-balance">
              India&apos;s Premier<br />Tech Marketplace
            </h2>
            <p className="mt-4 max-w-sm text-base text-white/75 leading-relaxed">
              Trusted by thousands of businesses and consumers for the best prices, genuine products, and GST-compliant invoicing.
            </p>

            {/* Feature list */}
            <ul className="mt-8 space-y-4">
              {features.map((f) => (
                <li key={f.text} className="flex items-center gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <f.icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/90">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom testimonial chip */}
          <div className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
            <div className="flex -space-x-2">
              {["#E87040","#4A90D9","#50C878"].map((c) => (
                <div key={c} className="h-7 w-7 rounded-full border-2 border-primary/30" style={{ background: c }} />
              ))}
            </div>
            <span className="text-xs font-semibold text-white/90">10,000+ customers trust us</span>
          </div>
        </div>

        {/* Right — form panel */}
        <div className="flex flex-col items-center justify-center bg-background px-8 py-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-foreground">Sign in</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Welcome back — enter your details below
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="mb-3 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-border bg-white text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/30 hover:shadow-md disabled:opacity-70 press-active"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continue with Google
            </button>

            {/* Apple button - Required for iOS App Store compliance (Guideline 4.8) */}
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={isAppleLoading}
              className="mb-5 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-border bg-black text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-70 press-active"
            >
              {isAppleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Continue with Apple
            </button>

            <div className="relative my-5 flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="mx-4 text-xs font-medium text-muted-foreground">or sign in with email</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email-desktop" className="mb-1.5 block text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email-desktop"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-border pl-10 text-sm focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password-desktop" className="text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password-desktop"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-border pl-10 pr-11 text-sm focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground press-active"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/auth/register" className="font-semibold text-primary hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Shared mobile form fragment ─────────────────────────────────── */
function MobileFormContent({
  errorMessage,
  email, setEmail,
  password, setPassword,
  showPassword, setShowPassword,
  isLoading, isGoogleLoading, isAppleLoading,
  isNativeApp,
  handleSubmit,
  handleGoogleSignIn,
  handleAppleSignIn,
}: {
  errorMessage: string;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  isLoading: boolean; isGoogleLoading: boolean; isAppleLoading: boolean;
  isNativeApp: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleGoogleSignIn: () => void;
  handleAppleSignIn: () => void;
}) {
  return (
    <>
      {errorMessage && (
        <div className="mb-4 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        className="mb-3 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-border bg-white text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/30 disabled:opacity-70 press-active"
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        Continue with Google
      </button>
      {/* Apple button - Required for iOS App Store compliance (Guideline 4.8) */}
      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={isAppleLoading}
        className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-border bg-black text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 disabled:opacity-70 press-active"
      >
        {isAppleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        )}
        Continue with Apple
      </button>
      <div className="relative my-5 flex items-center">
        <div className="flex-1 border-t border-border" />
        <span className="mx-4 text-xs font-medium text-muted-foreground">or sign in with email</span>
        <div className="flex-1 border-t border-border" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email-mobile" className="mb-1.5 block text-xs font-semibold text-foreground">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email-mobile" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl border-border pl-10 text-sm focus:border-primary" required />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password-mobile" className="text-xs font-semibold text-foreground">Password</label>
            <Link href="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password-mobile" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl border-border pl-10 pr-11 text-sm focus:border-primary" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground press-active">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
