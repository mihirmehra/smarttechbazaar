"use client";

import { Truck, Shield, Headphones, RefreshCcw, Package, BadgeCheck } from "lucide-react";

const features = [
  { icon: Shield,      title: "Secure Payment", desc: "100% protected",     color: "bg-green-50 text-green-600" },
  { icon: Headphones,  title: "24/7 Support",   desc: "Always available",   color: "bg-purple-50 text-purple-600" },
  { icon: RefreshCcw,  title: "Easy Returns",   desc: "7-day policy",       color: "bg-amber-50 text-amber-600" },
  { icon: Package,     title: "Fast Delivery",  desc: "Express shipping",   color: "bg-orange-50 text-orange-600" },
  { icon: BadgeCheck,  title: "Authentic",      desc: "100% genuine",       color: "bg-stb-red-light text-primary" },
];

export default function FeaturesSection() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-4">
        {/* Mobile: 2×2 colored grid */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          {features.slice(0, 4).map((feature) => (
            <div
              key={feature.title}
              className="flex items-center gap-3 rounded-2xl bg-white border border-border px-3 py-3 shadow-sm"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${feature.color}`}>
                <feature.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-foreground leading-tight">{feature.title}</p>
                <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Full width grid */}
        <div className="hidden rounded-xl border border-border bg-white md:block">
          <div className="grid grid-cols-5 divide-x divide-border">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${feature.color}`}>
                  <feature.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{feature.title}</p>
                  <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
