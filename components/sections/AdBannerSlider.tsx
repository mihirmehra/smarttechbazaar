"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface AdBanner {
  id: string;
  image: string;
  imageMobile?: string;
  alt: string;
  href: string;
}

interface AdBannerSliderProps {
  banners?: AdBanner[];
  showAsGrid?: boolean; // Show as 3-image grid instead of slider
}

// Default ad banners — 1500×300
const DEFAULT_AD_BANNERS: AdBanner[] = [
  {
    id: "display-ad-1",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Display%20Banner%20%281%29.jpg-IfvbMzVGhdB5gaL5i6wRQ2RaW9OF26.jpeg",
    alt: "Crystal-clear monitors and immersive screens",
    href: "/category/display",
  },
  {
    id: "storage-ad-1",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Storage%20%20Banner.jpg-Lx6JHgVmRrTdHq03J3dR1Luf3KXyIL.jpeg",
    alt: "Secure your digital life with high-speed SSDs",
    href: "/category/storage",
  },
];

export default function AdBannerSlider({ banners, showAsGrid = false }: AdBannerSliderProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [, setCurrent] = useState(0);

  // Use provided banners or default
  const AD_BANNERS = banners && banners.length > 0 ? banners : DEFAULT_AD_BANNERS;

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

  // Grid layout for 3 banners
  if (showAsGrid && AD_BANNERS.length >= 3) {
    return (
      <section className="w-full bg-background" aria-label="Promotional banners">
        <div className="relative w-full">
          <Carousel
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 4000, stopOnInteraction: false })]}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-0">
              {AD_BANNERS.map((banner, i) => (
                <CarouselItem key={banner.id} className="pl-0">
                  <Link href={banner.href} className="block w-full" aria-label={banner.alt}>
                    {/* Desktop ratio 1500:300 = 5:1 */}
                    <div
                      className="relative w-full hidden md:block"
                      style={{ aspectRatio: "5 / 1" }}
                    >
                      <Image
                        src={banner.image}
                        alt={banner.alt}
                        fill
                        sizes="100vw"
                        className="object-cover object-center"
                        loading={i === 0 ? "eager" : "lazy"}
                        quality={80}
                      />
                    </div>
                    {/* Mobile ratio — taller for better visibility */}
                    <div
                      className="relative w-full min-h-[150px] md:hidden"
                      style={{ aspectRatio: "16 / 5" }}
                    >
                      <Image
                        src={banner.imageMobile || banner.image}
                        alt={banner.alt}
                        fill
                        sizes="100vw"
                        className="object-cover object-center"
                        loading={i === 0 ? "eager" : "lazy"}
                        quality={80}
                      />
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </section>
    );
  }

  // Full-width slider layout (no nav buttons or dots)
  return (
    <section className="w-full bg-background" aria-label="Advertisement banners">
      <div className="relative w-full">
        <Carousel
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {AD_BANNERS.map((banner, i) => (
              <CarouselItem key={banner.id} className="pl-0">
                <Link href={banner.href} className="block w-full" aria-label={banner.alt}>
                  {/* Desktop ratio 1500:300 = 5:1 */}
                  <div
                    className="relative w-full hidden md:block"
                    style={{ aspectRatio: "5 / 1" }}
                  >
                    <Image
                      src={banner.image}
                      alt={banner.alt}
                      fill
                      sizes="100vw"
                      className="object-cover object-center"
                      loading="lazy"
                      quality={80}
                    />
                  </div>
                  {/* Mobile ratio — taller for better visibility */}
                  <div
                    className="relative w-full min-h-[150px] md:hidden"
                    style={{ aspectRatio: "16 / 5" }}
                  >
                    <Image
                      src={banner.imageMobile || banner.image}
                      alt={banner.alt}
                      fill
                      sizes="100vw"
                      className="object-cover object-center"
                      loading="lazy"
                      quality={80}
                    />
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
