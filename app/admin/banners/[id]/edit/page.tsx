import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Banner from "@/models/Banner";
import BannerForm from "@/components/admin/BannerForm";

interface EditBannerPageProps {
  params: Promise<{ id: string }>;
}

async function getBanner(id: string) {
  try {
    await dbConnect();
    const banner = await Banner.findById(id).lean();

    if (!banner) {
      return null;
    }

    return JSON.parse(JSON.stringify({
      ...banner,
      _id: banner._id.toString(),
    }));
  } catch (error) {
    console.error("Error fetching banner:", error);
    return null;
  }
}

export default async function EditBannerPage({ params }: EditBannerPageProps) {
  const { id } = await params;
  const banner = await getBanner(id);

  if (!banner) {
    notFound();
  }

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
          <h1 className="heading-xl">Edit Banner</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Update banner: {banner.title}
          </p>
        </div>
      </div>

      <BannerForm banner={banner} isEdit />
    </div>
  );
}
