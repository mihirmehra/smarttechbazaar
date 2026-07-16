import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import BannerForm from "@/components/admin/BannerForm";

interface NewBannerPageProps {
  searchParams: Promise<{ position?: string }>;
}

export default async function NewBannerPage({ searchParams }: NewBannerPageProps) {
  const params = await searchParams;
  const defaultPosition = params.position || "hero";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/banners"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="heading-xl">New Banner</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Create a new promotional banner
          </p>
        </div>
      </div>

      <BannerForm defaultPosition={defaultPosition} />
    </div>
  );
}
