"use client";

import { useState } from "react";
import { Share2, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareContent, triggerHapticFeedback } from "@/lib/native-app";
import { useNativeApp } from "@/components/providers/NativeAppProvider";

interface NativeShareButtonProps {
  title: string;
  text?: string;
  url: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function NativeShareButton({
  title,
  text,
  url,
  className,
  variant = "outline",
  size = "sm",
  showLabel = false,
}: NativeShareButtonProps) {
  const { isNativeApp } = useNativeApp();
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setSharing(true);

    try {
      // Trigger haptic feedback in native app
      if (isNativeApp) {
        triggerHapticFeedback("light");
      }

      // Try native share first
      const shared = await shareContent({ title, text, url });

      // If native share failed or unavailable, fall back to clipboard
      if (!shared) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("Share failed:", error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard also failed
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={sharing}
      className={className}
      aria-label={copied ? "Link copied" : "Share"}
    >
      {sharing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : copied ? (
        <>
          <Check className="h-4 w-4" />
          {showLabel && <span className="ml-1.5">Copied!</span>}
        </>
      ) : (
        <>
          {isNativeApp ? (
            <Share2 className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {showLabel && <span className="ml-1.5">{isNativeApp ? "Share" : "Copy Link"}</span>}
        </>
      )}
    </Button>
  );
}

export default NativeShareButton;
