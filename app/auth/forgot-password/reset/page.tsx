"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if no email or token
  useEffect(() => {
    if (!email || !token) {
      router.push("/auth/forgot-password");
    }
  }, [email, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to reset password");
        return;
      }

      setIsSuccess(true);
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch {
      setErrorMessage("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        {/* Mobile success */}
        <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-6 md:hidden">
          <div className="w-full max-w-sm rounded-3xl bg-white px-6 py-10 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mb-2 text-2xl font-extrabold text-foreground">Password Reset!</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Your password has been successfully reset. Redirecting you to sign in...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting...
            </div>
          </div>
        </div>

        {/* Desktop success */}
        <div className="hidden min-h-screen items-center justify-center bg-background md:flex">
          <div className="w-full max-w-md rounded-3xl border border-border bg-white px-8 py-12 text-center shadow-xl">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="mb-2 text-3xl font-extrabold text-foreground">Password Reset!</h1>
            <p className="mb-6 text-muted-foreground">
              Your password has been successfully reset. Redirecting you to sign in...
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirecting...
            </div>
          </div>
        </div>
      </>
    );
  }

  const PasswordForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-foreground">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-border pl-10 pr-11 text-sm focus:border-primary"
            required
            minLength={6}
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

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold text-foreground">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl border-border pl-10 text-sm focus:border-primary"
            required
            minLength={6}
          />
        </div>
      </div>

      <div className="rounded-xl bg-muted/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Password must be at least 6 characters long
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>Reset Password <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
    </form>
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
            <Lock className="h-8 w-8 text-white" />
          </div>
          <p className="text-center text-sm font-medium text-white/80">
            Create your new password
          </p>
        </div>

        {/* White card */}
        <div className="w-full rounded-t-[28px] bg-white px-6 pb-10 pt-8 shadow-2xl animate-slide-up">
          <h1 className="mb-1 text-xl font-extrabold text-foreground">Reset Password</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your new password below
          </p>

          {errorMessage && (
            <div className="mb-4 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {PasswordForm}
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
              <Lock className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold leading-tight text-white text-balance">
              Create New<br />Password
            </h2>
            <p className="mt-4 max-w-sm text-base text-white/75 leading-relaxed">
              Choose a strong password to protect your account. Make sure it&apos;s at least 6 characters long.
            </p>

            <div className="mt-8 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 shrink-0 text-white" />
              <span className="text-sm font-medium text-white/90">
                Your password is securely encrypted
              </span>
            </div>
          </div>

          {/* Bottom */}
          <div className="relative z-10 text-sm text-white/60">
            Use a unique password you don&apos;t use elsewhere
          </div>
        </div>

        {/* Right - form panel */}
        <div className="flex flex-col items-center justify-center bg-background px-8 py-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-foreground">Reset Password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your new password below
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {PasswordForm}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
