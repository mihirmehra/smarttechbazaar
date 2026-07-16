"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Check, BadgeCheck, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  gstNumber?: string;
  isGstVerified: boolean;
  isEmailVerified: boolean;
  googleId?: string;
  role: string;
  createdAt: string;
}

const businessTypes = [
  { value: "retailer", label: "Retailer" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "distributor", label: "Distributor" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "other", label: "Other" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", businessName: "", businessType: "", gstNumber: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setProfile(d.user);
          setForm({
            name: d.user.name || "",
            phone: d.user.phone || "",
            businessName: d.user.businessName || "",
            businessType: d.user.businessType || "",
            gstNumber: d.user.gstNumber || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, ...data.user } : data.user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Account Info Card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-heading font-semibold text-foreground mb-3">Account Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Email</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{profile.email}</span>
              {profile.isEmailVerified && <BadgeCheck className="h-4 w-4 text-green-500" />}
            </div>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium text-foreground capitalize">{profile.role}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Sign-in method</span>
            <span className="font-medium text-foreground">{profile.googleId ? "Google" : "Email & Password"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium text-foreground">{new Date(profile.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Edit Profile</h3>

        {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
            <Check className="h-4 w-4" />
            Profile updated successfully
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Business Details</h4>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Your business name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessType">Business Type</Label>
                <select
                  id="businessType"
                  value={form.businessType}
                  onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select type</option>
                  {businessTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">
                GST Number
                {profile.isGstVerified && (
                  <span className="ml-2 text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                    Verified
                  </span>
                )}
              </Label>
              <Input
                id="gstNumber"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </form>

      {/* Delete Account */}
      <div className="bg-card rounded-2xl border border-destructive/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Delete Account</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
          </div>
          <Link href="/dashboard/delete-account">
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive shrink-0 gap-1">
              Delete
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
