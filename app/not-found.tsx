"use client";

import { FileQuestion, Home, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* 404 Text */}
        <p className="text-6xl font-bold text-primary mb-4">404</p>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/">
            <Button className="w-full gap-2">
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
          </Link>

          <Link href="/products">
            <Button variant="outline" className="w-full gap-2">
              <Search className="h-4 w-4" />
              Browse Products
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Popular links */}
        <div className="mt-10 p-4 bg-muted/50 rounded-xl text-left">
          <p className="text-xs font-semibold text-foreground mb-3">
            Popular pages:
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className="px-3 py-1.5 bg-white rounded-full text-xs text-foreground border border-border hover:border-primary hover:text-primary transition-colors"
            >
              All Products
            </Link>
            <Link
              href="/category/laptops"
              className="px-3 py-1.5 bg-white rounded-full text-xs text-foreground border border-border hover:border-primary hover:text-primary transition-colors"
            >
              Laptops
            </Link>
            <Link
              href="/category/networking"
              className="px-3 py-1.5 bg-white rounded-full text-xs text-foreground border border-border hover:border-primary hover:text-primary transition-colors"
            >
              Networking
            </Link>
            <Link
              href="/brands"
              className="px-3 py-1.5 bg-white rounded-full text-xs text-foreground border border-border hover:border-primary hover:text-primary transition-colors"
            >
              Brands
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 bg-white rounded-full text-xs text-foreground border border-border hover:border-primary hover:text-primary transition-colors"
            >
              My Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
