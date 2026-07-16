import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { FileText, ChevronRight, Mail, Phone } from "lucide-react";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the Terms & Conditions for using Smart Tech Bazaar. Understand your rights and responsibilities when purchasing from our website.",
  alternates: {
    canonical: getCanonicalUrl("/terms"),
  },
  openGraph: {
    title: `Terms & Conditions | ${siteConfig.name}`,
    description: "Read the Terms & Conditions for using Smart Tech Bazaar.",
    url: getCanonicalUrl("/terms"),
    type: "website",
  },
};

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    content: `By accessing or using the Smart Tech Bazaar website (www.smarttechbazaar.com) or placing an order with us, you confirm that you are at least 18 years of age, have read and understood these Terms & Conditions, and agree to be bound by them. If you are purchasing on behalf of a business or organisation, you represent that you have the authority to bind that entity to these terms.

These Terms & Conditions constitute a legally binding agreement between you and Smart Tech Bazaar (registered as a business in Bangalore, Karnataka). We reserve the right to modify these terms at any time. Continued use of the website after changes are posted constitutes acceptance of the revised terms.`,
  },
  {
    id: "products",
    title: "Products & Pricing",
    content: `All products listed on our website are subject to availability. Product images are for illustrative purposes only and may differ slightly from the actual product.

Prices are listed in Indian Rupees (INR) and are inclusive of applicable GST unless stated otherwise. We reserve the right to change prices at any time without prior notice. However, once an order is confirmed, the price at the time of order placement will be honoured.

We make every effort to ensure that product descriptions, specifications, and prices are accurate. In the event of a pricing error, we reserve the right to cancel the order and issue a full refund. We will notify you promptly in such cases.

For bulk or B2B purchases, special pricing may be available. Contact our sales team for a customised quotation.`,
  },
  {
    id: "orders",
    title: "Orders & Payment",
    content: `Placing an item in your cart does not constitute a purchase or reservation. An order is only confirmed once payment is successfully processed and you receive an order confirmation email.

We accept the following payment methods: UPI, credit/debit cards (Visa, Mastercard, Rupay), net banking, and EMI options via our payment gateway partners. All transactions are secured with SSL/TLS encryption.

We reserve the right to refuse or cancel any order at our discretion, including cases of suspected fraud, errors in pricing or product information, or unavailability of stock. In such cases, a full refund will be issued.

GST invoices will be generated for all orders and will be made available in your account dashboard within 24 hours of order dispatch.`,
  },
  {
    id: "shipping",
    title: "Shipping & Delivery",
    content: `Shipping timelines and charges are detailed on our Shipping Information page. Estimated delivery dates are approximate and not guaranteed. Delays may occur due to factors beyond our control, including weather, courier disruptions, or public holidays.

Risk of loss and title for products pass to you upon delivery to the specified shipping address. For orders delivered to a third-party freight forwarder or pick-up point at your request, risk passes upon delivery to that location.

Please inspect your order upon receipt. If you receive a damaged or incorrect item, you must notify us within 24 hours of delivery.`,
  },
  {
    id: "returns",
    title: "Returns & Refunds",
    content: `We offer a 7-day return policy from the date of delivery for most products, subject to the following conditions:

- The product must be unused, in its original packaging, with all accessories, manuals, and warranty cards intact.
- Products must not have been installed, configured, or physically damaged.
- Software, licensed products, consumables (ink, toner, cables), and custom-configured items are non-returnable.
- Products with broken seals are not eligible for return unless they are defective.

To initiate a return, contact our support team with your order number and reason for return. Once approved, we will arrange a reverse pickup at no cost to you. Refunds are processed within 5–7 business days after the returned item passes our quality inspection.

For manufacturing defects, warranty claims must be made directly with the brand's authorised service centre. We will assist you in initiating the process.`,
  },
  {
    id: "warranty",
    title: "Warranty",
    content: `All products sold by Smart Tech Bazaar carry the manufacturer's warranty as specified in the product listing. Warranty periods and terms vary by brand and product category.

Warranty claims must be made at the manufacturer's authorised service centre. We will provide you with relevant contact details and purchase proof to facilitate the claim.

Our warranty does not cover: physical damage caused by mishandling, water or electrical damage, unauthorised repairs or modifications, or consumable parts that wear out through normal use (e.g., batteries, print heads).

Extended warranty options may be available for select products. Contact us for details.`,
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    content: `All content on this website — including text, graphics, logos, button icons, images, audio clips, and software — is the property of Smart Tech Bazaar or its content suppliers and is protected under Indian copyright, trademark, and other applicable laws.

You may not reproduce, distribute, modify, create derivative works from, publicly display, publicly perform, republish, download, store, or transmit any of the material on our website without our prior written consent.

Brand names, product names, and trademarks mentioned on this website are the property of their respective owners. Use of any such marks on this website does not constitute a claim of ownership.`,
  },
  {
    id: "prohibited",
    title: "Prohibited Activities",
    content: `You agree not to use the Smart Tech Bazaar website for any of the following purposes:

- Placing fraudulent orders or providing false personal information
- Impersonating any person or entity
- Attempting to gain unauthorised access to our systems or other user accounts
- Transmitting unsolicited commercial communications (spam)
- Uploading or transmitting viruses or any other malicious code
- Scraping, crawling, or using automated tools to collect data from our website
- Using the website in any way that violates applicable local, national, or international laws

Violation of these prohibitions may result in immediate termination of your account and, where appropriate, legal action.`,
  },
  {
    id: "limitation",
    title: "Limitation of Liability",
    content: `To the maximum extent permitted by applicable law, Smart Tech Bazaar shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of or inability to use our website or products.

Our total aggregate liability for any claims arising from your purchase shall not exceed the amount you paid for the specific order giving rise to the claim.

Nothing in these terms limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded or limited under applicable Indian law.`,
  },
  {
    id: "governing-law",
    title: "Governing Law & Disputes",
    content: `These Terms & Conditions are governed by and construed in accordance with the laws of India, specifically the laws of the State of Karnataka. Any disputes arising out of or in connection with these terms or your use of the website shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.

Before initiating any legal proceeding, we encourage you to contact us to resolve any dispute amicably. We are committed to addressing customer concerns promptly and fairly.`,
  },
  {
    id: "contact-terms",
    title: "Contact Information",
    content: `If you have any questions about these Terms & Conditions, please contact us:

Smart Tech Bazaar
2nd Floor, No. 94/1, Behind Sharda Theater,
SP Road, Bangalore - 560002
Karnataka, India

Email: sales@smarttechbazaar.com
Phone: +91 63636 77588
Business Hours: Monday to Saturday, 9:00 AM – 7:00 PM IST`,
  },
];

export default function TermsPage() {
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
              <span className="text-white/70">Terms & Conditions</span>
            </div>
            <div className="mt-4 flex items-start gap-4 md:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold md:text-3xl">Terms & Conditions</h1>
                <p className="mt-1 text-sm text-white/60">
                  Please read these terms carefully before using our website or placing an order.
                </p>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-white/40">
              Effective Date: 1 January 2025 &nbsp;&bull;&nbsp; Last Updated: 1 January 2025
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">

            {/* Sticky Table of Contents — desktop */}
            <aside className="hidden lg:block lg:w-56 xl:w-64">
              <div className="sticky top-6 rounded-xl border border-border bg-white p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contents</p>
                <nav className="flex flex-col gap-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-stb-red-light hover:text-primary"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">

              {/* Intro */}
              <div className="mb-6 rounded-xl border border-primary/30 bg-stb-red-light p-4 md:p-5">
                <p className="text-xs leading-relaxed text-foreground">
                  <span className="font-semibold text-primary">Important:</span> By using this website or making a purchase, you agree to the terms below. If you do not agree, please refrain from using our services.
                </p>
              </div>

              {/* Policy Sections */}
              <div className="flex flex-col gap-5">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-20 rounded-xl border border-border bg-white p-5 md:p-6"
                  >
                    <h2 className="mb-3 text-sm font-bold text-foreground md:text-base">
                      {section.title}
                    </h2>
                    <div className="prose-custom">
                      {section.content.split("\n\n").map((para, i) => (
                        para.startsWith("-") ? (
                          <ul key={i} className="ml-4 mt-2 flex flex-col gap-1">
                            {para.split("\n").filter(Boolean).map((line, j) => (
                              <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                <span>{line.replace(/^-\s*/, "")}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p key={i} className="mt-2 text-xs leading-relaxed text-muted-foreground first:mt-0">
                            {para}
                          </p>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact CTA */}
              <div className="mt-6 rounded-xl bg-stb-dark p-5 text-white md:p-6">
                <h2 className="text-sm font-bold md:text-base">Have Questions About These Terms?</h2>
                <p className="mt-1.5 text-xs text-white/60">
                  Our team is happy to clarify any part of these terms. Contact us before making a purchase if you have concerns.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <a
                    href="mailto:sales@smarttechbazaar.com"
                    className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-white hover:bg-stb-red-dark"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    sales@smarttechbazaar.com
                  </a>
                  <a
                    href="tel:+916363677588"
                    className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-xs font-medium text-white hover:bg-white/20"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    +91 63636 77588
                  </a>
                </div>
              </div>

              {/* Related links */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/privacy"
                  className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  Privacy Policy
                  <ChevronRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/shipping"
                  className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  Shipping Info
                  <ChevronRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/about"
                  className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  About Us
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
