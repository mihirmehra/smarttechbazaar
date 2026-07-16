import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import {
  Truck,
  PackageCheck,
  Clock,
  MapPin,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Phone,
  Mail,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Shipping Information",
  description: "Free shipping across India. Same day delivery in Bangalore. Learn about our delivery zones, timelines, and shipping policies at Smart Tech Bazaar.",
  alternates: {
    canonical: getCanonicalUrl("/shipping"),
  },
  openGraph: {
    title: `Shipping Information | ${siteConfig.name}`,
    description: "Free shipping across India. Same day delivery in Bangalore.",
    url: getCanonicalUrl("/shipping"),
    type: "website",
  },
};

const shippingZones = [
  {
    zone: "Bangalore (Local)",
    time: "Same Day / Next Day",
    minOrder: "Free above ₹500",
    note: "Order before 12:00 PM for same-day delivery",
  },
  {
    zone: "Karnataka",
    time: "1 – 2 Business Days",
    minOrder: "Free above ₹2,000",
    note: "Delivered via registered courier partners",
  },
  {
    zone: "Metro Cities",
    time: "2 – 4 Business Days",
    minOrder: "Free above ₹3,000",
    note: "Delhi, Mumbai, Chennai, Hyderabad, Pune, Kolkata",
  },
  {
    zone: "Rest of India",
    time: "4 – 7 Business Days",
    minOrder: "Free above ₹5,000",
    note: "All PIN codes covered via our logistics network",
  },
];

const steps = [
  {
    step: "01",
    title: "Order Placed",
    description: "Your order is received and payment is verified. You will get an email confirmation immediately.",
  },
  {
    step: "02",
    title: "Processing & Packing",
    description: "Our warehouse team picks, quality-checks, and carefully packs your item within 24 hours.",
  },
  {
    step: "03",
    title: "Dispatched",
    description: "Your parcel is handed to our courier partner and a tracking link is sent to your email and phone.",
  },
  {
    step: "04",
    title: "Out for Delivery",
    description: "The courier agent will call before arrival. Ensure someone is available to receive the package.",
  },
  {
    step: "05",
    title: "Delivered",
    description: "Item delivered. Please inspect the package before signing. Report any damage within 24 hours.",
  },
];

const faqs = [
  {
    q: "Do you ship outside India?",
    a: "Currently we ship only within India. International shipping is not available at this time.",
  },
  {
    q: "What if my order is delayed?",
    a: "Delays can occur during public holidays or due to logistics issues. You can track your order or contact our support team for an update.",
  },
  {
    q: "Can I change my delivery address after placing an order?",
    a: "Address changes can be made within 2 hours of placing the order. After dispatch, changes are not possible.",
  },
  {
    q: "What happens if I am not available during delivery?",
    a: "The courier will attempt delivery twice. If unsuccessful, the parcel is held at the nearest hub for 5 days before being returned.",
  },
  {
    q: "Is my product insured during transit?",
    a: "Yes, all orders above ₹5,000 are automatically covered under transit insurance at no additional cost.",
  },
  {
    q: "Do you offer bulk/B2B shipping?",
    a: "Yes, we have dedicated logistics for bulk orders. Contact our sales team for a customised shipping quote.",
  },
];

export default function ShippingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <Header />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Hero */}
        <div className="bg-stb-dark text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
            <div className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Link href="/" className="hover:text-white/70">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white/70">Shipping Info</span>
            </div>
            <div className="mt-4 flex items-start gap-4 md:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold md:text-3xl">Shipping Information</h1>
                <p className="mt-1 text-sm text-white/60">
                  Everything you need to know about delivery, timelines, and logistics.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="border-b border-border bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border md:grid-cols-4">
            {[
              { icon: Truck, label: "Pan India Delivery", value: "28+ States" },
              { icon: Clock, label: "Same Day (Local)", value: "Bangalore" },
              { icon: IndianRupee, label: "Free Shipping", value: "Above ₹2,000" },
              { icon: PackageCheck, label: "Secure Packaging", value: "Guaranteed" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-4 py-5 text-center">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{value}</span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">

          {/* Shipping Zones Table */}
          <section className="mb-10">
            <h2 className="mb-1 text-base font-bold md:text-lg">Delivery Zones & Timelines</h2>
            <p className="mb-5 text-xs text-muted-foreground">Estimated delivery times are calculated from the date of dispatch, not the date of order placement.</p>
            <div className="overflow-hidden rounded-xl border border-border bg-white">
              {/* Table header */}
              <div className="hidden grid-cols-4 gap-4 border-b border-border bg-secondary/50 px-5 py-3 md:grid">
                {["Zone", "Delivery Time", "Free Shipping", "Note"].map((h) => (
                  <span key={h} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</span>
                ))}
              </div>
              {/* Rows */}
              {shippingZones.map((zone, i) => (
                <div
                  key={zone.zone}
                  className={`flex flex-col gap-2 px-4 py-4 md:grid md:grid-cols-4 md:items-center md:gap-4 md:px-5 ${
                    i < shippingZones.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{zone.zone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-5 md:pl-0">
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-foreground">{zone.time}</span>
                  </div>
                  <div className="pl-5 md:pl-0">
                    <span className="inline-block rounded-full bg-stb-red-light px-2.5 py-0.5 text-[11px] font-medium text-primary">
                      {zone.minOrder}
                    </span>
                  </div>
                  <p className="pl-5 text-[11px] text-muted-foreground md:pl-0">{zone.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Order Journey Steps */}
          <section className="mb-10">
            <h2 className="mb-1 text-base font-bold md:text-lg">How Your Order Travels</h2>
            <p className="mb-6 text-xs text-muted-foreground">From checkout to your doorstep — here is the journey.</p>
            <div className="relative">
              {/* Connector line desktop */}
              <div className="absolute left-6 top-6 hidden h-[calc(100%-48px)] w-px bg-border md:block" />
              <div className="flex flex-col gap-4">
                {steps.map((step) => (
                  <div key={step.step} className="flex gap-4 rounded-xl border border-border bg-white p-4 md:p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {step.step}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Policies Grid */}
          <section className="mb-10">
            <h2 className="mb-5 text-base font-bold md:text-lg">Shipping Policies</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  icon: ShieldCheck,
                  title: "Secure Packaging",
                  body: "All items are packed with bubble wrap, thermocol inserts, and sealed corrugated boxes. Fragile items get additional protection with void fill and foam corners.",
                },
                {
                  icon: RefreshCw,
                  title: "Return Shipments",
                  body: "For eligible returns, we arrange free reverse pickup from your doorstep. Once the item reaches our warehouse and passes QC, a refund or replacement is processed within 5–7 days.",
                },
                {
                  icon: AlertCircle,
                  title: "Damaged in Transit",
                  body: "If your order arrives damaged, do not accept it. Photograph the damaged packaging and report it to us within 24 hours. We will arrange an immediate replacement at no cost.",
                },
                {
                  icon: PackageCheck,
                  title: "Large / Bulky Items",
                  body: "Heavy items like UPS systems, large printers, and rack-mount equipment are shipped via heavy freight services. Delivery timelines may vary. Our team will coordinate delivery slots.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border border-border bg-white p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-stb-red-light">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="mb-5 text-base font-bold md:text-lg">Frequently Asked Questions</h2>
            <div className="flex flex-col gap-3">
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-xl border border-border bg-white p-4 md:p-5">
                  <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact CTA */}
          <section className="rounded-xl bg-stb-dark p-6 text-white md:p-8">
            <h2 className="text-base font-bold md:text-lg">Need Help with Your Shipment?</h2>
            <p className="mt-1.5 text-xs text-white/60">
              Our logistics team is available Monday to Saturday, 9 AM – 7 PM.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                href="tel:+916363677588"
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-stb-red-dark"
              >
                <Phone className="h-4 w-4" />
                Call Support
              </a>
              <a
                href="mailto:sales@smarttechbazaar.com"
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-medium text-white hover:bg-white/20"
              >
                <Mail className="h-4 w-4" />
                Email Us
              </a>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
