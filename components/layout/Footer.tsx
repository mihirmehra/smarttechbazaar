"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  Send,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from "lucide-react";

// Custom Social Media Icons (not available in lucide-react)
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const infoLinks = [
  { name: "About Us", href: "/about" },
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Terms & Conditions", href: "/terms" },
  { name: "Dealer Registration", href: "/auth/register?type=dealer" },
];

const categoryLinks = [
  { name: "Desktop", href: "/category/desktop" },
  { name: "Laptops", href: "/category/laptops" },
  { name: "Networking", href: "/category/networking" },
  { name: "Security", href: "/category/security" },
  { name: "Printers & Scanners", href: "/category/printers-scanners" },
  { name: "Software", href: "/category/software" },
];

const contactDetails = [
  { department: "Sales", number: "6363677588" },
  { department: "Billing", number: "6363677588" },
  { department: "Support", number: "6363677588" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribeStatus === "loading") return;
    setSubscribeStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubscribeStatus("success");
        setEmail("");
      } else {
        setSubscribeStatus("error");
        setTimeout(() => setSubscribeStatus("idle"), 3000);
      }
    } catch {
      setSubscribeStatus("error");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    }
  };

  return (
    <footer className="bg-stb-dark text-white">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-5 md:flex-row md:items-center md:py-6">
          <div>
            <h3 className="text-sm font-semibold text-white">Stay in the Loop</h3>
            <p className="mt-0.5 text-[11px] text-white/50">New products, deals &amp; exclusive offers</p>
          </div>
          {subscribeStatus === "success" ? (
            <div className="flex items-center gap-2 rounded-xl bg-stb-success/20 px-4 py-2.5 text-stb-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">You&apos;re subscribed!</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex w-full max-w-sm overflow-hidden rounded-xl border border-white/15 bg-white/8 md:rounded-xl">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={subscribeStatus === "loading"}
                className="flex h-11 shrink-0 items-center justify-center gap-1.5 bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-70 press-active"
              >
                {subscribeStatus === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Subscribe</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Mobile Footer — compact grid layout */}
      <div className="md:hidden">
        {/* Brand + contact */}
        <div className="border-b border-white/10 px-4 py-5">
          <Image src="/logo.png" alt="Smart Tech Bazaar" width={110} height={36} className="h-8 w-auto object-contain brightness-0 invert" />
          <div className="mt-3 flex flex-col gap-2.5">
            <a href="tel:+916363677588" className="flex items-center gap-2.5 text-xs text-white/70 press-active">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Phone className="h-3.5 w-3.5 text-primary" />
              </div>
              +91 63636 77588
            </a>
            <a href="mailto:smarttechbazaar@gmail.com" className="flex items-center gap-2.5 text-xs text-white/70 press-active">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Mail className="h-3.5 w-3.5 text-primary" />
              </div>
              smarttechbazaar@gmail.com
            </a>
          </div>
          {/* Social Media Links - Mobile */}
          <div className="mt-4 flex items-center gap-3">
            <a 
              href="https://www.facebook.com/profile.php?id=61588955768910" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition-colors hover:bg-primary hover:text-white"
              aria-label="Follow us on Facebook"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
            <a 
              href="https://www.instagram.com/smarttechbazaar_india/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition-colors hover:bg-primary hover:text-white"
              aria-label="Follow us on Instagram"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a 
              href="https://www.linkedin.com/company/smarttechbazaar/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition-colors hover:bg-primary hover:text-white"
              aria-label="Follow us on LinkedIn"
            >
              <LinkedinIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Two-column link grid */}
        <div className="grid grid-cols-2 gap-0 border-b border-white/10">
          <div className="border-r border-white/10 px-4 py-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/60">Quick Links</p>
            <div className="flex flex-col gap-1">
              {infoLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="py-2 text-xs text-white/60 hover:text-primary press-active"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="px-4 py-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/60">Categories</p>
            <div className="flex flex-col gap-1">
              {categoryLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="py-2 text-xs text-white/60 hover:text-primary press-active"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Footer */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Brand Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center">
                <Image src="/logo.png" alt="Smart Tech Bazaar" width={130} height={42} className="h-10 w-auto object-contain brightness-0 invert" />
              </div>
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-white/60">
                Your trusted partner for computer accessories, CCTV cameras, printers,
                networking equipment, and all your technology needs. Serving businesses with
                quality products since 2010.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-xs text-white/60">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>2nd Floor, No. 94/1, Behind Sharda Theater, SP Road, Bangalore - 560002</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <a href="tel:+916363677588" className="hover:text-white">+91 63636 77588</a>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <a href="mailto:smarttechbazaar@gmail.com" className="hover:text-white">smarttechbazaar@gmail.com</a>
                </div>
              </div>
              {/* Social Media Links - Desktop */}
              <div className="mt-4 flex items-center gap-2">
                <a 
                  href="https://www.facebook.com/profile.php?id=61588955768910" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-primary hover:text-white"
                  aria-label="Follow us on Facebook"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
                <a 
                  href="https://www.instagram.com/smarttechbazaar_india/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-primary hover:text-white"
                  aria-label="Follow us on Instagram"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
                <a 
                  href="https://www.linkedin.com/company/smarttechbazaar/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-primary hover:text-white"
                  aria-label="Follow us on LinkedIn"
                >
                  <LinkedinIcon className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white">Quick Links</h4>
              <nav className="flex flex-col gap-2">
                {infoLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-primary"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Categories */}
            <div>
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white">Categories</h4>
              <nav className="flex flex-col gap-2">
                {categoryLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-primary"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Contact */}
            <div>
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white">Contact</h4>
              <div className="space-y-2">
                {contactDetails.map((contact) => (
                  <div key={contact.department} className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{contact.department}</span>
                    <a href={`tel:${contact.number}`} className="flex items-center gap-1 text-white/70 hover:text-primary">
                      <Phone className="h-3 w-3 text-primary" />
                      {contact.number}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
            <p className="text-[10px] text-white/70 md:text-xs">
            &copy; 2025 Smart Tech Bazaar. All Rights Reserved.
          </p>
          <button
            onClick={scrollToTop}
            className="flex h-7 w-7 items-center justify-center rounded bg-white/10 text-white/70 transition-colors hover:bg-primary hover:text-white md:h-8 md:w-8"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
