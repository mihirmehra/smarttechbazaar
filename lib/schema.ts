// JSON-LD Schema markup generators
import { siteConfig, getFullUrl } from "./site-config";

// Type definitions for schema items
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface ProductSchemaData {
  name: string;
  slug: string;
  description: string;
  images: string[];
  priceB2C: number;
  mrp: number;
  stock: number;
  sku: string;
  brand?: string;
  category?: {
    name: string;
    slug: string;
  };
  specifications?: Array<{ key: string; value: string }>;
}

interface CategorySchemaData {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
}

interface BrandSchemaData {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  productCount: number;
}

// Organization Schema (for the entire site)
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.business.name,
    legalName: siteConfig.business.legalName,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: getFullUrl("/logo.png"),
      width: "512",
      height: "512",
    },
    image: getFullUrl("/logo.png"),
    email: siteConfig.business.email,
    telephone: siteConfig.business.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.business.address.streetAddress,
      addressLocality: siteConfig.business.address.addressLocality,
      addressRegion: siteConfig.business.address.addressRegion,
      postalCode: siteConfig.business.address.postalCode,
      addressCountry: siteConfig.business.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteConfig.business.geo.latitude,
      longitude: siteConfig.business.geo.longitude,
    },
    sameAs: Object.values(siteConfig.business.socialLinks),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.business.phone,
      contactType: "customer service",
      availableLanguage: ["English", "Hindi"],
    },
  };
}

// WebSite Schema (for search functionality)
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: "en-IN",
  };
}

// LocalBusiness Schema
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${siteConfig.url}/#localbusiness`,
    name: siteConfig.business.name,
    image: getFullUrl("/logo.png"),
    url: siteConfig.url,
    telephone: siteConfig.business.phone,
    email: siteConfig.business.email,
    priceRange: siteConfig.business.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.business.address.streetAddress,
      addressLocality: siteConfig.business.address.addressLocality,
      addressRegion: siteConfig.business.address.addressRegion,
      postalCode: siteConfig.business.address.postalCode,
      addressCountry: siteConfig.business.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteConfig.business.geo.latitude,
      longitude: siteConfig.business.geo.longitude,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "21:00",
    },
    sameAs: Object.values(siteConfig.business.socialLinks),
  };
}

// Breadcrumb Schema
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Product Schema
export function generateProductSchema(product: ProductSchemaData) {
  const productUrl = getFullUrl(`/product/${product.slug}`);
  const imageUrl = product.images?.[0] 
    ? (product.images[0].startsWith("http") ? product.images[0] : getFullUrl(product.images[0]))
    : getFullUrl("/logo.png");
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description?.replace(/<[^>]*>/g, "").slice(0, 500) || "",
    image: product.images?.map(img => 
      img.startsWith("http") ? img : getFullUrl(img)
    ) || [getFullUrl("/logo.png")],
    url: productUrl,
    sku: product.sku,
    brand: product.brand ? {
      "@type": "Brand",
      name: product.brand,
    } : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: product.priceB2C,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: product.stock > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: siteConfig.business.name,
      },
    },
    ...(product.specifications && product.specifications.length > 0 && {
      additionalProperty: product.specifications.map(spec => ({
        "@type": "PropertyValue",
        name: spec.key,
        value: spec.value,
      })),
    }),
  };
}

// Collection/Category Page Schema
export function generateCollectionPageSchema(
  data: CategorySchemaData | BrandSchemaData,
  type: "category" | "brand",
  products: Array<{ name: string; slug: string; priceB2C: number; images: string[] }>
) {
  const pageUrl = getFullUrl(`/${type}/${data.slug}`);
  const imageUrl = ("image" in data && data.image) 
    ? (data.image.startsWith("http") ? data.image : getFullUrl(data.image))
    : ("logo" in data && data.logo)
    ? (data.logo.startsWith("http") ? data.logo : getFullUrl(data.logo))
    : getFullUrl("/logo.png");
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: data.name,
    description: data.description || `Browse ${data.name} products at ${siteConfig.name}`,
    image: imageUrl,
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
    about: {
      "@type": type === "category" ? "Thing" : "Brand",
      name: data.name,
    },
    numberOfItems: data.productCount,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 10).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getFullUrl(`/product/${product.slug}`),
        name: product.name,
      })),
    },
  };
}

// FAQ Page Schema (for About, Help pages)
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// WebPage Schema (for static pages)
export function generateWebPageSchema(
  title: string,
  description: string,
  path: string,
  type: "WebPage" | "AboutPage" | "ContactPage" | "FAQPage" = "WebPage"
) {
  const pageUrl = getFullUrl(path);
  
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: title,
    description: description,
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
    inLanguage: "en-IN",
  };
}

// Helper to combine multiple schemas
export function combineSchemas(...schemas: object[]) {
  return schemas.filter(Boolean);
}
