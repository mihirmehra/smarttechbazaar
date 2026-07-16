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
    getHomepageSections(),
    getCategories(),
    getBrands(),
    getHeroSliderBanners(),
    getAdBanners(),
    getBestSellers(),
    getMostPopular(),
    getHotBrands(),
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

        {/* Static Ad Banners Grid - 3 promotional banners */}
        <AdBannerSlider 
          banners={[
            {
              id: "cables-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Cables%20Banner%20%281%29.jpg-3QEaRBpxlFsQB5qXtVdQ7IvUlIX8YJ.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/cable%20%20banner%20350x150_.jpg-iOIFSa6BhKJCLhyvZjP1b09gpv9NIq.jpeg",
              alt: "High-quality data and power cables engineered for durability and lightning-fast transmission",
              href: "/category/cables",
            },
            {
              id: "desktop-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Desktop%20Banners.jpg-NxXCuf56a4qUEYkHIIWBsFRhr6iXXh.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/desktop%20banner%20350x150_.jpg-0qYnJo29CBIxL3DVP7Gebud7t82m01.jpeg",
              alt: "Powerful Workstations and sleek all-in-ones designed to anchor your home or office productivity",
              href: "/category/desktop",
            },
            {
              id: "display-banner",
              image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Display%20Banner%20%281%29.jpg-gu1oIcOl6i73BkGckGoNbiuO40Ppe2.jpeg",
              imageMobile: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/display%20%20banner%20350x150_.jpg-wcYFeg5A0mH7uTmDHFP7LVulsMLZd1.jpeg",
              alt: "Crystal-clear monitors and immersive screens that bring every pixel to life with stunning detail",
              href: "/category/display",
            },
          ]} 
          showAsGrid={true}
        />

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
