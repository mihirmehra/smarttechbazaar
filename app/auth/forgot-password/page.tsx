"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to send reset code");
        return;
      }

      setSuccessMessage(data.message);
      
      // Redirect to verification page with email
      setTimeout(() => {
        router.push(`/auth/forgot-password/verify?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Mobile Layout */}
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
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <p className="text-center text-sm font-medium text-white/80">
            Reset your password securely
          </p>
        </div>

        {/* White card */}
        <div className="w-full rounded-t-[28px] bg-white px-6 pb-10 pt-8 shadow-2xl animate-slide-up">
          <h1 className="mb-1 text-xl font-extrabold text-foreground">Forgot Password</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a 6-digit code to reset your password
          </p>

          {errorMessage && (
            <div className="mb-4 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-600">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email-mobile" className="mb-1.5 block text-xs font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email-mobile"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-border pl-10 text-sm focus:border-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Send Reset Code <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <Link
            href="/auth/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>

      {/* Desktop split-panel */}
      <div className="hidden min-h-screen md:grid md:grid-cols-2">
        {/* Left - brand panel */}
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
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15">
              <KeyRound className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold leading-tight text-white text-balance">
              Forgot Your<br />Password?
            </h2>
            <p className="mt-4 max-w-sm text-base text-white/75 leading-relaxed">
              No worries! We&apos;ll help you reset your password securely. Enter your email to receive a verification code.
            </p>

            <div className="mt-8 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 shrink-0 text-white" />
              <span className="text-sm font-medium text-white/90">
                Your account security is our priority
              </span>
            </div>
          </div>

          {/* Bottom */}
          <div className="relative z-10 text-sm text-white/60">
            Need help? Contact support at support@smarttechbazaar.com
          </div>
        </div>

        {/* Right - form panel */}
        <div className="flex flex-col items-center justify-center bg-background px-8 py-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-foreground">Reset Password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email address and we&apos;ll send you a 6-digit verification code
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-green-500/10 px-4 py-3 text-sm text-green-600">
                {successMessage}
              </div>
            )}

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

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Send Reset Code <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <Link
              href="/auth/login"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
