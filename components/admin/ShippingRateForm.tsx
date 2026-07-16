"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface ShippingRate {
  _id: string;
  name: string;
  state: string;
  city?: string;
  pincode?: string;
  rate: number;
  freeAbove?: number;
  estimatedDays: number;
  isActive: boolean;
}

interface ShippingRateFormProps {
  rate?: ShippingRate;
  isEdit?: boolean;
}

const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function ShippingRateForm({ rate, isEdit = false }: ShippingRateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: rate?.name || "",
    state: rate?.state || "",
    city: rate?.city || "",
    pincode: rate?.pincode || "",
    rate: rate?.rate || 0,
    freeAbove: rate?.freeAbove || 0,
    estimatedDays: rate?.estimatedDays || 5,
    isActive: rate?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEdit
        ? `/api/admin/shipping/${rate?._id}`
        : "/api/admin/shipping";

      const payload = {
        ...formData,
        freeAbove: formData.freeAbove || null,
        city: formData.city || null,
        pincode: formData.pincode || null,
      };

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save shipping rate");
      }

      router.push("/admin/shipping");
      router.refresh();
    } catch (error) {
      console.error("Error saving shipping rate:", error);
      alert(error instanceof Error ? error.message : "Failed to save shipping rate");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Rate Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Rate Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Standard Shipping - Maharashtra"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A descriptive name for this shipping rate
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              State <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.state}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, state: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select State</option>
              {indianStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              City (Optional)
            </label>
            <Input
              type="text"
              value={formData.city}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, city: e.target.value }))
              }
              placeholder="Leave empty for entire state"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Pincode (Optional)
            </label>
            <Input
              type="text"
              value={formData.pincode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, pincode: e.target.value }))
              }
              placeholder="e.g., 400001"
              pattern="[0-9]{6}"
              maxLength={6}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              6-digit pincode for specific area
            </p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Pricing &amp; Delivery</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Shipping Rate <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                value={formData.rate || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rate: Number(e.target.value) }))
                }
                className="pl-7"
                min={0}
                step="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Free Shipping Above
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                value={formData.freeAbove || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    freeAbove: Number(e.target.value) || 0,
                  }))
                }
                className="pl-7"
                min={0}
                placeholder="No free shipping"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Orders above this amount get free shipping
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Estimated Days <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              value={formData.estimatedDays}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  estimatedDays: Number(e.target.value) || 1,
                }))
              }
              min={1}
              max={30}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Working days for delivery
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Status</h2>

        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium">Active</p>
            <p className="text-sm text-muted-foreground">
              Only active rates are used for shipping calculations
            </p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isActive: checked }))
            }
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Rate"
          ) : (
            "Create Rate"
          )}
        </Button>
      </div>
    </form>
  );
}
