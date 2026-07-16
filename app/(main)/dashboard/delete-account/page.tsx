"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  AlertTriangle, 
  Loader2, 
  Trash2, 
  ShieldAlert,
  Package,
  MessageSquare,
  Star,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface DeletionStatus {
  canDelete: boolean;
  user: {
    email: string;
    name: string;
    memberSince: string;
  };
  summary: {
    pendingOrders: number;
    openTickets: number;
    totalOrders: number;
    totalReviews: number;
  };
  blockers: string[];
}

const deletionReasons = [
  "I no longer need this account",
  "Privacy concerns",
  "I have another account",
  "Not satisfied with the service",
  "Too many emails/notifications",
  "Other",
];

export default function DeleteAccountPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/user/delete-account");
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      } else {
        setError(data.error || "Failed to load account information");
      }
    } catch {
      setError("Failed to load account information");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!status?.canDelete || !understood) return;
    
    setError("");
    setDeleting(true);

    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail, reason }),
      });

      const data = await res.json();

      if (res.ok) {
        // Sign out and redirect to homepage
        await signOut({ redirect: false });
        router.push("/?deleted=true");
      } else {
        setError(data.error || "Failed to delete account");
        setDeleting(false);
      }
    } catch {
      setError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <p className="text-sm text-destructive">{error || "Failed to load account information"}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/security"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">Delete Account</h1>
          <p className="text-xs text-muted-foreground">Permanently remove your account and data</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
        <div className="flex gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive text-sm">This action is irreversible</h3>
            <p className="text-xs text-destructive/80 mt-1">
              Deleting your account will permanently remove all your personal information, 
              addresses, and wishlist. Your order history will be anonymized for legal purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-semibold text-foreground mb-4">Account Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="font-semibold text-foreground">{status.summary.totalOrders}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Star className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Reviews Written</p>
              <p className="font-semibold text-foreground">{status.summary.totalReviews}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Open Tickets</p>
              <p className="font-semibold text-foreground">{status.summary.openTickets}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="font-semibold text-foreground text-xs">
                {new Date(status.user.memberSince).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blockers */}
      {!status.canDelete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 text-sm">Cannot delete account yet</h3>
              <p className="text-xs text-amber-700 mt-1">
                Please resolve the following before deleting your account:
              </p>
              <ul className="mt-2 space-y-1">
                {status.blockers.map((blocker, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-amber-700">
                    <XCircle className="h-3.5 w-3.5" />
                    {blocker}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 mt-3">
                {status.summary.pendingOrders > 0 && (
                  <Link href="/dashboard/orders">
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      View Orders
                    </Button>
                  </Link>
                )}
                {status.summary.openTickets > 0 && (
                  <Link href="/dashboard/support">
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      View Tickets
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Flow */}
      {status.canDelete && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </div>
            <div className={`h-0.5 flex-1 ${step > 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : "2"}
            </div>
            <div className={`h-0.5 flex-1 ${step > 2 ? "bg-primary" : "bg-muted"}`} />
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              step >= 3 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              3
            </div>
          </div>

          {/* Step 1: Reason */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Why are you leaving?</h3>
              <p className="text-xs text-muted-foreground">
                Help us improve by sharing your reason (optional)
              </p>
              <div className="space-y-2">
                {deletionReasons.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reason === r 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={(e) => setReason(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      reason === r ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {reason === r && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm text-foreground">{r}</span>
                  </label>
                ))}
              </div>
              <Button onClick={() => setStep(2)} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Confirmation */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Confirm your email</h3>
              <p className="text-xs text-muted-foreground">
                Type <span className="font-mono text-foreground">{status.user.email}</span> to confirm
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirmEmail">Email Address</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={confirmEmail.toLowerCase() !== status.user.email.toLowerCase()}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Final Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Final Confirmation</h3>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
                <p className="text-xs text-destructive">
                  By clicking &quot;Delete My Account&quot;, you acknowledge that:
                </p>
                <ul className="text-xs text-destructive/80 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
                    All your personal data will be permanently deleted
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
                    Your saved addresses and wishlist will be removed
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
                    Your reviews will be anonymized
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
                    Order history will be kept anonymously for legal purposes
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-destructive shrink-0" />
                    This action cannot be undone
                  </li>
                </ul>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span className="text-xs text-foreground">
                  I understand that this action is permanent and cannot be reversed
                </span>
              </label>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={deleting}>
                  Back
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!understood || deleting}
                  className="flex-1 gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete My Account
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alternative: Keep Account */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2">
          Changed your mind?
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Keep My Account
          </Button>
        </Link>
      </div>
    </div>
  );
}
