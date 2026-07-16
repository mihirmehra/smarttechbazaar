"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Brand {
  _id: string;
  name: string;
}

interface Specification {
  key: string;
  value: string;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  category: string;
  brand?: string;
  images: string[];
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  stock: number;
  minOrderQty: number;
  maxOrderQty?: number;
  unit: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  specifications: Specification[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

interface ProductFormProps {
  product?: Product;
  isEdit?: boolean;
}

export default function ProductForm({ product, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    shortDescription: product?.shortDescription || "",
    sku: product?.sku || "",
    category: product?.category || "",
    brand: product?.brand || "",
    images: product?.images || [],
    priceB2C: product?.priceB2C || 0,
    priceB2B: product?.priceB2B || 0,
    mrp: product?.mrp || 0,
    stock: product?.stock || 0,
    minOrderQty: product?.minOrderQty || 1,
    maxOrderQty: product?.maxOrderQty || undefined,
    unit: product?.unit || "piece",
    weight: product?.weight || undefined,
    dimensions: product?.dimensions || { length: 0, width: 0, height: 0 },
    specifications: product?.specifications || [],
    tags: product?.tags || [],
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    isNewArrival: product?.isNewArrival ?? false,
    isBestSeller: product?.isBestSeller ?? false,
    metaTitle: product?.metaTitle || "",
    metaDescription: product?.metaDescription || "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/brands"),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        if (brandRes.ok) {
          const brandData = await brandRes.json();
          setBrands(brandData.brands || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchData();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
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

        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
      alert(error instanceof Error ? error.message : "Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addSpecification = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: "", value: "" }],
    }));
  };

  const updateSpecification = (index: number, field: "key" | "value", value: string) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.map((spec, i) =>
        i === index ? { ...spec, [field]: value } : spec
      ),
    }));
  };

  const removeSpecification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim().toLowerCase())) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim().toLowerCase()],
        }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEdit
        ? `/api/admin/products/${product?._id}`
        : "/api/admin/products";

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save product");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error("Error saving product:", error);
      alert(error instanceof Error ? error.message : "Failed to save product");
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
              Product Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              SKU <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.sku}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))
              }
              placeholder="e.g., STB-001"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Brand</label>
            <select
              value={formData.brand}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, brand: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select brand (optional)</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Unit</label>
            <select
              value={formData.unit}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, unit: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="piece">Piece</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="l">Litre (L)</option>
              <option value="ml">Millilitre (ml)</option>
              <option value="m">Meter (m)</option>
              <option value="box">Box</option>
              <option value="pack">Pack</option>
              <option value="set">Set</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Short Description</label>
            <Input
              type="text"
              value={formData.shortDescription}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
              }
              placeholder="Brief description for listings"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Full product description"
              rows={5}
              required
            />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Product Images</h2>

        <div className="flex flex-wrap gap-4">
          {formData.images.map((image, index) => (
            <div
              key={index}
              className="relative h-28 w-28 overflow-hidden rounded-lg border border-border bg-muted"
            >
              <Image
                src={image}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Main
                </span>
              )}
            </div>
          ))}

          <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50">
            <input
              type="file"
              accept="image/*"
              multiple
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
        <p className="mt-2 text-xs text-muted-foreground">
          First image will be the main product image. Recommended: 800x800px
        </p>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Pricing &amp; Inventory</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              MRP <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                value={formData.mrp || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mrp: Number(e.target.value) }))
                }
                className="pl-7"
                min={0}
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              B2C Price <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                value={formData.priceB2C || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priceB2C: Number(e.target.value) }))
                }
                className="pl-7"
                min={0}
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              B2B Price <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
              <Input
                type="number"
                value={formData.priceB2B || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priceB2B: Number(e.target.value) }))
                }
                className="pl-7"
                min={0}
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Stock <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, stock: Number(e.target.value) }))
              }
              min={0}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Min Order Qty</label>
            <Input
              type="number"
              value={formData.minOrderQty}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, minOrderQty: Number(e.target.value) }))
              }
              min={1}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Max Order Qty</label>
            <Input
              type="number"
              value={formData.maxOrderQty || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxOrderQty: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              min={1}
              placeholder="No limit"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Weight (grams)</label>
            <Input
              type="number"
              value={formData.weight || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  weight: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              min={0}
              placeholder="Optional"
            />
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Dimensions (cm)</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Length</label>
            <Input
              type="number"
              value={formData.dimensions?.length || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, length: Number(e.target.value) },
                }))
              }
              min={0}
              step="0.1"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Width</label>
            <Input
              type="number"
              value={formData.dimensions?.width || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, width: Number(e.target.value) },
                }))
              }
              min={0}
              step="0.1"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Height</label>
            <Input
              type="number"
              value={formData.dimensions?.height || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dimensions: { ...prev.dimensions, height: Number(e.target.value) },
                }))
              }
              min={0}
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="heading-md">Specifications</h2>
          <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>

        {formData.specifications.length > 0 ? (
          <div className="space-y-3">
            {formData.specifications.map((spec, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  type="text"
                  value={spec.key}
                  onChange={(e) => updateSpecification(index, "key", e.target.value)}
                  placeholder="e.g., Material"
                  className="flex-1"
                />
                <Input
                  type="text"
                  value={spec.value}
                  onChange={(e) => updateSpecification(index, "value", e.target.value)}
                  placeholder="e.g., Stainless Steel"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSpecification(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No specifications added. Click Add to create specifications.
          </p>
        )}
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Tags</h2>

        <div className="flex flex-wrap gap-2 mb-3">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <Input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
          placeholder="Type tag and press Enter"
        />
      </div>

      {/* Status & Visibility */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Status &amp; Visibility</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm font-medium">Active</span>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm font-medium">Featured</span>
            <Switch
              checked={formData.isFeatured}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isFeatured: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm font-medium">New Arrival</span>
            <Switch
              checked={formData.isNewArrival}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isNewArrival: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <span className="text-sm font-medium">Best Seller</span>
            <Switch
              checked={formData.isBestSeller}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isBestSeller: checked }))
              }
            />
          </div>
        </div>
      </div>

      {/* SEO */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">SEO Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Meta Title</label>
            <Input
              type="text"
              value={formData.metaTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))
              }
              placeholder="Leave empty to use product name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Meta Description</label>
            <Textarea
              value={formData.metaDescription}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))
              }
              placeholder="Leave empty to use short description"
              rows={3}
            />
          </div>
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
            "Update Product"
          ) : (
            "Create Product"
          )}
        </Button>
      </div>
    </form>
  );
}
