import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";
import { generateWebPageSchema, generateOrganizationSchema } from "@/lib/schema";
import {
  Shield,
  Users,
  Package,
  Headphones,
  Award,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  ArrowRight,
  Monitor,
  Wifi,
  Camera,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "15+", label: "Years in Business" },
  { value: "10,000+", label: "Products in Stock" },
  { value: "5,000+", label: "Happy Customers" },
  { value: "50+", label: "Brand Partners" },
];

const values = [
  {
    icon: Shield,
    title: "Trust & Integrity",
    description:
      "We operate with complete transparency. Every product is genuine, every price is fair, and every promise is kept.",
  },
  {
    icon: Package,
    title: "Quality Products",
    description:
      "We partner only with authorised distributors and top-tier brands to ensure every product meets the highest standards.",
  },
  {
    icon: Headphones,
    title: "After-Sales Support",
    description:
      "Our dedicated support team is always available to help with installation, warranty claims, and technical queries.",
  },
  {
    icon: Users,
    title: "Customer First",
    description:
      "From retail buyers to large businesses, every customer receives the same attentive, personalised service.",
  },
];

const categories = [
  {
    icon: Monitor,
    name: "Computers & Accessories",
    description: "Desktops, laptops, peripherals and components from leading brands.",
  },
  {
    icon: Camera,
    name: "CCTV & Security",
    description: "IP cameras, DVRs, NVRs, and complete surveillance solutions.",
  },
  {
    icon: Wifi,
    name: "Networking",
    description: "Routers, switches, access points, and structured cabling.",
  },
  {
    icon: Printer,
    name: "Printers & Scanners",
    description: "Inkjet, laser, and multifunction printers for every workload.",
  },
];

const milestones = [
  { year: "2010", event: "Smart Tech Bazaar founded in Bangalore with a vision to make quality IT products accessible." },
  { year: "2013", event: "Expanded product catalogue to include CCTV and security equipment." },
  { year: "2016", event: "Launched B2B dealer programme, partnering with 200+ resellers across Rajasthan." },
  { year: "2019", event: "Crossed 1,000 active business accounts; opened second warehouse facility." },
  { year: "2022", event: "Launched online platform enabling dealers and customers to order 24/7." },
  { year: "2025", event: "Serving 5,000+ customers with 10,000+ SKUs and same-day dispatch." },
];

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${siteConfig.name} - your trusted IT solutions partner since 2010. Over 15 years of experience providing quality computer accessories, CCTV, networking equipment, and IT solutions.`,
  alternates: {
    canonical: getCanonicalUrl("/about"),
  },
  openGraph: {
    title: `About Us | ${siteConfig.name}`,
    description: `Learn about ${siteConfig.name} - your trusted IT solutions partner since 2010.`,
    url: getCanonicalUrl("/about"),
  },
};

export default function AboutPage() {
  // Schema markup
  const schemas = [
    generateOrganizationSchema(),
    generateWebPageSchema(
      "About Us",
      `Learn about ${siteConfig.name} - your trusted IT solutions partner since 2010.`,
      "/about",
      "AboutPage"
    ),
  ];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* Schema markup */}
      <JsonLd data={schemas} />

      {/* Breadcrumb */}
      <Breadcrumbs items={[{ label: "About Us" }]} />

      {/* Hero */}
      <section className="relative h-[480px] overflow-hidden bg-stb-dark">
        <Image
          src="/images/about-hero.jpg"
          alt="STB Technologies team"
          fill
          className="object-cover opacity-30"
          priority
        />
        {/* Red accent stripe */}
        <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 md:px-8">
          <p className="label-uppercase mb-3 text-primary">About Smart Tech Bazaar</p>
          <h1 className="heading-xl max-w-2xl text-white">
            Powering India&apos;s Businesses with the Right Technology
          </h1>
          <p className="body-lg mt-5 max-w-xl text-white/70">
            Since 2010, we have been Bangalore&apos;s trusted IT solutions partner — supplying
            genuine products, competitive prices, and dependable support to businesses
            and individuals across India.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary hover:bg-stb-red-dark">
              <Link href="/products">Browse Products</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Link href="/dashboard/support/new">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-8 text-center">
                <span className="font-heading text-4xl font-bold text-primary">{stat.value}</span>
                <span className="body-sm mt-1 text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="label-uppercase mb-2 text-primary">Our Story</p>
              <h2 className="heading-lg mb-5">
                Built on a Decade and a Half of Trust
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="body-md">
                  Smart Tech Bazaar started in 2010 as a small computer accessories shop in
                  Bangalore with one simple goal: give businesses access to quality IT products
                  without having to compromise on price or authenticity.
                </p>
                <p className="body-md">
                  Over the years we have grown into one of Karnataka&apos;s leading IT distributors,
                  stocking over 10,000 SKUs across computers, CCTV, networking, printers, and
                  software — all sourced directly from authorised channels.
                </p>
                <p className="body-md">
                  Today our dealer network spans hundreds of resellers, and our online
                  platform lets customers order 24/7 with same-day dispatch from our
                  Jaipur warehouse.
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  "Authorised distributor for 50+ brands",
                  "Genuine products with manufacturer warranty",
                  "Dedicated B2B pricing for registered dealers",
                  "Same-day dispatch from Jaipur warehouse",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="body-md">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-4 top-0 h-full w-px bg-border" />
              <div className="space-y-8 pl-10">
                {milestones.map((m) => (
                  <div key={m.year} className="relative">
                    <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                    <span className="label-uppercase text-primary">{m.year}</span>
                    <p className="body-sm mt-1 text-muted-foreground">{m.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="bg-stb-light py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <p className="label-uppercase mb-2 text-primary">What We Offer</p>
            <h2 className="heading-lg">End-to-End IT Solutions</h2>
            <p className="body-md mx-auto mt-3 max-w-xl text-muted-foreground">
              One partner for all your technology needs — from a single keyboard to a
              complete office network deployment.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="group flex flex-col gap-4 rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <cat.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="heading-sm mb-1.5">{cat.name}</h3>
                  <p className="body-sm text-muted-foreground">{cat.description}</p>
                </div>
                <Link
                  href="/products"
                  className="mt-auto flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Shop now <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <p className="label-uppercase mb-2 text-primary">Why Choose Us</p>
            <h2 className="heading-lg">Our Core Values</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-border p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="heading-sm mb-2">{v.title}</h3>
                <p className="body-sm text-muted-foreground">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards / Recognitions bar */}
      <section className="border-y border-border bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-primary" />
              <div>
                <p className="heading-sm">Authorised Distributor</p>
                <p className="body-sm text-muted-foreground">50+ recognised brands</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="heading-sm">100% Genuine Products</p>
                <p className="body-sm text-muted-foreground">Manufacturer warranty on all items</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="heading-sm">Same-Day Dispatch</p>
                <p className="body-sm text-muted-foreground">Orders before 3 PM shipped same day</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Headphones className="h-8 w-8 text-primary" />
              <div>
                <p className="heading-sm">Dedicated Support</p>
                <p className="body-sm text-muted-foreground">Mon–Sat, 9 AM – 7 PM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — Contact / Location */}
      <section className="bg-stb-dark py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="label-uppercase mb-2 text-primary">Get in Touch</p>
              <h2 className="heading-lg text-white mb-5">
                Ready to Upgrade Your Business Technology?
              </h2>
              <p className="body-md text-white/70 mb-8">
                Whether you are a first-time buyer or an established dealer, our team
                is here to help you find the right products at the right price.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="body-md text-white/80">
                    2nd Floor, Industrial Area, Jaipur – 302006, Rajasthan
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <a
                    href="mailto:sales@smarttechbazaar.com"
                    className="body-md text-white/80 hover:text-primary"
                  >
                    sales@smarttechbazaar.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <a
                    href="tel:9876543210"
                    className="body-md text-white/80 hover:text-primary"
                  >
                    +91 98765 43210 (Sales)
                  </a>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="bg-primary hover:bg-stb-red-dark">
                  <Link href="/dashboard/support/new">Send a Message</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Link href="/auth/register?type=dealer">Become a Dealer</Link>
                </Button>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="overflow-hidden rounded-xl border border-white/10">
              <iframe
                title="STB Technologies Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3558.5!2d75.7873!3d26.9124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sJaipur%2C+Rajasthan!5e0!3m2!1sen!2sin!4v1"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
