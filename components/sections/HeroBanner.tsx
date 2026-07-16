"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface BannerSlide {
  id: string;
  image: string;
  imageMobile?: string;
  alt: string;
  href: string;
}

interface HeroBannerProps {
  banners?: BannerSlide[];
}

// Default slider images — Desktop 1500×450 · Mobile 450×300
const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: "display-banner",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Display%20Banner%201500x450.jpg-qH4BlgbMdr3xa4HXaH5iA5zYvxZqPW.jpeg",
    alt: "Experience Crystal-Clear Displays and Immersive Visuals",
    href: "/category/display",
  },
  {
    id: "laptops-banner",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Laptops%20Banner%201500x450-Recovered.jpg-QMLDAo6rpXnIS4BkiMXvkpOD2QUV0m.jpeg",
    alt: "Power Meets Performance - Next-Gen laptops for Work, Gaming & Creativity",
    href: "/category/laptop",
  },
  {
    id: "storage-banner",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/storage%20Banner%201500x450.jpg-EtvfDlF2RiTTXenqrp4LgEW9Gc5P9K.jpeg",
    alt: "Protect your Digital world with ultra-fast SSDs and high-capacity storage",
    href: "/category/storage",
  },
];

export default function HeroBanner({ banners }: HeroBannerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Use provided banners or default slides
  const SLIDES = banners && banners.length > 0 ? banners : DEFAULT_SLIDES;

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return (
    <section className="w-full bg-white" aria-label="Featured promotions">
      <div className="relative w-full">
        <Carousel
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {SLIDES.map((slide, i) => (
              <CarouselItem key={slide.id} className="pl-0">
                <Link href={slide.href} className="block w-full" aria-label={slide.alt}>
                  {/* Desktop ratio 1500:450 = 10:3 */}
                  <div
                    className="relative w-full hidden md:block"
                    style={{ aspectRatio: "10 / 3" }}
                  >
                    <Image
                      src={slide.image}
                      alt={slide.alt}
                      fill
                      sizes="100vw"
                      className="object-cover object-center"
                      // First slide: priority + no placeholder so the real image is the LCP element.
                      // A blur placeholder makes the base64 data URI the LCP candidate (5,620ms delay).
                      priority={i === 0}
                      loading={i === 0 ? "eager" : "lazy"}
                      quality={85}
                    />
                  </div>
                  {/* Mobile ratio 450:300 = 3:2 — use same image or mobile image, crop to top */}
                  <div
                    className="relative w-full md:hidden"
                    style={{ aspectRatio: "3 / 2" }}
                  >
                    <Image
                      src={slide.imageMobile || slide.image}
                      alt={slide.alt}
                      fill
                      sizes="100vw"
                      className="object-cover object-top"
                      priority={i === 0}
                      loading={i === 0 ? "eager" : "lazy"}
                      quality={85}
                    />
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Arrows — desktop only */}
          <CarouselPrevious className="left-2 hidden md:flex h-8 w-8 border-0 bg-white/85 text-foreground shadow hover:bg-white" />
          <CarouselNext className="right-2 hidden md:flex h-8 w-8 border-0 bg-white/85 text-foreground shadow hover:bg-white" />
        </Carousel>

        {/* Dot indicators - minimum 44x44px touch target for accessibility */}
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              aria-label={`Go to slide ${i + 1} of ${SLIDES.length}`}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 bg-primary" : "w-2 bg-white/60 hover:bg-white"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
