import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        {/* Logo with pulse animation */}
        <div className="relative mb-6">
          <Image
            src="/logo.png"
            alt="Smart Tech Bazaar"
            width={120}
            height={48}
            className="h-12 w-auto object-contain animate-pulse"
            priority
          />
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        </div>

        {/* Loading text */}
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
