import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongodb";
import Banner from "@/models/Banner";
import { Plus, Edit, Trash2, Eye, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DeleteBannerButton from "@/components/admin/DeleteBannerButton";

async function getBanners() {
  try {
    await dbConnect();

    const banners = await Banner.find()
      .sort({ position: 1, sortOrder: 1, createdAt: -1 })
      .lean();

    return JSON.parse(JSON.stringify(banners));
  } catch (error) {
    console.error("Error fetching banners:", error);
    return [];
  }
}

const positionLabels: Record<string, { label: string; color: string; description?: string }> = {
  hero_slider: { label: "Hero Slider", color: "bg-primary/10 text-primary", description: "1500x450 - Homepage main slider" },
  ad_banner: { label: "Ad Banners", color: "bg-stb-info/10 text-stb-info", description: "1500x300 - Homepage ad banners" },
  hero: { label: "Hero (Legacy)", color: "bg-chart-4/10 text-chart-4" },
  promo: { label: "Promo", color: "bg-accent/10 text-accent" },
  sidebar: { label: "Sidebar", color: "bg-chart-4/10 text-chart-4" },
  footer: { label: "Footer", color: "bg-muted text-muted-foreground" },
};

export default async function BannersPage() {
  const banners = await getBanners();

  // Group banners by position
  const groupedBanners = banners.reduce((acc: Record<string, typeof banners>, banner: { position: string }) => {
    if (!acc[banner.position]) {
      acc[banner.position] = [];
    }
    acc[banner.position].push(banner);
    return acc;
  }, {});

  const positions = ["hero_slider", "ad_banner", "hero", "promo", "sidebar", "footer"];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-xl">Banners</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Manage promotional banners ({banners.length} banners)
          </p>
        </div>
        <Link href="/admin/banners/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Banner
          </Button>
        </Link>
      </div>

      {/* Position Guide */}
      <div className="flex flex-wrap gap-2">
        {positions.map((pos) => {
          const config = positionLabels[pos];
          const count = groupedBanners[pos]?.length || 0;
          return (
            <Badge key={pos} variant="secondary" className={config.color}>
              {config.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Banners by Position */}
      {positions.map((position) => {
        const positionBanners = groupedBanners[position] || [];
        const config = positionLabels[position];

        return (
          <div key={position} className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={config.color}>
                  {config.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {positionBanners.length} {positionBanners.length === 1 ? "banner" : "banners"}
                </span>
              </div>
              <Link href={`/admin/banners/new?position=${position}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add {config.label}
                </Button>
              </Link>
            </div>

            {positionBanners.length > 0 ? (
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {positionBanners.map((banner: {
                  _id: string;
                  title: string;
                  subtitle?: string;
                  image: string;
                  link?: string;
                  isActive: boolean;
                  sortOrder: number;
                  startDate?: string;
                  endDate?: string;
                }) => {
                  const isScheduled = banner.startDate || banner.endDate;
                  const now = new Date();
                  const startDate = banner.startDate ? new Date(banner.startDate) : null;
                  const endDate = banner.endDate ? new Date(banner.endDate) : null;
                  const isExpired = endDate && endDate < now;
                  const isUpcoming = startDate && startDate > now;

                  return (
                    <div
                      key={banner._id}
                      className={`group relative overflow-hidden rounded-lg border ${
                        !banner.isActive || isExpired
                          ? "border-border opacity-60"
                          : "border-border"
                      }`}
                    >
                      {/* Image */}
                      <div className="relative aspect-[16/9] bg-muted">
                        {banner.image ? (
                          <Image
                            src={banner.image}
                            alt={banner.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                          {banner.link && (
                            <a
                              href={banner.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full bg-white p-2 text-foreground transition-colors hover:bg-muted"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Link
                            href={`/admin/banners/${banner._id}/edit`}
                            className="rounded-full bg-white p-2 text-foreground transition-colors hover:bg-muted"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <DeleteBannerButton
                            bannerId={banner._id}
                            bannerTitle={banner.title}
                          />
                        </div>

                        {/* Status Badges */}
                        <div className="absolute right-2 top-2 flex flex-col gap-1">
                          {!banner.isActive && (
                            <Badge variant="secondary" className="bg-destructive/90 text-white">
                              Inactive
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="secondary" className="bg-destructive/90 text-white">
                              Expired
                            </Badge>
                          )}
                          {isUpcoming && (
                            <Badge variant="secondary" className="bg-stb-warning/90 text-white">
                              Scheduled
                            </Badge>
                          )}
                        </div>

                        {/* Sort Order */}
                        <div className="absolute bottom-2 left-2">
                          <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                            Order: {banner.sortOrder}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h3 className="font-medium text-foreground line-clamp-1">
                          {banner.title}
                        </h3>
                        {banner.subtitle && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                            {banner.subtitle}
                          </p>
                        )}
                        {isScheduled && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {startDate && `From: ${startDate.toLocaleDateString("en-IN")}`}
                            {startDate && endDate && " - "}
                            {endDate && `Until: ${endDate.toLocaleDateString("en-IN")}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No {config.label.toLowerCase()} banners yet</p>
                <Link
                  href={`/admin/banners/new?position=${position}`}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Add your first {config.label.toLowerCase()} banner
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
