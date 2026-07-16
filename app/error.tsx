"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error for debugging
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="mx-auto h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-2">
          We encountered an unexpected error. Don&apos;t worry, your data is safe.
        </p>

        {/* Error digest for support */}
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono mb-8">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <Link href="/">
            <Button variant="outline" className="w-full gap-2">
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
          </Link>

          <Link href="/dashboard/support/new">
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Report Issue
            </Button>
          </Link>
        </div>

        {/* Info box */}
        <div className="mt-10 p-4 bg-muted/50 rounded-xl text-left">
          <p className="text-xs font-semibold text-foreground mb-2">
            What you can try:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              Refresh the page or try again
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              Clear your browser cache
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              Check your internet connection
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              If the problem persists, contact support
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
