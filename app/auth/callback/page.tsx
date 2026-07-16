"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      // Get params from URL (from Median Google auth redirect)
      const token = searchParams.get("token");
      const email = searchParams.get("email");
      const name = searchParams.get("name");
      const userId = searchParams.get("userId");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage(error === "NoEmail" 
          ? "Google Sign-In did not provide an email address." 
          : "Authentication failed. Please try again.");
        return;
      }

      if (!email || !userId) {
        setStatus("error");
        setErrorMessage("Missing authentication data. Please try again.");
        return;
      }

      try {
        // Sign in with NextAuth using the data from our server
        const result = await signIn("google-firebase", {
          email,
          name: name || email.split("@")[0],
          googleId: userId,
          avatar: null,
          redirect: false,
        });

        if (result?.error) {
          setStatus("error");
          setErrorMessage(result.error);
        } else {
          setStatus("success");
          // Redirect to home or the intended destination
          router.push("/");
          router.refresh();
        }
      } catch (err) {
        console.error("Callback auth error:", err);
        setStatus("error");
        setErrorMessage("Failed to complete sign-in. Please try again.");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        {status === "processing" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Completing sign-in...</h2>
            <p className="text-muted-foreground mt-2">Please wait while we set up your account.</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Sign-in successful!</h2>
            <p className="text-muted-foreground mt-2">Redirecting you now...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Sign-in failed</h2>
            <p className="text-muted-foreground mt-2">{errorMessage}</p>
            <button
              onClick={() => router.push("/auth/login")}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
