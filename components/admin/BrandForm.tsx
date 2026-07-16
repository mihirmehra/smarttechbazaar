"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Sort order options
const SORT_ORDER_OPTIONS = [
  { value: 0, label: "Default (0)" },
  { value: 1, label: "1st Position" },
  { value: 2, label: "2nd Position" },
  { value: 3, label: "3rd Position" },
  { value: 4, label: "4th Position" },
  { value: 5, label: "5th Position" },
  { value: 6, label: "6th Position" },
  { value: 7, label: "7th Position" },
  { value: 8, label: "8th Position" },
  { value: 9, label: "9th Position" },
  { value: 10, label: "10th Position" },
  { value: 15, label: "15th Position" },
  { value: 20, label: "20th Position" },
  { value: 50, label: "50th Position" },
  { value: 100, label: "100th Position (Last)" },
];

interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  isActive: boolean;
  sortOrder: number;
}

interface BrandFormProps {
  brand?: Brand;
  isEdit?: boolean;
}

export default function BrandForm({ brand, isEdit = false }: BrandFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: brand?.name || "",
    description: brand?.description || "",
    logo: brand?.logo || "",
    isActive: brand?.isActive ?? true,
    sortOrder: brand?.sortOrder ?? 0,
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload logo");
      }

      setFormData((prev) => ({ ...prev, logo: data.url }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert(error instanceof Error ? error.message : "Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEdit
        ? `/api/admin/brands/${brand?._id}`
        : "/api/admin/brands";

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save brand");
      }

      router.push("/admin/brands");
      router.refresh();
    } catch (error) {
      console.error("Error saving brand:", error);
      alert(error instanceof Error ? error.message : "Failed to save brand");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Basic Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Brand Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter brand name"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Enter brand description"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Sort Order</label>
            <select
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sortOrder: parseInt(e.target.value) || 0,
                }))
              }
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SORT_ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Lower numbers appear first
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active
            </label>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Brand Logo</h2>

        <div className="flex flex-wrap items-start gap-4">
          {formData.logo && (
            <div className="relative h-24 w-40 overflow-hidden rounded-lg bg-muted">
              <Image
                src={formData.logo}
                alt="Brand logo"
                fill
                className="object-contain p-2"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, logo: "" }))}
                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <label className="flex h-24 w-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="mt-1 text-xs text-muted-foreground">Upload Logo</span>
              </>
            )}
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Recommended: Transparent PNG, max width 400px
        </p>
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
            "Update Brand"
          ) : (
            "Create Brand"
          )}
        </Button>
      </div>
    </form>
  );
}
