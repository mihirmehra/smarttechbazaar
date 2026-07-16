"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Mail,
  RefreshCw,
} from "lucide-react";

function VerifyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push("/auth/forgot-password");
    }
  }, [email, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];
    
    // Handle paste
    if (value.length > 1) {
      const digits = value.slice(0, 6).split("");
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      // Focus last filled input or next empty
      const lastIndex = Math.min(index + digits.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    
    if (fullCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to verify code");
        return;
      }

      setSuccessMessage("Code verified! Redirecting to reset password...");
      
      // Redirect to reset password page with token
      setTimeout(() => {
        router.push(`/auth/forgot-password/reset?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.token)}`);
      }, 1000);
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
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
        setErrorMessage(data.error || "Failed to resend code");
        return;
      }

      setSuccessMessage("A new code has been sent to your email");
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  };

  const CodeInputs = (
    <div className="flex justify-center gap-2">
      {code.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          onChange={(e) => handleCodeChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="h-14 w-12 rounded-xl border-border text-center text-xl font-bold focus:border-primary"
          autoFocus={index === 0}
        />
      ))}
    </div>
  );

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
            <Mail className="h-8 w-8 text-white" />
          </div>
          <p className="text-center text-sm font-medium text-white/80">
            Check your email for the code
          </p>
        </div>

        {/* White card */}
        <div className="w-full rounded-t-[28px] bg-white px-6 pb-10 pt-8 shadow-2xl animate-slide-up">
          <h1 className="mb-1 text-xl font-extrabold text-foreground">Enter Verification Code</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {CodeInputs}

            <button
              type="submit"
              disabled={isLoading || code.join("").length !== 6}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Verify Code <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {"Didn't receive the code? "}
              {countdown > 0 ? (
                <span className="font-medium text-foreground">Resend in {countdown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-semibold text-primary hover:underline disabled:opacity-70"
                >
                  {isResending ? "Sending..." : "Resend Code"}
                </button>
              )}
            </p>
          </div>

          <Link
            href="/auth/forgot-password"
            className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Use different email
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
              <Mail className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold leading-tight text-white text-balance">
              Check Your<br />Email
            </h2>
            <p className="mt-4 max-w-sm text-base text-white/75 leading-relaxed">
              We&apos;ve sent a 6-digit verification code to your email address. Enter the code to continue resetting your password.
            </p>

            <div className="mt-8 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 shrink-0 text-white" />
              <span className="text-sm font-medium text-white/90">
                Code expires in 15 minutes
              </span>
            </div>
          </div>

          {/* Bottom */}
          <div className="relative z-10 text-sm text-white/60">
            Check your spam folder if you don&apos;t see the email
          </div>
        </div>

        {/* Right - form panel */}
        <div className="flex flex-col items-center justify-center bg-background px-8 py-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-foreground">Enter Code</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {CodeInputs}

              <button
                type="submit"
                disabled={isLoading || code.join("").length !== 6}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Verify Code <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {"Didn't receive the code? "}
                {countdown > 0 ? (
                  <span className="font-medium text-foreground">Resend in {countdown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-70"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Resend Code"
                    )}
                  </button>
                )}
              </p>
            </div>

            <Link
              href="/auth/forgot-password"
              className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Use different email
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyCodeForm />
    </Suspense>
  );
}
