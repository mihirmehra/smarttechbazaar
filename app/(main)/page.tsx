import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroBanner from "@/components/sections/HeroBanner";
import TopCategories from "@/components/sections/TopCategories";
import ProductSection from "@/components/sections/ProductSection";
import BrandsSection from "@/components/sections/BrandsSection";
import AdBannerSlider from "@/components/sections/AdBannerSlider";
import BestSellersSection from "@/components/sections/BestSellersSection";
import MostPopularSection from "@/components/sections/MostPopularSection";
import HotBrandsSection from "@/components/sections/HotBrandsSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import JsonLd from "@/components/seo/JsonLd";
import { 
  generateOrganizationSchema, 
  generateWebSiteSchema, 
  generateLocalBusinessSchema 
} from "@/lib/schema";
import {
  getHomepageSections,
  getCategories,
  getBrands,
  getHeroSliderBanners,
  getAdBanners,
  getBestSellers,
  getMostPopular,
  getHotBrands,
} from "@/lib/data";

// Enable ISR with 60 second revalidation for fast loads with fresh data
export const revalidate = 60;

// Resolve a data fetch, falling back to an empty list if it fails.
// A transient MongoDB error must not abort the whole production build (or blank
// out the page) — the affected section simply renders empty and is refilled on
// the next revalidation.
async function safeList<T>(promise: Promise<T[]>, label: string): Promise<T[]> {
  // Keep an unavailable database from blocking the first paint indefinitely, but
  // stay comfortably above the cold-start cost of establishing the MongoDB
  // connection (handshakes to this cluster measured 1.7s-7.9s). A cap below that
  // blanked out sections even though the database was perfectly healthy.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Homepage data fetch timed out")),
        20000
      );
    });
    return await Promise.race([promise, timeout]);
  } catch (error) {
    console.error(`[v0] Homepage data fetch failed (${label}):`, error);
    return [];
  } finally {
    // Always cancel the timer. Leaving it pending kept a 20s timer alive for
    // every one of the parallel fetches below, which held the request open for
    // the full timeout even when all the queries had already resolved in
    // milliseconds (observed as a consistent "GET / 200 in ~20000ms").
    clearTimeout(timer);
  }
}

export default async function HomePage() {
  // Fetch all data in parallel using cached functions
  const [
    productSections,
    categories,
    brands,
    heroSliderBanners,
    adBanners,
    bestSellers,
    mostPopular,
    hotBrands,
  ] = await Promise.all([
    safeList(getHomepageSections(), "homepageSections"),
    safeList(getCategories(), "categories"),
    safeList(getBrands(), "brands"),
    safeList(getHeroSliderBanners(), "heroSliderBanners"),
    safeList(getAdBanners(), "adBanners"),
    safeList(getBestSellers(), "bestSellers"),
    safeList(getMostPopular(), "mostPopular"),
    safeList(getHotBrands(), "hotBrands"),
  ]);

  // Schema markup for homepage
  const schemas = [
    generateOrganizationSchema(),
    generateWebSiteSchema(),
    generateLocalBusinessSchema(),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Schema markup */}
        <JsonLd data={schemas} />

        {/* Hero Slider - 1500x450 banners */}
        <HeroBanner banners={heroSliderBanners.length > 0 ? heroSliderBanners : undefined} />

        {/* Features Strip */}
        <FeaturesSection />

        {/* Top Categories */}
        <TopCategories categories={categories} />

        {/* Best Sellers Section */}
        {bestSellers.length > 0 && (
          <BestSellersSection products={bestSellers} />
        )}

        {/* Dynamic Ad Banner Slider - 1500x300 banners from database */}
        {adBanners.length > 0 && (
          <AdBannerSlider banners={adBanners} />
        )}

        {/* First 2 Product Sections */}
        {productSections.slice(0, 2).map((section) => (
          <ProductSection key={section.slug} section={section} />
        ))}

        {/* Hot Brands Section */}
        {hotBrands.length > 0 && (
          <HotBrandsSection brands={hotBrands} />
        )}

        {/* Most Popular Section */}
        {mostPopular.length > 0 && (
          <MostPopularSection products={mostPopular} />
        )}

        {/* Secondary Ad Banners - 4 promotional banners */}
        <AdBannerSlider 
          banners={[
            {
              id: "laptop-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/laptop%20Banner.jpg-aZ74t8huDopt1RRCwikZSJznyGUZMl.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/laptop%20%20%20banner%20350x150_.jpg-QwzNwHKG7YQDTvQgMNUyfQLCw9HszO.jpeg",
              alt: "High-performance portability tailored for creators, students, and professionals on the move",
              href: "/category/laptops",
            },
            {
              id: "storage-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Storage%20%20Banner.jpg-Br2pDtXHqxUP0A7rMmWIwC6BKzMrRy.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/storage%20banner%20350x150_.jpg-MiKzFE7Di0afXQ8issISTZNHQzHSIn.jpeg",
              alt: "Secure your digital life with high-speed SSDs, massive hard drives, and reliable cloud-ready solutions",
              href: "/category/storage",
            },
            {
              id: "networking-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Networking%20Banner.jpg-8TJO7lyqPmcGBoBLNeboJBiU5xTj4p.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/networking%20%20%20banner%20350x150_.jpg-4tbfFBsFp1vevULnC5LZYs1nq9kc0T.jpeg",
              alt: "Blazing fast internet starts here - Stay connected, stay ahead",
              href: "/category/networking",
            },
            {
              id: "mobility-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Mobility%20Banner.jpg-fIVom9upVU5bdAYHsa9o5xGUeVS5U1.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mobility%20%20%20banner%20350x150_.jpg-iA1gann5XrBSjK81afumysLvLYvfKh.jpeg",
              alt: "Never run out of power - Smart, fast and portable charging solutions",
              href: "/category/mobility",
            },
            {
              id: "security-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Security%20Banner.jpg-placeholder.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/security%20%20banner%20350x150_.jpg-qZz8kztQHrIl0siABkWDjIOduswvgK.jpeg",
              alt: "Comprehensive protection for your data and hardware with advanced software and physical locks",
              href: "/category/security",
            },
          ]} 
        />

        {/* Remaining Product Sections */}
        {productSections.slice(2).map((section) => (
          <ProductSection key={section.slug} section={section} />
        ))}

        {/* Brands Carousel */}
        <BrandsSection brands={brands} />

        {/* Show message if no products */}
        {productSections.length === 0 && bestSellers.length === 0 && mostPopular.length === 0 && (
          <div className="mx-auto max-w-7xl px-4 py-20 text-center">
            <h2 className="heading-lg mb-4">No Products Available</h2>
            <p className="body-md text-muted-foreground">
              Products will appear here once they are added to the database.
              Configure homepage sections in the admin panel.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
