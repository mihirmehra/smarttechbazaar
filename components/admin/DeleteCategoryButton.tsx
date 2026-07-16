"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteCategoryButtonProps {
  categoryId: string;
  categoryName: string;
  productCount: number;
  subcategoryCount: number;
}

export default function DeleteCategoryButton({
  categoryId,
  categoryName,
  productCount,
  subcategoryCount,
}: DeleteCategoryButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const canDelete = productCount === 0 && subcategoryCount === 0;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold">Delete Category</h3>
          </div>

          {!canDelete ? (
            <>
              <p className="mb-4 text-muted-foreground">
                Cannot delete <strong>{categoryName}</strong> because it has:
              </p>
              <ul className="mb-4 list-inside list-disc text-sm text-muted-foreground">
                {productCount > 0 && <li>{productCount} product(s)</li>}
                {subcategoryCount > 0 && <li>{subcategoryCount} subcategory(s)</li>}
              </ul>
              <p className="mb-4 text-sm text-muted-foreground">
                Please move or delete these items first.
              </p>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-muted-foreground">
                Are you sure you want to delete <strong>{categoryName}</strong>?
                This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      title="Delete category"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
