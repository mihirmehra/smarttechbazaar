"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logo: string;
  slug: string;
  productCount?: number;
}

interface HotBrandsSectionProps {
  brands: Brand[];
  title?: string;
}

const defaultHotBrands: Brand[] = [
  { id: "hp", name: "HP", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/120px-HP_logo_2012.svg.png", slug: "hp" },
  { id: "dell", name: "Dell", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Dell_Logo.svg/120px-Dell_Logo.svg.png", slug: "dell" },
  { id: "lenovo", name: "Lenovo", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Lenovo_logo_2015.svg/120px-Lenovo_logo_2015.svg.png", slug: "lenovo" },
  { id: "asus", name: "Asus", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/120px-ASUS_Logo.svg.png", slug: "asus" },
  { id: "acer", name: "Acer", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Acer_2011.svg/120px-Acer_2011.svg.png", slug: "acer" },
  { id: "samsung", name: "Samsung", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/120px-Samsung_Logo.svg.png", slug: "samsung" },
  { id: "logitech", name: "Logitech", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Logitech_logo_2015.svg/120px-Logitech_logo_2015.svg.png", slug: "logitech" },
  { id: "canon", name: "Canon", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Canon_wordmark.svg/120px-Canon_wordmark.svg.png", slug: "canon" },
];

export default function HotBrandsSection({ brands, title = "Hot Brands" }: HotBrandsSectionProps) {
  const displayBrands = brands && brands.length > 0 ? brands : defaultHotBrands;

  if (displayBrands.length === 0) return null;

  return (
    <section className="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-3 md:px-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 md:h-7 md:w-7">
              <Sparkles className="h-3 w-3 text-white md:h-3.5 md:w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-foreground md:text-base">{title}</h2>
          </div>
          <Link
            href="/brands"
            className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-primary hover:text-stb-red-dark md:text-xs"
          >
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/*
          Plain scrollable flex row — no Embla, no percentage basis math.
          Each card is a fixed 72 px wide on mobile / 96 px on md+.
          Fixed px widths are immune to any parent container constraint
          (app wrapper, WebView, Median shell) so images can never overflow.
          scrollbar-hide keeps it clean on all platforms.
        */}
        <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:-mx-4 md:gap-3 md:px-4">
          {displayBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="group flex w-[72px] shrink-0 flex-col items-center rounded-xl border border-border bg-white p-2 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 md:w-24 md:p-3"
            >
              {/* Fixed pixel dimensions — cannot overflow regardless of container */}
              <div className="relative h-9 w-full md:h-12">
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  fill
                  sizes="96px"
                  className="object-contain transition-transform group-hover:scale-105"
                  unoptimized
                />
              </div>
              <span className="mt-1.5 w-full truncate text-center text-[9px] font-semibold leading-tight text-foreground transition-colors group-hover:text-primary md:text-[11px]">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
