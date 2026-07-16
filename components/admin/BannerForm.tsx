"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  imageMobile?: string;
  link?: string;
  position: string;
  isActive: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
}

interface BannerFormProps {
  banner?: Banner;
  isEdit?: boolean;
  defaultPosition?: string;
}

export default function BannerForm({ banner, isEdit = false, defaultPosition = "hero" }: BannerFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"desktop" | "mobile" | null>(null);

  const [formData, setFormData] = useState({
    title: banner?.title || "",
    subtitle: banner?.subtitle || "",
    image: banner?.image || "",
    imageMobile: banner?.imageMobile || "",
    link: banner?.link || "",
    position: banner?.position || defaultPosition,
    isActive: banner?.isActive ?? true,
    sortOrder: banner?.sortOrder ?? 0,
    startDate: banner?.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : "",
    endDate: banner?.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "desktop" | "mobile") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadTarget(target);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      if (target === "desktop") {
        setFormData((prev) => ({ ...prev, image: data.url }));
      } else {
        setFormData((prev) => ({ ...prev, imageMobile: data.url }));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEdit
        ? `/api/admin/banners/${banner?._id}`
        : "/api/admin/banners";

      const payload = {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
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
        throw new Error(data.error || "Failed to save banner");
      }

      router.push("/admin/banners");
      router.refresh();
    } catch (error) {
      console.error("Error saving banner:", error);
      alert(error instanceof Error ? error.message : "Failed to save banner");
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
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter banner title"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Subtitle</label>
            <Input
              type="text"
              value={formData.subtitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
              }
              placeholder="Enter banner subtitle (optional)"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Position <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.position}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, position: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="hero">Hero (Main Banner - Legacy)</option>
              <option value="hero_slider">Hero Slider (1500x450 - Homepage)</option>
              <option value="ad_banner">Ad Banner (1500x300 - Homepage Ads)</option>
              <option value="promo">Promo (Promotional Section)</option>
              <option value="sidebar">Sidebar</option>
              <option value="footer">Footer</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Sort Order</label>
            <Input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sortOrder: parseInt(e.target.value) || 0,
                }))
              }
              min={0}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Lower numbers appear first
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Link URL</label>
            <Input
              type="url"
              value={formData.link}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, link: e.target.value }))
              }
              placeholder="https://example.com/page"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Where should the banner link to when clicked?
            </p>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Banner Images</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Desktop Image */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Desktop Image <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-col gap-3">
              {formData.image && (
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src={formData.image}
                    alt="Desktop banner"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                    className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "desktop")}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading && uploadTarget === "desktop" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-1 text-xs text-muted-foreground">
                      {formData.image ? "Replace Image" : "Upload Desktop Image"}
                    </span>
                  </>
                )}
              </label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Hero Slider: 1500x450px | Ad Banner: 1500x300px | Promo: 800x400px
            </p>
          </div>

          {/* Mobile Image */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Mobile Image (Optional)
            </label>
            <div className="flex flex-col gap-3">
              {formData.imageMobile && (
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src={formData.imageMobile}
                    alt="Mobile banner"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, imageMobile: "" }))}
                    className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "mobile")}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading && uploadTarget === "mobile" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="mt-1 text-xs text-muted-foreground">
                      {formData.imageMobile ? "Replace Image" : "Upload Mobile Image"}
                    </span>
                  </>
                )}
              </label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Optimized for mobile devices. Falls back to desktop if not set.
            </p>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Schedule (Optional)</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Set a start and end date to automatically show/hide the banner.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Start Date</label>
            <Input
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">End Date</label>
            <Input
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
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
              Only active banners are displayed on the website
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
        <Button type="submit" disabled={isSubmitting || !formData.image}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Banner"
          ) : (
            "Create Banner"
          )}
        </Button>
      </div>
    </form>
  );
}
