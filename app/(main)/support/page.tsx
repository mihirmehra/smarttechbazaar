import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";
import {
  LifeBuoy,
  ChevronRight,
  Mail,
  Phone,
  MessageSquare,
  Package,
  CreditCard,
  Truck,
  RefreshCcw,
  ShieldCheck,
  Clock,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with your Smart Tech Bazaar orders, products, payments, and account. Browse FAQs or raise a support ticket.",
  alternates: {
    canonical: getCanonicalUrl("/support"),
  },
  openGraph: {
    title: `Support | ${siteConfig.name}`,
    description:
      "Get help with your Smart Tech Bazaar orders, products, payments, and account.",
    url: getCanonicalUrl("/support"),
    type: "website",
  },
};

const contactMethods = [
  {
    icon: MessageSquare,
    title: "Raise a Ticket",
    description: "Submit a support request and track its progress from your dashboard.",
    action: "Open a Ticket",
    href: "/dashboard/support/new",
    primary: true,
  },
  {
    icon: Mail,
    title: "Email Us",
    description: "Send us a detailed message and we will reply within one business day.",
    action: "sales@smarttechbazaar.com",
    href: "mailto:sales@smarttechbazaar.com",
    primary: false,
  },
  {
    icon: Phone,
    title: "Call Us",
    description: "Speak directly with our support team, Monday to Saturday, 9 AM – 7 PM.",
    action: "+91 63636 77588",
    href: "tel:+916363677588",
    primary: false,
  },
];

const categories = [
  {
    icon: Package,
    title: "Orders",
    description: "Track orders, request cancellations, or report a missing item.",
    href: "/dashboard/support/new?category=order",
  },
  {
    icon: CreditCard,
    title: "Payments & Billing",
    description: "Payment failures, refund status, or incorrect charges.",
    href: "/dashboard/support/new?category=payment",
  },
  {
    icon: Truck,
    title: "Shipping & Delivery",
    description: "Delayed shipments, wrong delivery address, or lost packages.",
    href: "/dashboard/support/new?category=shipping",
  },
  {
    icon: RefreshCcw,
    title: "Returns & Refunds",
    description: "Initiate a return, check refund status, or report a damaged product.",
    href: "/dashboard/support/new?category=refund",
  },
  {
    icon: ShieldCheck,
    title: "Warranty Claims",
    description: "Raise a warranty claim for a defective product.",
    href: "/dashboard/support/new?category=product",
  },
  {
    icon: LifeBuoy,
    title: "Account & Profile",
    description: "Login issues, profile updates, or dealer account queries.",
    href: "/dashboard/support/new?category=account",
  },
];

const faqs = [
  {
    q: "How do I track my order?",
    a: "Once your order is shipped, you will receive an SMS and email with the tracking number. You can also view live order status from Dashboard > Orders on the app or website.",
  },
  {
    q: "What is the return policy?",
    a: "We accept returns within 7 days of delivery for unopened, unused products in original packaging. Defective products under warranty are handled directly through the manufacturer's service centre. Raise a ticket under Returns & Refunds to get started.",
  },
  {
    q: "How long does delivery take?",
    a: "Orders placed before 3 PM on business days are dispatched the same day from our Jaipur warehouse. Delivery typically takes 2–5 business days depending on your location.",
  },
  {
    q: "My payment was deducted but the order was not placed. What do I do?",
    a: "This can happen when a transaction times out before confirmation. The amount is automatically refunded to your original payment method within 5–7 business days. If it has been longer, please raise a Payment & Billing ticket.",
  },
  {
    q: "How do I register as a B2B dealer?",
    a: "Visit the Register page and select 'Dealer Account'. Fill in your business details and our team will review and activate your account within 24 hours, unlocking exclusive B2B pricing.",
  },
  {
    q: "Can I change or cancel my order after placing it?",
    a: "Orders can be cancelled within 1 hour of placement if they have not yet been dispatched. Go to Dashboard > Orders > Cancel, or raise an order ticket immediately. Once dispatched, cancellation is not possible.",
  },
];

export default function SupportPage() {
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
              <span className="text-white/70">Support</span>
            </div>
            <div className="mt-4 flex items-start gap-4 md:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <LifeBuoy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold md:text-3xl">How Can We Help?</h1>
                <p className="mt-1 text-sm text-white/60">
                  Browse common topics or get in touch — our team is here for you.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-white/40">
              <Clock className="h-3.5 w-3.5" />
              <span>Support hours: Monday – Saturday, 9 AM – 7 PM IST</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12 space-y-10">

          {/* Contact methods */}
          <section>
            <h2 className="mb-4 text-sm font-bold text-foreground md:text-base">Contact Us</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {contactMethods.map((method) => (
                <a
                  key={method.title}
                  href={method.href}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${method.primary ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
                    <method.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{method.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{method.description}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-semibold ${method.primary ? "bg-primary text-white" : "bg-muted text-foreground"}`}>
                    {method.action}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Support categories */}
          <section>
            <h2 className="mb-4 text-sm font-bold text-foreground md:text-base">Browse by Topic</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="flex items-start gap-3.5 rounded-xl border border-border bg-white p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <cat.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{cat.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground self-center" />
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="mb-4 text-sm font-bold text-foreground md:text-base">
              Frequently Asked Questions
            </h2>
            <div className="flex flex-col gap-3">
              {faqs.map((faq, i) => (
                <div key={i} className="rounded-xl border border-border bg-white p-5">
                  <p className="text-sm font-semibold text-foreground">{faq.q}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Still need help CTA */}
          <section className="rounded-xl bg-stb-dark p-6 text-white md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold md:text-base">Still Need Help?</h2>
                <p className="mt-1 text-xs text-white/60 max-w-md">
                  Our support team responds to all tickets within one business day. Sign in to track your ticket history and get faster resolutions.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
                <Button asChild className="bg-primary hover:bg-stb-red-dark text-white">
                  <Link href="/dashboard/support/new">Raise a Ticket</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Link href="/dashboard/support">My Tickets</Link>
                </Button>
              </div>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
