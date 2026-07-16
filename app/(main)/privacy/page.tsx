import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { ShieldCheck, ChevronRight, Mail, Phone } from "lucide-react";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Smart Tech Bazaar collects, uses, and protects your personal information. Your privacy and data security is our priority.",
  alternates: {
    canonical: getCanonicalUrl("/privacy"),
  },
  openGraph: {
    title: `Privacy Policy | ${siteConfig.name}`,
    description: "Learn how Smart Tech Bazaar collects, uses, and protects your personal information.",
    url: getCanonicalUrl("/privacy"),
    type: "website",
  },
};

const sections = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    content: [
      {
        subtitle: "Personal Information",
        body: "When you create an account, place an order, or contact us, we collect information such as your full name, email address, phone number, billing address, and shipping address. This information is necessary to process and fulfil your orders.",
      },
      {
        subtitle: "Payment Information",
        body: "We do not store your full card details on our servers. Payment transactions are processed through PCI-DSS compliant payment gateways. We may store the last four digits of your card and the card type for your reference.",
      },
      {
        subtitle: "Usage Data",
        body: "We automatically collect information about how you interact with our website, including IP address, browser type, operating system, referring URLs, pages visited, and time spent on each page. This helps us improve the website experience.",
      },
      {
        subtitle: "Cookies & Tracking",
        body: "We use cookies and similar technologies to maintain your session, remember your preferences, and serve relevant content. You can control cookie settings in your browser, though disabling certain cookies may affect functionality.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "How We Use Your Information",
    content: [
      {
        subtitle: "Order Processing",
        body: "Your personal and payment details are used to process, confirm, and deliver your orders, send order confirmations and shipping updates, and handle returns and refunds.",
      },
      {
        subtitle: "Customer Support",
        body: "We use your contact information to respond to enquiries, resolve disputes, and provide technical support. Support conversations may be recorded for quality and training purposes.",
      },
      {
        subtitle: "Marketing Communications",
        body: "If you have opted in, we may send you promotional emails about new products, exclusive offers, and company news. You can unsubscribe at any time using the link in any email or by contacting us directly.",
      },
      {
        subtitle: "Legal & Compliance",
        body: "We may process your data to comply with applicable Indian laws, including the Information Technology Act, 2000, and to respond to lawful requests from courts or government authorities.",
      },
    ],
  },
  {
    id: "sharing",
    title: "Information Sharing & Disclosure",
    content: [
      {
        subtitle: "Service Providers",
        body: "We share your information with trusted third-party service providers who assist us in operating our website and business, including payment processors, courier partners, and email service providers. These parties are contractually obligated to keep your information confidential.",
      },
      {
        subtitle: "Business Transfers",
        body: "In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity. We will notify you via email or prominent notice on our website before your data is transferred.",
      },
      {
        subtitle: "Legal Requirements",
        body: "We may disclose your information if required by law, court order, or governmental authority, or if we believe disclosure is necessary to protect our rights, prevent fraud, or ensure the safety of our users.",
      },
      {
        subtitle: "No Sale of Data",
        body: "We do not sell, trade, or rent your personal information to third parties for their marketing purposes. Your data is used solely to provide and improve our services.",
      },
    ],
  },
  {
    id: "data-security",
    title: "Data Security",
    content: [
      {
        subtitle: "Technical Safeguards",
        body: "We implement industry-standard security measures including SSL/TLS encryption for data in transit, encrypted storage for sensitive data, and regular security audits. Access to personal data is restricted to authorised personnel only.",
      },
      {
        subtitle: "Account Security",
        body: "You are responsible for maintaining the confidentiality of your account password. We recommend using a strong, unique password and enabling any available two-factor authentication. Notify us immediately if you suspect unauthorised access to your account.",
      },
      {
        subtitle: "Data Retention",
        body: "We retain your personal data for as long as your account is active or as needed to provide services. Order and transaction records are retained for a minimum of 7 years to comply with Indian tax and accounting regulations.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "Your Rights",
    content: [
      {
        subtitle: "Access & Correction",
        body: "You have the right to access the personal information we hold about you and to request correction of any inaccurate data. You can update most of your profile information directly from your account dashboard.",
      },
      {
        subtitle: "Account & Data Deletion",
        body: "You have the right to delete your account at any time directly from the app. Go to Dashboard > Security > Delete Account to permanently remove your account and associated personal data. When you delete your account: your personal information (name, email, phone, addresses) will be permanently deleted; your order history will be anonymized but retained for legal and tax compliance purposes; your product reviews will be anonymized; and any open support tickets will be closed. This action cannot be undone. Please ensure you have no pending orders before deleting your account.",
      },
      {
        subtitle: "Opt-Out",
        body: "You can opt out of marketing emails at any time by clicking the unsubscribe link in any email or by contacting us. You can also manage your notification preferences in the app under Dashboard > Notifications > Settings. Opting out of marketing communications will not affect transactional emails related to your orders.",
      },
      {
        subtitle: "Data Portability",
        body: "Upon request, we can provide you with a copy of your personal data in a commonly used, machine-readable format. Contact us to request your data export.",
      },
    ],
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    content: [
      {
        subtitle: "Payment Processing",
        body: "We use Razorpay as our payment gateway to process transactions securely. When you make a purchase, Razorpay collects and processes your payment information in accordance with their privacy policy. We do not store your full card details on our servers. For more information, please review Razorpay's Privacy Policy at https://razorpay.com/privacy/.",
      },
      {
        subtitle: "Push Notifications",
        body: "We use OneSignal to send push notifications to your device when you opt in. OneSignal may collect device identifiers and notification interaction data. You can opt out of push notifications at any time through your device settings or the app's notification preferences. For more information, please review OneSignal's Privacy Policy at https://onesignal.com/privacy_policy.",
      },
      {
        subtitle: "Analytics & Performance",
        body: "We may use analytics services to understand how users interact with our app and website. These services collect anonymised usage data to help us improve our services. This data does not include personally identifiable information.",
      },
    ],
  },
  {
    id: "third-party",
    title: "Third-Party Links",
    content: [
      {
        subtitle: "External Websites",
        body: "Our website may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to review their privacy policies before providing any personal information.",
      },
    ],
  },
  {
    id: "children",
    title: "Children's Privacy",
    content: [
      {
        subtitle: "Age Restriction",
        body: "Our services are not directed to children under the age of 18. We do not knowingly collect personal information from minors. If you believe a child has provided us with personal information, please contact us and we will take steps to delete it.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    content: [
      {
        subtitle: "Policy Updates",
        body: "We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. When we make material changes, we will notify you by posting the updated policy on this page and updating the effective date. Continued use of our services after changes constitutes your acceptance of the updated policy.",
      },
    ],
  },
];

export default function PrivacyPage() {
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
              <span className="text-white/70">Privacy Policy</span>
            </div>
            <div className="mt-4 flex items-start gap-4 md:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold md:text-3xl">Privacy Policy</h1>
                <p className="mt-1 text-sm text-white/60">
                  How we collect, use, and protect your personal information.
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
                      className="rounded px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-stb-red-light hover:text-primary"
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
              <div className="mb-8 rounded-xl border border-border bg-white p-5 md:p-6">
                <p className="text-sm leading-relaxed text-foreground">
                  Smart Tech Bazaar (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website{" "}
                  <a href="https://www.smarttechbazaar.com" className="text-primary hover:underline">www.smarttechbazaar.com</a>{" "}
                  or make a purchase from us. Please read this policy carefully. If you disagree with its terms, please discontinue use of our site.
                </p>
              </div>

              {/* Policy Sections */}
              <div className="flex flex-col gap-6">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-20 rounded-xl border border-border bg-white p-5 md:p-6"
                  >
                    <h2 className="mb-4 text-sm font-bold text-foreground md:text-base">
                      {section.title}
                    </h2>
                    <div className="flex flex-col gap-4">
                      {section.content.map((item) => (
                        <div key={item.subtitle}>
                          <h3 className="mb-1 text-xs font-semibold text-foreground">{item.subtitle}</h3>
                          <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="mt-6 rounded-xl bg-stb-dark p-5 text-white md:p-6">
                <h2 className="text-sm font-bold md:text-base">Questions About This Policy?</h2>
                <p className="mt-1.5 text-xs text-white/60">
                  If you have any questions or concerns about our Privacy Policy or how we handle your data, please reach out to us.
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
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
