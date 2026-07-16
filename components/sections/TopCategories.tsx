"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  image: string;
  slug: string;
  productCount: number;
}

interface TopCategoriesProps {
  categories: Category[];
}

const defaultCategories: Category[] = [
  { id: "desktop",              name: "Desktop",               image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=200&h=200&fit=crop",    slug: "desktop",              productCount: 0 },
  { id: "laptops",              name: "Laptops",               image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop",    slug: "laptops",              productCount: 0 },
  { id: "storage",              name: "Storage",               image: "https://images.unsplash.com/photo-1653179767378-98bb414f9bfd?w=200&h=200&fit=crop",    slug: "storage",              productCount: 0 },
  { id: "display",              name: "Display",               image: "https://images.unsplash.com/photo-1572476359541-2a41ec8405e5?w=200&h=200&fit=crop",    slug: "display",              productCount: 0 },
  { id: "peripherals",          name: "Peripherals",           image: "https://images.unsplash.com/photo-1662758392656-0e5d4b0f53fb?w=200&h=200&fit=crop",    slug: "peripherals",          productCount: 0 },
  { id: "printers-scanners",    name: "Printers & Scanners",   image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=200&h=200&fit=crop",    slug: "printers-scanners",    productCount: 0 },
  { id: "security",             name: "Security",              image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop",       slug: "security",             productCount: 0 },
  { id: "networking",           name: "Networking",            image: "https://images.unsplash.com/photo-1544985562-128e7b377a21?w=200&h=200&fit=crop",       slug: "networking",           productCount: 0 },
  { id: "software",             name: "Software",              image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop",    slug: "software",             productCount: 0 },
  { id: "mobility",             name: "Mobility",              image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop",    slug: "mobility",             productCount: 0 },
  { id: "cables",               name: "Cables",                image: "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=200&h=200&fit=crop",    slug: "cables",               productCount: 0 },
  { id: "connectors-converters",name: "Connectors & Converters",image: "https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=200&h=200&fit=crop",  slug: "connectors-converters",productCount: 0 },
  { id: "accessories",          name: "Accessories",           image: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=200&h=200&fit=crop",    slug: "accessories",          productCount: 0 },
  { id: "refurbished-laptops",  name: "Refurbished Laptops",   image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=200&h=200&fit=crop",      slug: "refurbished-laptops",  productCount: 0 },
];

export default function TopCategories({ categories }: TopCategoriesProps) {
  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="bg-white py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-3 md:px-4">
        {/* Section header */}
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div className="flex items-center gap-2">
            <span className="block h-4 w-[3px] rounded-full bg-primary md:h-5" />
            <h2 className="text-sm font-bold text-foreground md:text-base">Shop by Category</h2>
          </div>
          <Link
            href="/categories"
            className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:text-stb-red-dark md:text-xs"
          >
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* ── Mobile: horizontal pill-scroll ─────────────────────────────── */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:hidden">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex shrink-0 flex-col items-center gap-2 press-active"
            >
              {/* Circle image */}
              <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full border-2 border-border bg-muted shadow-sm transition-all group-active:border-primary group-active:shadow-md">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="72px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  unoptimized
                />
              </div>
              <span className="w-[72px] truncate text-center text-[11px] font-semibold text-foreground">
                {cat.name}
              </span>
            </Link>
          ))}
          {/* "More" pill */}
          <Link
            href="/categories"
            className="group flex shrink-0 flex-col items-center gap-2 press-active"
          >
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-dashed border-border bg-muted shadow-sm transition-all group-hover:border-primary">
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="w-[72px] text-center text-[11px] font-semibold text-muted-foreground">More</span>
          </Link>
        </div>

        {/* ── Desktop: 8-column card grid ─────────────────────────────────── */}
        <div className="hidden grid-cols-4 gap-3 md:grid lg:grid-cols-7">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-white p-4 transition-all hover:border-primary/40 hover:shadow-md"
            >
              {/* Square image with rounded corners */}
              <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted transition-transform duration-300 group-hover:scale-105">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span className="text-center text-[11px] font-semibold text-foreground transition-colors group-hover:text-primary">
                {cat.name}
              </span>
              {cat.productCount > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {cat.productCount}+ items
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
