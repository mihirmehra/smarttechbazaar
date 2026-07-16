"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, Check, ChevronDown } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as LucideIcons from "lucide-react";

// Popular icons for categories
const CATEGORY_ICONS = [
  { name: "Laptop", label: "Laptop" },
  { name: "Monitor", label: "Monitor" },
  { name: "Smartphone", label: "Smartphone" },
  { name: "Tablet", label: "Tablet" },
  { name: "Headphones", label: "Headphones" },
  { name: "Camera", label: "Camera" },
  { name: "Printer", label: "Printer" },
  { name: "Keyboard", label: "Keyboard" },
  { name: "Mouse", label: "Mouse" },
  { name: "Speaker", label: "Speaker" },
  { name: "Wifi", label: "WiFi/Router" },
  { name: "HardDrive", label: "Storage" },
  { name: "Cpu", label: "CPU/Processor" },
  { name: "MemoryStick", label: "Memory" },
  { name: "Cable", label: "Cables" },
  { name: "Battery", label: "Battery" },
  { name: "Plug", label: "Power" },
  { name: "Server", label: "Server" },
  { name: "Network", label: "Network" },
  { name: "Shield", label: "Security" },
  { name: "Gamepad2", label: "Gaming" },
  { name: "Tv", label: "TV" },
  { name: "Watch", label: "Watch" },
  { name: "Home", label: "Home" },
  { name: "ShoppingBag", label: "Shopping" },
  { name: "Gift", label: "Gift" },
  { name: "Tag", label: "Tag" },
  { name: "Star", label: "Star" },
  { name: "Heart", label: "Heart" },
  { name: "Package", label: "Package" },
  { name: "Boxes", label: "Boxes" },
  { name: "Zap", label: "Electronics" },
  { name: "Settings", label: "Settings" },
  { name: "Wrench", label: "Tools" },
  { name: "Layers", label: "Layers" },
  { name: "Grid3X3", label: "Grid" },
];

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

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parent?: { _id: string; name: string } | string | null;
  isActive: boolean;
  sortOrder: number;
}

interface CategoryFormProps {
  category?: Category;
  allCategories: { _id: string; name: string }[];
  isEdit?: boolean;
}

export default function CategoryForm({
  category,
  allCategories,
  isEdit = false,
}: CategoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [formData, setFormData] = useState({
    name: category?.name || "",
    description: category?.description || "",
    image: category?.image || "",
    icon: category?.icon || "",
    parent: typeof category?.parent === "object" ? category?.parent?._id || "" : category?.parent || "",
    isActive: category?.isActive ?? true,
    sortOrder: category?.sortOrder ?? 0,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        throw new Error(data.error || "Failed to upload image");
      }

      setFormData((prev) => ({ ...prev, image: data.url }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEdit
        ? `/api/admin/categories/${category?._id}`
        : "/api/admin/categories";

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          parent: formData.parent || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save category");
      }

      router.push("/admin/categories");
      router.refresh();
    } catch (error) {
      console.error("Error saving category:", error);
      alert(error instanceof Error ? error.message : "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out current category and its children from parent options
  const availableParents = allCategories.filter((cat) => cat._id !== category?._id);

  // Filter icons based on search
  const filteredIcons = CATEGORY_ICONS.filter(
    (icon) =>
      icon.name.toLowerCase().includes(iconSearch.toLowerCase()) ||
      icon.label.toLowerCase().includes(iconSearch.toLowerCase())
  );

  // Get icon component
  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return IconComponent || null;
  };

  const SelectedIcon = formData.icon ? getIconComponent(formData.icon) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Basic Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Category Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter category name"
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
              placeholder="Enter category description"
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Parent Category</label>
            <select
              value={formData.parent}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, parent: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None (Root Category)</option>
              {availableParents.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Category Icon</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="flex items-center gap-2">
                  {SelectedIcon ? (
                    <>
                      <SelectedIcon className="h-4 w-4" />
                      <span>{formData.icon}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select an icon</span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showIconPicker && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover p-3 shadow-lg">
                  <Input
                    type="text"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Search icons..."
                    className="mb-2"
                  />
                  <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
                    {filteredIcons.map((icon) => {
                      const IconComp = getIconComponent(icon.name);
                      if (!IconComp) return null;
                      return (
                        <button
                          key={icon.name}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, icon: icon.name }));
                            setShowIconPicker(false);
                            setIconSearch("");
                          }}
                          className={`flex flex-col items-center justify-center rounded-md p-2 text-xs transition-colors hover:bg-muted ${
                            formData.icon === icon.name
                              ? "bg-primary/10 text-primary"
                              : ""
                          }`}
                          title={icon.label}
                        >
                          <IconComp className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                  {formData.icon && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, icon: "" }));
                        setShowIconPicker(false);
                      }}
                      className="mt-2 w-full rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              )}
            </div>
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

      {/* Image */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Category Image</h2>

        <div className="flex flex-wrap items-start gap-4">
          {formData.image && (
            <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-muted">
              <Image
                src={formData.image}
                alt="Category"
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="mt-1 text-xs text-muted-foreground">Upload</span>
              </>
            )}
          </label>
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
            "Update Category"
          ) : (
            "Create Category"
          )}
        </Button>
      </div>
    </form>
  );
}
