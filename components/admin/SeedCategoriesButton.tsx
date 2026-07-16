"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SeedCategoriesButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const router = useRouter();

  const handleSeed = async () => {
    setIsSeeding(true);

    try {
      const response = await fetch("/api/admin/categories/seed", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to seed categories");
      }

      alert(
        `Categories seeded successfully!\n\nCreated: ${data.results.created.join(", ") || "None"}\nSkipped: ${data.results.skipped.join(", ") || "None"}`
      );

      router.refresh();
    } catch (error) {
      console.error("Error seeding categories:", error);
      alert(error instanceof Error ? error.message : "Failed to seed categories");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSeed}
      disabled={isSeeding}
      className="gap-2"
    >
      {isSeeding ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Seeding...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Seed Default Categories
        </>
      )}
    </Button>
  );
}
