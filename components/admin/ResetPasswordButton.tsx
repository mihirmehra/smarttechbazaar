"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Key, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ResetPasswordButtonProps {
  userId: string;
  userName: string;
}

export default function ResetPasswordButton({
  userId,
  userName,
}: ResetPasswordButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"select" | "generate" | "manual" | "result">("select");
  const [newPassword, setNewPassword] = useState("");
  const [result, setResult] = useState<{ tempPassword?: string; resetLink?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateTemp = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_temp" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate password");
      }

      setResult({ tempPassword: data.tempPassword });
      setMode("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_password", newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to set password");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_link" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate link");
      }

      setResult({ resetLink: data.resetLink });
      setMode("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setMode("select");
    setNewPassword("");
    setResult(null);
    setError("");
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2" />
        }
      >
        <Key className="h-4 w-4" />
        Reset Password
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password for {userName}</DialogTitle>
          <DialogDescription>
            Choose how you want to reset the user&apos;s password.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {mode === "select" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => setMode("generate")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Generate Temporary Password</p>
                <p className="text-xs text-muted-foreground">
                  Create a random password for the user
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => setMode("manual")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Key className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Set New Password</p>
                <p className="text-xs text-muted-foreground">
                  Manually enter a new password
                </p>
              </div>
            </Button>
          </div>
        )}

        {mode === "generate" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will generate a random temporary password. Make sure to share
              it with the user securely.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setMode("select")}>
                Back
              </Button>
              <Button onClick={handleGenerateTemp} disabled={loading}>
                {loading ? "Generating..." : "Generate Password"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "manual" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setMode("select")}>
                Back
              </Button>
              <Button
                onClick={handleSetPassword}
                disabled={loading || newPassword.length < 8}
              >
                {loading ? "Setting..." : "Set Password"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "result" && result && (
          <div className="space-y-4">
            {result.tempPassword && (
              <div>
                <label className="text-sm font-medium">Temporary Password</label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    readOnly
                    value={result.tempPassword}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(result.tempPassword!)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Share this password securely with the user. They should change
                  it after logging in.
                </p>
              </div>
            )}
            {result.resetLink && (
              <div>
                <label className="text-sm font-medium">Reset Link</label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    readOnly
                    value={result.resetLink}
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(result.resetLink!)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This link expires in 24 hours.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
