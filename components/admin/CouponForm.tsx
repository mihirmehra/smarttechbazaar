"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CouponFormProps {
  coupon?: {
    _id: string;
    code: string;
    description?: string;
    type: "percentage" | "fixed";
    value: number;
    minOrderValue: number;
    maxDiscount?: number;
    usageLimit?: number;
    userUsageLimit?: number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
  };
}

export default function CouponForm({ coupon }: CouponFormProps) {
  const router = useRouter();
  const isEditing = !!coupon;

  const [form, setForm] = useState({
    code: coupon?.code || "",
    description: coupon?.description || "",
    type: coupon?.type || "percentage",
    value: coupon?.value?.toString() || "",
    minOrderValue: coupon?.minOrderValue?.toString() || "0",
    maxDiscount: coupon?.maxDiscount?.toString() || "",
    usageLimit: coupon?.usageLimit?.toString() || "",
    userUsageLimit: coupon?.userUsageLimit?.toString() || "1",
    validFrom: coupon?.validFrom
      ? new Date(coupon.validFrom).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    validUntil: coupon?.validUntil
      ? new Date(coupon.validUntil).toISOString().slice(0, 16)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    isActive: coupon?.isActive ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        type: form.type,
        value: parseFloat(form.value),
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : undefined,
        userUsageLimit: form.userUsageLimit ? parseInt(form.userUsageLimit) : 1,
        validFrom: new Date(form.validFrom),
        validUntil: new Date(form.validUntil),
        isActive: form.isActive,
      };

      const url = isEditing
        ? `/api/admin/coupons/${coupon._id}`
        : "/api/admin/coupons";

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save coupon");
      }

      router.push("/admin/coupons");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="heading-md mb-4">Coupon Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code">Coupon Code *</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SAVE20"
              maxLength={20}
              required
              className="font-mono uppercase"
            />
            <p className="text-xs text-muted-foreground">Max 20 characters, will be uppercase</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Get 20% off on your order"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      {/* Discount Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="heading-md mb-4">Discount Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Discount Type *</Label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              {form.type === "percentage" ? "Percentage *" : "Amount *"}
            </Label>
            <div className="relative">
              <Input
                id="value"
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === "percentage" ? "20" : "500"}
                min="0"
                max={form.type === "percentage" ? "100" : undefined}
                step="0.01"
                required
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {form.type === "percentage" ? "%" : "₹"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minOrderValue">Minimum Order Value</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="minOrderValue"
                type="number"
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                placeholder="0"
                min="0"
                className="pl-8"
              />
            </div>
          </div>

          {form.type === "percentage" && (
            <div className="space-y-2">
              <Label htmlFor="maxDiscount">Max Discount Cap</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="maxDiscount"
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="No limit"
                  min="0"
                  className="pl-8"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Limits */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="heading-md mb-4">Usage Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="usageLimit">Total Usage Limit</Label>
            <Input
              id="usageLimit"
              type="number"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              placeholder="Unlimited"
              min="1"
            />
            <p className="text-xs text-muted-foreground">Leave empty for unlimited uses</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userUsageLimit">Per User Limit</Label>
            <Input
              id="userUsageLimit"
              type="number"
              value={form.userUsageLimit}
              onChange={(e) => setForm({ ...form, userUsageLimit: e.target.value })}
              placeholder="1"
              min="1"
            />
            <p className="text-xs text-muted-foreground">Times each user can use this coupon</p>
          </div>
        </div>
      </div>

      {/* Validity Period */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="heading-md mb-4">Validity Period</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="validFrom">Start Date *</Label>
            <Input
              id="validFrom"
              type="datetime-local"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">End Date *</Label>
            <Input
              id="validUntil"
              type="datetime-local"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading-md">Active Status</h2>
            <p className="text-sm text-muted-foreground">Enable or disable this coupon</p>
          </div>
          <Switch
            checked={form.isActive}
            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/coupons")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? "Update Coupon" : "Create Coupon"}
        </Button>
      </div>
    </form>
  );
}
