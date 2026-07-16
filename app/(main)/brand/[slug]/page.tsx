import { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import CategoryPageClient from "@/components/products/CategoryPageClient";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";
import { 
  generateCollectionPageSchema, 
  generateBreadcrumbSchema,
  generateOrganizationSchema 
} from "@/lib/schema";
import { ExternalLink } from "lucide-react";

// Use dynamic rendering to avoid caching 404 responses
export const dynamic = "force-dynamic";

// Allow dynamic paths that weren't generated at build time
export const dynamicParams = true;

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

interface BrandData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  productCount: number;
}

interface ProductData {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  stock: number;
  brand?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  category?: {
    _id: string;
    name: string;
    slug: string;
  };
}

// Default brand data for fallback
const defaultBrands: Record<string, BrandData> = {
  hp: { _id: "hp", name: "HP", slug: "hp", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/120px-HP_logo_2012.svg.png", description: "Hewlett-Packard - Computing and printing solutions for businesses and consumers", website: "https://www.hp.com", productCount: 45 },
  dell: { _id: "dell", name: "Dell", slug: "dell", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Dell_Logo.svg/120px-Dell_Logo.svg.png", description: "Dell Technologies - Enterprise and consumer technology solutions", website: "https://www.dell.com", productCount: 38 },
  lenovo: { _id: "lenovo", name: "Lenovo", slug: "lenovo", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Lenovo_logo_2015.svg/120px-Lenovo_logo_2015.svg.png", description: "Lenovo - Smart devices and infrastructure for the digital age", website: "https://www.lenovo.com", productCount: 52 },
  asus: { _id: "asus", name: "ASUS", slug: "asus", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ASUS_Logo.svg/120px-ASUS_Logo.svg.png", description: "ASUS - In search of incredible technology products", website: "https://www.asus.com", productCount: 41 },
  acer: { _id: "acer", name: "Acer", slug: "acer", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Acer_2011.svg/120px-Acer_2011.svg.png", description: "Acer - Breaking barriers between people and technology", website: "https://www.acer.com", productCount: 33 },
  samsung: { _id: "samsung", name: "Samsung", slug: "samsung", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/120px-Samsung_Logo.svg.png", description: "Samsung Electronics - Innovation for a better world", website: "https://www.samsung.com", productCount: 67 },
  "tp-link": { _id: "tplink", name: "TP-Link", slug: "tp-link", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/TP-Link_logo.svg/120px-TP-Link_logo.svg.png", description: "TP-Link - Reliably smart networking solutions", website: "https://www.tp-link.com", productCount: 28 },
  tplink: { _id: "tplink", name: "TP-Link", slug: "tplink", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/TP-Link_logo.svg/120px-TP-Link_logo.svg.png", description: "TP-Link - Reliably smart networking solutions", website: "https://www.tp-link.com", productCount: 28 },
  logitech: { _id: "logitech", name: "Logitech", slug: "logitech", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Logitech_logo_2015.svg/120px-Logitech_logo_2015.svg.png", description: "Logitech - Design to move you", website: "https://www.logitech.com", productCount: 35 },
  hikvision: { _id: "hikvision", name: "Hikvision", slug: "hikvision", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Hikvision_logo.svg/120px-Hikvision_logo.svg.png", description: "Hikvision - World-leading video surveillance products", website: "https://www.hikvision.com", productCount: 54 },
  dahua: { _id: "dahua", name: "Dahua", slug: "dahua", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/1f/Dahua_Technology_logo.svg/120px-Dahua_Technology_logo.svg.png", description: "Dahua Technology - Video-centric smart IoT solutions", website: "https://www.dahuasecurity.com", productCount: 42 },
  cisco: { _id: "cisco", name: "Cisco", slug: "cisco", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cisco_logo_blue_2016.svg/120px-Cisco_logo_blue_2016.svg.png", description: "Cisco - The bridge to possible", website: "https://www.cisco.com", productCount: 31 },
  "d-link": { _id: "dlink", name: "D-Link", slug: "d-link", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/D-Link_logo.svg/120px-D-Link_logo.svg.png", description: "D-Link - Building networks for people", website: "https://www.dlink.com", productCount: 24 },
};

// Sample products for fallback
const sampleProducts: ProductData[] = [
  { _id: "s1", name: "Wireless Router AC1200", slug: "wireless-router-ac1200", priceB2C: 2499, priceB2B: 2199, mrp: 2999, stock: 15, images: ["https://images.unsplash.com/photo-1544985562-128e7b377a21?w=300&h=300&fit=crop"], isFeatured: true, isNewArrival: false },
  { _id: "s2", name: "8-Port Gigabit Switch", slug: "8port-gigabit-switch", priceB2C: 1899, priceB2B: 1699, mrp: 2199, stock: 25, images: ["https://images.unsplash.com/photo-1544985562-128e7b377a21?w=300&h=300&fit=crop"], isFeatured: false, isNewArrival: true },
  { _id: "s3", name: "Mesh WiFi System", slug: "mesh-wifi-system", priceB2C: 8999, priceB2B: 8499, mrp: 10999, stock: 8, images: ["https://images.unsplash.com/photo-1544985562-128e7b377a21?w=300&h=300&fit=crop"], isFeatured: true, isNewArrival: false },
  { _id: "s4", name: "Enterprise Access Point", slug: "enterprise-access-point", priceB2C: 12499, priceB2B: 11999, mrp: 14999, stock: 0, images: ["https://images.unsplash.com/photo-1544985562-128e7b377a21?w=300&h=300&fit=crop"], isFeatured: false, isNewArrival: false },
  { _id: "s5", name: "Ceiling Mount AP", slug: "ceiling-mount-ap", priceB2C: 9999, priceB2B: 9499, mrp: 11999, stock: 12, images: ["https://images.unsplash.com/photo-1544985562-128e7b377a21?w=300&h=300&fit=crop"], isFeatured: true, isNewArrival: true },
  { _id: "s6", name: "RouterBoard Advanced", slug: "routerboard-advanced", priceB2C: 4599, priceB2B: 4199, mrp: 5299, stock: 20, images: ["https://images.unsplash.com/photo-1544985562-128e7b377a21?w=300&h=300&fit=crop"], isFeatured: false, isNewArrival: false },
];

async function getBrandData(slug: string) {
  try {
    await dbConnect();
    
    // Try to find brand in database
    const brand = await Brand.findOne({ slug, isActive: true }).lean();
    
    let brandData: BrandData;
    
    if (brand) {
      brandData = {
        _id: brand._id.toString(),
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logo: brand.logo,
        website: brand.website,
        productCount: brand.productCount || 0,
      };
    } else if (defaultBrands[slug]) {
      brandData = defaultBrands[slug];
    } else {
      return null;
    }

    // Get products for this brand
    const products = await Product.find({ 
      brand: { $regex: new RegExp(`^${brandData.name}$`, 'i') },
      isActive: true 
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    // Get unique categories from products
    const categoryIds = [...new Set(products.map((p: { category?: { _id: unknown } }) => p.category?._id?.toString()).filter(Boolean))];
    const categories = await Category.find({ _id: { $in: categoryIds }, isActive: true })
      .select("_id name slug")
      .lean();

    const parsedProducts = products.length > 0 
      ? JSON.parse(JSON.stringify(products))
      : sampleProducts.map(p => ({ ...p, brand: brandData.name }));

    return {
      brand: {
        ...brandData,
        productCount: parsedProducts.length || brandData.productCount,
      },
      products: parsedProducts,
      categories: JSON.parse(JSON.stringify(categories)),
    };
  } catch (error) {
    console.error("Error fetching brand data:", error);
    
    // Return fallback data if available
    if (defaultBrands[slug]) {
      return {
        brand: defaultBrands[slug],
        products: sampleProducts.map(p => ({ ...p, brand: defaultBrands[slug].name })),
        categories: [],
      };
    }
    return null;
  }
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBrandData(slug);
  
  if (!data) {
    return { title: "Brand Not Found" };
  }
  
  const { brand } = data;
  const title = `${brand.name} Products`;
  const description = brand.description || `Browse all ${brand.name} products at ${siteConfig.name}. Find the best deals on ${brand.name} technology products.`;
  
  return {
    title,
    description,
    alternates: {
      canonical: getCanonicalUrl(`/brand/${slug}`),
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: getCanonicalUrl(`/brand/${slug}`),
      images: brand.logo ? [brand.logo] : undefined,
    },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const data = await getBrandData(slug);

  if (!data) {
    notFound();
  }

  const { brand, products, categories } = data;
  
  // Get unique subcategories from products
  const subcategories = categories.map((cat: { _id: string; name: string; slug: string }) => ({
    _id: cat._id,
    name: cat.name,
    slug: cat.slug,
  }));

  // Schema markup
  const schemas = [
    generateOrganizationSchema(),
    generateCollectionPageSchema(
      {
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logo: brand.logo,
        productCount: products.length,
      },
      "brand",
      products.slice(0, 10)
    ),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <Header />
      <main className="flex-1">
        {/* Schema */}
        <JsonLd data={schemas} />

        {/* Breadcrumb */}
        <Breadcrumbs 
          items={[
            { label: "Brands", href: "/brands" },
            { label: brand.name }
          ]} 
        />

        {/* Brand Header */}
        <div className="border-b border-border bg-white px-3 py-4 md:px-4 md:py-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-start gap-4">
              {/* Brand Logo */}
              {brand.logo && (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-white p-2 md:h-20 md:w-32">
                  <Image
                    src={brand.logo}
                    alt={`${brand.name} logo`}
                    width={100}
                    height={60}
                    className="h-auto max-h-12 w-auto max-w-[80px] object-contain md:max-h-14 md:max-w-[100px]"
                    unoptimized
                  />
                </div>
              )}
              
              {/* Brand Info */}
              <div className="flex-1">
                <h1 className="text-lg font-extrabold text-foreground md:text-2xl">
                  {brand.name}
                </h1>
                {brand.description && (
                  <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                    {brand.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-medium text-muted-foreground md:text-xs">
                    {products.length} products found
                  </span>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline md:text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Official Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <CategoryPageClient
          products={products}
          subcategories={subcategories}
          brands={[]}
        />
      </main>
      <Footer />
    </div>
  );
}
