import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/**
 * Firebase is initialized lazily.
 *
 * Calling `initializeApp`/`getAuth` at module scope throws
 * `auth/invalid-api-key` when the NEXT_PUBLIC_FIREBASE_* vars are absent, which
 * breaks `next build` while prerendering any page that imports this module.
 * Deferring initialization to the first real sign-in keeps the build green and
 * also removes the Firebase Auth bundle from the critical path of page load.
 */
let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedProvider: GoogleAuthProvider | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* environment variables to enable Google sign-in."
    );
  }

  if (!cachedApp) {
    cachedApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }

  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(getFirebaseApp());
  }
  return cachedAuth;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!cachedProvider) {
    cachedProvider = new GoogleAuthProvider();
    // Web Client ID — used by Firebase web popup sign-in.
    // For Android native (Median.co), use the Android Client ID separately.
    cachedProvider.setCustomParameters({
      client_id:
        process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        "393630939714-ccgciu2tmtf7me0souh2vt7a1ctqe1bf.apps.googleusercontent.com",
    });
  }
  return cachedProvider;
}
