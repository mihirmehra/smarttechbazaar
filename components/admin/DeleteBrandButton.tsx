"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteBrandButtonProps {
  brandId: string;
  brandName: string;
  productCount: number;
}

export default function DeleteBrandButton({
  brandId,
  brandName,
  productCount,
}: DeleteBrandButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const canDelete = productCount === 0;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete brand");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting brand:", error);
      alert(error instanceof Error ? error.message : "Failed to delete brand");
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
            <h3 className="text-lg font-semibold">Delete Brand</h3>
          </div>

          {!canDelete ? (
            <>
              <p className="mb-4 text-muted-foreground">
                Cannot delete <strong>{brandName}</strong> because it has {productCount} product(s).
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Please remove the brand from all products first.
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
                Are you sure you want to delete <strong>{brandName}</strong>?
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
      title="Delete brand"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
