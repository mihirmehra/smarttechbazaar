"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const emailTypes = [
  { value: "welcome", label: "Welcome Email", description: "Sent when a customer registers" },
  { value: "new_user", label: "New User Notification", description: "Sent to admin on registration" },
  { value: "password_reset_temp", label: "Temporary Password", description: "Password reset with temp password" },
  { value: "password_reset_link", label: "Password Reset Link", description: "Password reset with link" },
  { value: "order_confirmation", label: "Order Confirmation", description: "Sent when order is placed" },
  { value: "order_status", label: "Order Status Update", description: "Sent on status change" },
  { value: "ticket_created", label: "Ticket Created", description: "Support ticket confirmation" },
  { value: "ticket_reply", label: "Ticket Reply", description: "Reply notification" },
  { value: "low_stock", label: "Low Stock Alert", description: "Admin inventory alert" },
];

export default function EmailSettingsPage() {
  const { data: session, status } = useSession();
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [companyEmail, setCompanyEmail] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [selectedType, setSelectedType] = useState("welcome");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus("checking");
    setConnectionError(null);
    try {
      const res = await fetch("/api/admin/email/test");
      const data = await res.json();
      setConnectionStatus(data.connected ? "connected" : "disconnected");
      setCompanyEmail(data.email || "");
      setSmtpUser(data.smtpUser || "");
      if (data.error) {
        setConnectionError(data.error);
      }
    } catch {
      setConnectionStatus("disconnected");
      setConnectionError("Failed to check connection");
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setSendResult({ success: false, message: "Please enter a recipient email" });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, to: testEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({ success: true, message: `Test email sent successfully to ${testEmail}` });
      } else {
        setSendResult({ success: false, message: data.error || "Failed to send test email" });
      }
    } catch {
      setSendResult({ success: false, message: "Failed to send test email" });
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || session.user.role !== "super_admin") {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/settings"
          className="rounded-lg p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure and test email functionality
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${
              connectionStatus === "connected" 
                ? "bg-emerald-100 text-emerald-600" 
                : connectionStatus === "disconnected"
                ? "bg-red-100 text-red-600"
                : "bg-amber-100 text-amber-600"
            }`}>
              {connectionStatus === "connected" ? (
                <CheckCircle className="h-6 w-6" />
              ) : connectionStatus === "disconnected" ? (
                <XCircle className="h-6 w-6" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">
                SMTP Connection: {" "}
                <span className={
                  connectionStatus === "connected" 
                    ? "text-emerald-600" 
                    : connectionStatus === "disconnected"
                    ? "text-red-600"
                    : "text-amber-600"
                }>
                  {connectionStatus === "connected" 
                    ? "Connected" 
                    : connectionStatus === "disconnected"
                    ? "Disconnected"
                    : "Checking..."}
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">
                {smtpUser ? `SMTP User: ${smtpUser}` : "Gmail SMTP"}
                {companyEmail && companyEmail !== smtpUser && ` | From: ${companyEmail}`}
              </p>
              {connectionError && connectionStatus === "disconnected" && (
                <p className="text-sm text-red-600 mt-1">
                  Error: {connectionError}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnection}
            disabled={connectionStatus === "checking"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${connectionStatus === "checking" ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Test Email */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </h3>
          <p className="text-sm text-muted-foreground">
            Send a test email to verify your email configuration
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Email
            </label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {emailTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedType === type.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {sendResult && (
            <div className={`p-4 rounded-lg ${
              sendResult.success 
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {sendResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                {sendResult.message}
              </div>
            </div>
          )}

          <Button
            onClick={sendTestEmail}
            disabled={isSending || connectionStatus !== "connected"}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Email Templates Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>The following email templates are configured and active:</p>
          <ul className="mt-3 space-y-2">
            <li><strong>Welcome Email</strong> - Sent automatically when a customer registers</li>
            <li><strong>New User Notification</strong> - Sent to admin when a new user registers</li>
            <li><strong>Password Reset</strong> - Sent when admin resets user password</li>
            <li><strong>Order Confirmation</strong> - Sent when customer places an order</li>
            <li><strong>Order Status Update</strong> - Sent when order status changes</li>
            <li><strong>Ticket Created</strong> - Sent when a support ticket is created</li>
            <li><strong>Ticket Reply</strong> - Sent when admin replies to a ticket</li>
            <li><strong>Low Stock Alert</strong> - Sent to admin when product stock is low</li>
            <li><strong>Refund Processed</strong> - Sent when a refund is processed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
