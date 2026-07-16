import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";
import { generateWebPageSchema, generateOrganizationSchema } from "@/lib/schema";


// Enable ISR with 5 minute revalidation (brands don't change often)
export const revalidate = 300;

export const metadata: Metadata = {
  title: "All Brands",
  description: `Browse all brands available at ${siteConfig.name}. Find products from top technology brands including HP, Dell, Lenovo, Asus, and more.`,
  alternates: {
    canonical: getCanonicalUrl("/brands"),
  },
  openGraph: {
    title: `All Brands | ${siteConfig.name}`,
    description: `Browse all brands available at ${siteConfig.name}. Find products from top technology brands.`,
    url: getCanonicalUrl("/brands"),
  },
};

interface BrandWithCount {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  productCount: number;
}

// Default brands for fallback
const defaultBrands: BrandWithCount[] = [
  { _id: "hp", name: "HP", slug: "hp", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/120px-HP_logo_2012.svg.png", productCount: 45, description: "Hewlett-Packard - Computing and printing solutions" },
  { _id: "dell", name: "Dell", slug: "dell", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Dell_Logo.svg/120px-Dell_Logo.svg.png", productCount: 38, description: "Dell Technologies - Enterprise and consumer technology" },
  { _id: "lenovo", name: "Lenovo", slug: "lenovo", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Lenovo_logo_2015.svg/120px-Lenovo_logo_2015.svg.png", productCount: 52, description: "Lenovo - Smart devices and infrastructure" },
  { _id: "asus", name: "Asus", slug: "asus", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/120px-ASUS_Logo.svg.png", productCount: 41, description: "ASUS - In search of incredible" },
  { _id: "acer", name: "Acer", slug: "acer", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Acer_2011.svg/120px-Acer_2011.svg.png", productCount: 33, description: "Acer - Breaking barriers between people and technology" },
  { _id: "samsung", name: "Samsung", slug: "samsung", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/120px-Samsung_Logo.svg.png", productCount: 67, description: "Samsung Electronics - Innovation for a better world" },
  { _id: "tplink", name: "TP-Link", slug: "tp-link", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/TP-Link_logo.svg/120px-TP-Link_logo.svg.png", productCount: 28, description: "TP-Link - Reliably smart networking" },
  { _id: "logitech", name: "Logitech", slug: "logitech", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Logitech_logo_2015.svg/120px-Logitech_logo_2015.svg.png", productCount: 35, description: "Logitech - Design to move you" },
  { _id: "hikvision", name: "Hikvision", slug: "hikvision", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Hikvision_logo.svg/120px-Hikvision_logo.svg.png", productCount: 54, description: "Hikvision - World-leading video surveillance products" },
  { _id: "dahua", name: "Dahua", slug: "dahua", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/Dahua_Technology_logo.svg/120px-Dahua_Technology_logo.svg.png", productCount: 42, description: "Dahua Technology - Video-centric smart IoT solutions" },
  { _id: "cisco", name: "Cisco", slug: "cisco", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cisco_logo_blue_2016.svg/120px-Cisco_logo_blue_2016.svg.png", productCount: 31, description: "Cisco - The bridge to possible" },
  { _id: "dlink", name: "D-Link", slug: "d-link", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/D-Link_logo.svg/120px-D-Link_logo.svg.png", productCount: 24, description: "D-Link - Building networks for people" },
];

async function getBrands(): Promise<BrandWithCount[]> {
  try {
    await dbConnect();
    
    // Use aggregation to get brand product counts in a single query (no N+1)
    const [brands, productCounts] = await Promise.all([
      Brand.find({ isActive: true })
        .select("_id name slug description logo productCount")
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Product.aggregate([
        { $match: { isActive: true, brand: { $exists: true, $ne: null } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
      ]),
    ]);

    if (!brands || brands.length === 0) {
      return defaultBrands;
    }

    // Create a map for quick lookup
    const countMap = new Map(productCounts.map((p) => [p._id, p.count]));

    const brandsWithCounts = brands.map((brand) => ({
      _id: brand._id.toString(),
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logo: brand.logo,
      productCount: countMap.get(brand.name) || brand.productCount || 0,
    }));

    return brandsWithCounts.length > 0 ? brandsWithCounts : defaultBrands;
  } catch {
    return defaultBrands;
  }
}

export default async function BrandsPage() {
  const brands = await getBrands();

  // Schema markup
  const schemas = [
    generateOrganizationSchema(),
    generateWebPageSchema(
      "All Brands",
      `Browse all brands available at ${siteConfig.name}`,
      "/brands"
    ),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <Header />
      <main className="flex-1">
        {/* Schema */}
        <JsonLd data={schemas} />

        {/* Breadcrumb */}
        <Breadcrumbs items={[{ label: "Brands" }]} />

        {/* Page Header */}
        <div className="border-b border-border bg-white px-3 py-4 md:px-4 md:py-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-lg font-extrabold text-foreground md:text-2xl">
              Shop by Brand
            </h1>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              Browse products from top technology brands
            </p>
            <p className="mt-1.5 text-[10px] font-medium text-muted-foreground md:text-xs">
              {brands.length} brands available
            </p>
          </div>
        </div>

        {/* Brands Grid */}
        <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={brand._id}
                href={`/brand/${brand.slug}`}
                className="group flex flex-col items-center rounded-xl border border-border bg-white p-4 transition-all hover:border-primary hover:shadow-md"
              >
                {/* Logo */}
                <div className="flex h-16 w-full items-center justify-center md:h-20">
                  {brand.logo ? (
                    <Image
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      width={80}
                      height={48}
                      className="h-auto max-h-12 w-auto max-w-[72px] object-contain transition-transform group-hover:scale-110 md:max-h-14 md:max-w-[80px]"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                      <span className="text-lg font-bold text-primary">
                        {brand.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Brand Info */}
                <div className="mt-3 text-center">
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-primary md:text-base">
                    {brand.name}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
