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

/* Tint + ribbon pairs cycled across the tiles. Each entry keeps the ribbon
   colour readable against its own tint, and the sequence is long enough that
   neighbouring tiles never repeat. */
const TILE_THEMES = [
  { tint: "bg-stb-tint-red", ribbon: "bg-primary" },
  { tint: "bg-stb-tint-blue", ribbon: "bg-stb-info" },
  { tint: "bg-stb-tint-teal", ribbon: "bg-stb-deal" },
  { tint: "bg-stb-tint-amber", ribbon: "bg-stb-warning" },
  { tint: "bg-stb-tint-violet", ribbon: "bg-chart-4" },
] as const;

export default function TopCategories({ categories }: TopCategoriesProps) {
  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="bg-card py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-3 md:px-4">
        {/* Section header */}
        <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="block h-5 w-1 shrink-0 rounded-full bg-primary" />
            <h2 className="stb-rail-title truncate">Shop by Category</h2>
          </div>
          <Link href="/categories" aria-label="View all categories" className="stb-rail-arrow">
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>

        {/*
          One responsive layout for every breakpoint: a horizontal snap-scroll
          rail on mobile that becomes a wrapping grid at md+. This replaces the
          previous duplicated mobile/desktop markup, so a category can no longer
          render differently (or get dropped) on one of the two.
        */}
        <ul className="flex snap-x gap-2.5 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-4 md:gap-3 md:overflow-visible lg:grid-cols-7">
          {displayCategories.map((cat, i) => {
            const theme = TILE_THEMES[i % TILE_THEMES.length];
            return (
              <li
                key={cat.id}
                className="w-[104px] shrink-0 snap-start md:w-auto md:shrink"
              >
                <Link
                  href={`/category/${cat.slug}`}
                  className="group flex flex-col gap-1.5 press-active"
                >
                  {/* Image tile with a colour ribbon pinned to the bottom */}
                  <div
                    className={`relative overflow-hidden rounded-xl ${theme.tint} transition-shadow group-hover:shadow-md`}
                  >
                    <div className="relative aspect-square w-full">
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 768px) 104px, 160px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    </div>
                    {/* Ribbon — shows the live item count, or "Shop now" when the
                        count is unavailable so the tile never looks unfinished. */}
                    <span
                      className={`absolute inset-x-0 bottom-0 ${theme.ribbon} px-2 py-1 text-center text-[10px] font-bold text-white`}
                    >
                      {cat.productCount > 0 ? `${cat.productCount}+ items` : "Shop now"}
                    </span>
                  </div>
                  {/* Label sits below the tile, as in the reference */}
                  <span className="line-clamp-2 px-0.5 text-center text-[11px] font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                    {cat.name}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* "All" tile closes out the rail */}
          <li className="w-[104px] shrink-0 snap-start md:w-auto md:shrink">
            <Link href="/categories" className="group flex flex-col gap-1.5 press-active">
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted transition-colors group-hover:border-primary">
                <ChevronRight className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <span className="px-0.5 text-center text-[11px] font-semibold leading-tight text-muted-foreground transition-colors group-hover:text-primary">
                View All
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
