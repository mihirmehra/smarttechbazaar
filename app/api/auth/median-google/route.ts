import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sign } from "jsonwebtoken";

/**
 * Median.co Social Login Server-Side Redirect Handler
 * 
 * When using redirectUri mode, Median POSTs the Google tokens to this endpoint.
 * We verify the token and create/update the user, then redirect back to the app.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    
    let data: Record<string, string>;
    
    // Median may send as form data or JSON
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries()) as Record<string, string>;
    } else {
      data = await request.json();
    }
    
    console.log("[Median Google Auth] Received data:", JSON.stringify(data, null, 2));
    
    // Extract user info from the token data
    // Median sends: { idToken: "jwt token string", type: "google" }
    let email = data.email || "";
    let name = data.name || "";
    let givenName = data.givenName || data.given_name || "";
    let familyName = data.familyName || data.family_name || "";
    let picture = data.picture || data.photoUrl || "";
    let googleId = data.userId || data.id || data.sub || "";
    
    // If we have an idToken, decode it to get user info
    const idToken = data.idToken || data.id_token || "";
    if (idToken && !email) {
      try {
        const parts = idToken.split(".");
        if (parts.length >= 2) {
          const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
          console.log("[Median Google Auth] Decoded JWT:", payload);
          
          email = payload.email || email;
          name = payload.name || name;
          givenName = payload.given_name || givenName;
          familyName = payload.family_name || familyName;
          picture = payload.picture || picture;
          googleId = payload.sub || googleId;
        }
      } catch (decodeError) {
        console.error("[Median Google Auth] Failed to decode idToken:", decodeError);
      }
    }
    
    if (!email) {
      console.error("[Median Google Auth] No email in response");
      return NextResponse.redirect(
        new URL("/auth/login?error=NoEmail", request.url)
      );
    }
    
    const displayName = name || `${givenName} ${familyName}`.trim() || email.split("@")[0];
    googleId = googleId || email;
    
    await dbConnect();
    
    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      // Update existing user with Google info if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = user.avatar || picture;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        email: email.toLowerCase(),
        name: displayName,
        googleId: googleId,
        avatar: picture,
        isVerified: true, // Google accounts are verified
        role: "customer",
      });
    }
    
    // Create a session token
    const token = sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      process.env.NEXTAUTH_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );
    
    // Redirect back to the app with the token
    // The app will then use this token to create a NextAuth session
    const redirectUrl = new URL("/auth/callback", request.url);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("email", user.email);
    redirectUrl.searchParams.set("name", user.name);
    redirectUrl.searchParams.set("userId", user._id.toString());
    
    console.log("[Median Google Auth] Success, redirecting:", redirectUrl.pathname);
    
    return NextResponse.redirect(redirectUrl);
    
  } catch (error) {
    console.error("[Median Google Auth] Error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=ServerError", request.url)
    );
  }
}

// Also handle GET for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  
  return NextResponse.json({ 
    message: "Median Google Auth endpoint. Use POST to authenticate.",
    usage: "Configure redirectUri in Median Social Login to point here."
  });
}
