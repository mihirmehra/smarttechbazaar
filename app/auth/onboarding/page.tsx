"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Building2,
  FileText,
  RefreshCcw,
  AlertCircle,
  Check,
  Smartphone,
  ArrowLeft,
  Info,
} from "lucide-react";

type OnboardingStep = "verify-email" | "gst-details" | "gst-otp" | "complete";

const BUSINESS_TYPES = [
  { value: "retailer", label: "Retailer" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "distributor", label: "Distributor" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "other", label: "Other" },
];

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("verify-email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Email verification state
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // GST state
  const [gstNumber, setGstNumber] = useState("");
  const [gstUsername, setGstUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [gstValidation, setGstValidation] = useState<{
    valid: boolean;
    verified?: boolean;
    error?: string;
    state?: string;
    businessName?: string;
    legalName?: string;
    status?: string;
    taxpayerType?: string;
  } | null>(null);
  const [isValidatingGst, setIsValidatingGst] = useState(false);

  // GST OTP state
  const [gstOtp, setGstOtp] = useState(["", "", "", "", "", ""]);
  const [gstOtpResendCooldown, setGstOtpResendCooldown] = useState(0);
  const gstOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Determine current step based on session
  useEffect(() => {
    if (session?.user) {
      if (session.user.isOnboardingComplete) {
        router.push("/");
      } else if (session.user.isEmailVerified) {
        setCurrentStep("gst-details");
      } else {
        setCurrentStep("verify-email");
      }
    }
  }, [session, router]);

  // Resend cooldown timer for email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Resend cooldown timer for GST OTP
  useEffect(() => {
    if (gstOtpResendCooldown > 0) {
      const timer = setTimeout(() => setGstOtpResendCooldown(gstOtpResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [gstOtpResendCooldown]);

  // GST validation with debounce - verifies with Sandbox API
  useEffect(() => {
    if (gstNumber.length === 15) {
      const timer = setTimeout(async () => {
        setIsValidatingGst(true);
        setGstValidation(null);
        try {
          const res = await fetch(`/api/auth/gst?gst=${gstNumber}`);
          const data = await res.json();
          setGstValidation(data);
          
          // Auto-fill business name if returned from API
          if (data.valid && data.businessName && !businessName) {
            setBusinessName(data.businessName);
          }
        } catch {
          setGstValidation({ valid: false, verified: false, error: "Failed to verify GST. Please try again." });
        } finally {
          setIsValidatingGst(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (gstNumber.length > 0 && gstNumber.length < 15) {
      setGstValidation({ valid: false, verified: false, error: `GST number must be 15 characters (${gstNumber.length}/15)` });
    } else {
      setGstValidation(null);
    }
  }, [gstNumber, businessName]);

  // Handle email verification code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 8).split("");
      const newCode = [...verificationCode];
      pastedCode.forEach((char, i) => {
        if (index + i < 8) {
          newCode[index + i] = char;
        }
      });
      setVerificationCode(newCode);
      const nextIndex = Math.min(index + pastedCode.length, 7);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      if (value && index < 7) {
        inputRefs.current[index + 1]?.focus();
      }
    }
    setError("");
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle GST OTP input
  const handleGstOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split("");
      const newCode = [...gstOtp];
      pastedCode.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setGstOtp(newCode);
      const nextIndex = Math.min(index + pastedCode.length, 5);
      gstOtpInputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...gstOtp];
      newCode[index] = value;
      setGstOtp(newCode);
      if (value && index < 5) {
        gstOtpInputRefs.current[index + 1]?.focus();
      }
    }
    setError("");
  };

  const handleGstOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !gstOtp[index] && index > 0) {
      gstOtpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify email
  const handleVerifyEmail = async () => {
    const code = verificationCode.join("");
    if (code.length !== 8) {
      setError("Please enter the complete 8-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      setSuccess("Email verified successfully!");
      await update(); // Refresh session
      setTimeout(() => {
        setCurrentStep("gst-details");
        setSuccess("");
      }, 1500);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend email verification code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend code");
        return;
      }

      setSuccess("New verification code sent!");
      setResendCooldown(60);
      setVerificationCode(["", "", "", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  // Request GST OTP - sends OTP to registered mobile/email of GST account
  const handleRequestGstOtp = async () => {
    if (!gstNumber || gstNumber.length !== 15) {
      setError("Please enter a valid 15-character GST number");
      return;
    }

    if (!gstValidation?.valid) {
      setError(gstValidation?.error || "Invalid GST number");
      return;
    }

    if (!gstUsername.trim()) {
      setError("Please enter your GST Portal username");
      return;
    }

    setIsRequestingOtp(true);
    setError("");

    try {
      const res = await fetch("/api/auth/gst/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          gstin: gstNumber, 
          username: gstUsername.trim() 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }

      setSuccess("OTP sent to your GST registered mobile and email!");
      setGstOtpResendCooldown(60);
      setCurrentStep("gst-otp");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Verify GST OTP
  const handleVerifyGstOtp = async () => {
    const otp = gstOtp.join("");
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/gst/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.attemptsRemaining !== undefined) {
          setError(`${data.error}. ${data.attemptsRemaining} attempts remaining.`);
        } else {
          setError(data.error || "OTP verification failed");
        }
        return;
      }

      // GST verified successfully - now save business details
      const saveRes = await fetch("/api/auth/gst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstNumber, businessName, businessType }),
      });

      if (!saveRes.ok) {
        const saveData = await saveRes.json();
        setError(saveData.error || "Failed to save business details");
        return;
      }

      setSuccess("GST verified successfully!");
      await update(); // Refresh session
      setTimeout(() => {
        setCurrentStep("complete");
        setSuccess("");
      }, 1500);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend GST OTP
  const handleResendGstOtp = async () => {
    if (gstOtpResendCooldown > 0) return;

    setIsRequestingOtp(true);
    setError("");

    try {
      const res = await fetch("/api/auth/gst/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          gstin: gstNumber, 
          username: gstUsername.trim() 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend OTP");
        return;
      }

      setSuccess("New OTP sent to your GST registered mobile and email!");
      setGstOtpResendCooldown(60);
      setGstOtp(["", "", "", "", "", ""]);
      gstOtpInputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to resend OTP");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Go back from OTP step to GST details
  const handleBackToGstDetails = async () => {
    // Cancel the OTP verification request
    try {
      await fetch("/api/auth/gst/otp", { method: "DELETE" });
    } catch {
      // Ignore errors
    }
    setGstOtp(["", "", "", "", "", ""]);
    setError("");
    setCurrentStep("gst-details");
  };

  // Skip GST and complete onboarding
  const handleSkipGST = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/gst", {
        method: "PUT",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to complete onboarding");
        return;
      }

      await update(); // Refresh session
      router.push("/");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete onboarding
  const handleComplete = () => {
    router.push("/");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine progress step for visual indicator
  const getProgressStep = () => {
    if (currentStep === "verify-email") return 1;
    if (currentStep === "gst-details" || currentStep === "gst-otp") return 2;
    return 3;
  };
  const progressStep = getProgressStep();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <span className="font-heading text-xl font-bold text-white">S</span>
            </div>
          </Link>
          <h1 className="heading-lg mt-6">Complete Your Profile</h1>
          <p className="body-md mt-2 text-muted-foreground">
            Just a few more steps to get started
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
              progressStep === 1
                ? "border-primary bg-primary text-white"
                : "border-stb-success bg-stb-success text-white"
            }`}
          >
            {progressStep === 1 ? (
              <Mail className="h-5 w-5" />
            ) : (
              <Check className="h-5 w-5" />
            )}
          </div>
          <div
            className={`h-1 w-16 rounded-full transition-colors ${
              progressStep > 1 ? "bg-stb-success" : "bg-border"
            }`}
          />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
              progressStep === 2
                ? "border-primary bg-primary text-white"
                : progressStep === 3
                ? "border-stb-success bg-stb-success text-white"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {progressStep === 3 ? (
              <Check className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div
            className={`h-1 w-16 rounded-full transition-colors ${
              progressStep === 3 ? "bg-stb-success" : "bg-border"
            }`}
          />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
              progressStep === 3
                ? "border-stb-success bg-stb-success text-white"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-stb-success/10 p-3 text-sm text-stb-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {/* Step 1: Email Verification */}
          {currentStep === "verify-email" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stb-red-light">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h2 className="heading-md">Verify Your Email</h2>
                <p className="body-sm mt-2 text-muted-foreground">
                  We sent an 8-digit code to{" "}
                  <strong>{session?.user?.email}</strong>
                </p>
              </div>

              {/* Code Input */}
              <div className="flex justify-center gap-2">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    className="h-12 w-10 rounded-lg border-2 border-border bg-background text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-14 sm:w-12"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyEmail}
                disabled={isLoading || verificationCode.join("").length !== 8}
                className="w-full gap-2"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Verify Email
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={handleResendCode}
                  disabled={isLoading || resendCooldown > 0}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend verification code"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: GST Details */}
          {currentStep === "gst-details" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stb-red-light">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="heading-md">Business Details</h2>
                <p className="body-sm mt-2 text-muted-foreground">
                  Verify your GST to unlock B2B wholesale prices
                </p>
              </div>

              <div className="space-y-4">
                {/* GST Number */}
                <div>
                  <label htmlFor="gst" className="body-sm mb-1.5 block font-medium">
                    GST Number
                  </label>
                  <div className="relative">
                    <Input
                      id="gst"
                      type="text"
                      placeholder="22AAAAA0000A1Z5"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase().slice(0, 15))}
                      className={`h-11 uppercase ${
                        gstValidation
                          ? gstValidation.valid
                            ? "border-stb-success focus:border-stb-success"
                            : "border-destructive focus:border-destructive"
                          : ""
                      }`}
                      maxLength={15}
                    />
                    {isValidatingGst && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                    {gstValidation && !isValidatingGst && (
                      <span
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                          gstValidation.valid ? "text-stb-success" : "text-destructive"
                        }`}
                      >
                        {gstValidation.valid ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <AlertCircle className="h-5 w-5" />
                        )}
                      </span>
                    )}
                  </div>
                  {gstValidation && (
                    <div
                      className={`mt-2 rounded-md p-2 text-sm ${
                        gstValidation.valid 
                          ? "bg-stb-success/10 text-stb-success" 
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {gstValidation.valid ? (
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            GST Found - {gstValidation.state}
                          </p>
                          {gstValidation.legalName && (
                            <p className="text-xs opacity-90">
                              Legal Name: {gstValidation.legalName}
                            </p>
                          )}
                          {gstValidation.status && (
                            <p className="text-xs opacity-90">
                              Status: {gstValidation.status}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {gstValidation.error}
                          {gstValidation.verified === false && gstNumber.length === 15 && (
                            <span className="text-xs opacity-75"> - Please try again</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* GST Portal Username - Required for OTP */}
                {gstValidation?.valid && (
                  <div>
                    <label htmlFor="gstUsername" className="body-sm mb-1.5 block font-medium">
                      GST Portal Username <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="gstUsername"
                      type="text"
                      placeholder="Your GST portal username/email"
                      value={gstUsername}
                      onChange={(e) => setGstUsername(e.target.value)}
                      className="h-11"
                    />
                    <div className="mt-2 flex items-start gap-2 rounded-md bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">OTP Verification Required</p>
                        <p className="mt-0.5 opacity-90">
                          An OTP will be sent to your mobile number and email registered with this GST number. 
                          Make sure API access is enabled in your GST portal (View Profile &gt; Manage API Access).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Name */}
                <div>
                  <label htmlFor="businessName" className="body-sm mb-1.5 block font-medium">
                    Business Name (Optional)
                  </label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Your business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-11"
                  />
                </div>

                {/* Business Type */}
                <div>
                  <label htmlFor="businessType" className="body-sm mb-1.5 block font-medium">
                    Business Type (Optional)
                  </label>
                  <select
                    id="businessType"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select business type</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="body-sm font-medium text-foreground">
                  Benefits of adding GST:
                </h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-stb-success" />
                    Access to B2B wholesale pricing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-stb-success" />
                    GST invoices for tax credit
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-stb-success" />
                    Bulk order discounts
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleRequestGstOtp}
                  disabled={isRequestingOtp || !gstValidation?.valid || !gstUsername.trim()}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isRequestingOtp ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Send OTP to Verify
                      <Smartphone className="h-5 w-5" />
                    </>
                  )}
                </Button>

                <button
                  onClick={handleSkipGST}
                  disabled={isLoading || isRequestingOtp}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Skip for now, I&apos;ll add later
                </button>
              </div>
            </div>
          )}

          {/* Step 2b: GST OTP Verification */}
          {currentStep === "gst-otp" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stb-red-light">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <h2 className="heading-md">Verify GST OTP</h2>
                <p className="body-sm mt-2 text-muted-foreground">
                  Enter the 6-digit OTP sent to your GST registered mobile and email
                </p>
                <p className="body-sm mt-1 font-medium text-foreground">
                  {gstNumber}
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2">
                {gstOtp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { gstOtpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleGstOtpChange(index, e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => handleGstOtpKeyDown(index, e)}
                    className="h-12 w-11 rounded-lg border-2 border-border bg-background text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-14 sm:w-12"
                  />
                ))}
              </div>

              <Button
                onClick={handleVerifyGstOtp}
                disabled={isLoading || gstOtp.join("").length !== 6}
                className="w-full gap-2"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Verify OTP
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>

              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleResendGstOtp}
                  disabled={isRequestingOtp || gstOtpResendCooldown > 0}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                >
                  <RefreshCcw className={`h-4 w-4 ${isRequestingOtp ? 'animate-spin' : ''}`} />
                  {gstOtpResendCooldown > 0
                    ? `Resend OTP in ${gstOtpResendCooldown}s`
                    : "Resend OTP"}
                </button>

                <button
                  onClick={handleBackToGstDetails}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change GST Number
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === "complete" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-stb-success/10">
                <CheckCircle2 className="h-10 w-10 text-stb-success" />
              </div>

              <div>
                <h2 className="heading-lg">You&apos;re All Set!</h2>
                <p className="body-md mt-2 text-muted-foreground">
                  Your account is ready. Start exploring our products and enjoy
                  {session?.user?.isGstVerified
                    ? " exclusive B2B wholesale prices."
                    : " great deals."}
                </p>
              </div>

              <Button onClick={handleComplete} className="w-full gap-2" size="lg">
                Start Shopping
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
