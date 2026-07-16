import { Metadata } from "next";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "All Products",
  description: `Browse our complete collection of IT products at ${siteConfig.name}. Find computer accessories, CCTV cameras, networking equipment, printers, and more at competitive prices.`,
  alternates: {
    canonical: getCanonicalUrl("/products"),
  },
  openGraph: {
    title: `All Products | ${siteConfig.name}`,
    description: `Browse our complete collection of IT products at ${siteConfig.name}.`,
    url: getCanonicalUrl("/products"),
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
