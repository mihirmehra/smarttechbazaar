# Before Publishing — Smart Tech Bazaar Mobile App

This document covers every step needed to publish the Smart Tech Bazaar app to the Google Play Store and Apple App Store using Median.co as your wrapper.

**Last Updated:** May 2025

---

## Table of Contents

1. [Current Configuration Status](#1-current-configuration-status)
2. [Accounts & Memberships Required](#2-accounts--memberships-required)
3. [Environment Variables](#3-environment-variables)
4. [Remaining Code Updates](#4-remaining-code-updates)
5. [OneSignal Push Notifications](#5-onesignal-push-notifications)
6. [Median.co Configuration](#6-medianco-configuration)
7. [Google Play Store Submission](#7-google-play-store-submission)
8. [Apple App Store Submission](#8-apple-app-store-submission)
9. [Pre-Submission Testing Checklist](#9-pre-submission-testing-checklist)
10. [Post-Submission](#10-post-submission)

---

## 1. Current Configuration Status

### COMPLETED Items

| Item | File | Status |
|------|------|--------|
| Android App Links | `public/.well-known/assetlinks.json` | DONE |
| iOS Universal Links | `public/.well-known/apple-app-site-association` | DONE - Team ID: `5TGG836W7V` |
| PWA Manifest | `public/manifest.json` | DONE - App ID: `com.smarttechbazaar.app` |
| App Icons | `public/icons/` | DONE - PNG icons (192x192, 512x512) |
| Splash Screens | `public/splash/` | DONE - All 8 iOS sizes generated |
| OG Image | `public/og-image.png` | DONE - 1200x630 social sharing image |
| Health Endpoint | `/api/health` | DONE - Returns `{"status":"ok",...}` |
| Privacy Policy | `/privacy` | DONE |
| Terms of Service | `/terms` | DONE |
| Shipping Policy | `/shipping` | DONE |
| Account Deletion | `/dashboard/delete-account` | DONE - Apple requirement |
| Site Config | `lib/site-config.ts` | DONE - Updated with real business info |
| Push Notifications (Client) | `hooks/use-push-notifications.ts` | DONE |
| Push Notifications (Server) | `lib/push-notifications.ts` | DONE - OneSignal REST API integrated |
| Native App Detection | `lib/native-app.ts` | DONE |
| Deep Linking | `hooks/use-deep-linking.ts` | DONE - URL scheme: `stb://` |
| App Rating Dialog | `components/app/AppRatingDialog.tsx` | DONE |
| Apple App Store ID | `hooks/use-app-rating.ts` | DONE - ID: `6766469443` |
| Offline Page | `app/offline/page.tsx` | DONE |
| Error Handling | `app/error.tsx`, `app/not-found.tsx` | DONE |
| robots.txt | `app/robots.ts` | DONE |
| sitemap.xml | `app/sitemap.ts` | DONE |
| OneSignal iOS APNs | OneSignal Dashboard | DONE |
| OneSignal Android FCM | OneSignal Dashboard | DONE |
| Business Contact Info | `lib/site-config.ts` | DONE |
| Social Media Links | Footer component | DONE |

### REMAINING Items (Before Production Launch)

| Item | Status | Action Required |
|------|--------|-----------------|
| Production Razorpay Keys | PENDING | Replace test keys with live keys |
| SEO Indexing | DISABLED | Change `index: false` to `index: true` in `app/layout.tsx` when ready |
| Production NextAuth Secret | PENDING | Generate secure secret for production |

---

## 2. Accounts & Memberships Required

| Account | Cost | URL | Status |
|---------|------|-----|--------|
| Median.co | $99+/year per platform | https://median.co/pricing | Required |
| Google Play Developer | One-time $25 | https://play.google.com/console | Required |
| Apple Developer Program | $99/year | https://developer.apple.com/programs/ | ACTIVE |
| OneSignal | Free tier | https://onesignal.com | CONFIGURED |
| Firebase (for Google Sign-In) | Free | https://console.firebase.google.com | CONFIGURED |
| Razorpay | Per transaction | https://razorpay.com | CONFIGURED (test mode) |
| ImageKit | Free tier | https://imagekit.io | CONFIGURED |
| MongoDB Atlas | Free tier | https://mongodb.com | CONFIGURED |
| Vercel | Free tier | https://vercel.com | CONFIGURED |

---

## 3. Environment Variables

### Currently Configured

```bash
# MongoDB
MONGODB_URI=mongodb+srv://... (CONFIGURED)

# ImageKit
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/sabkatechbazar (CONFIGURED)
IMAGEKIT_PUBLIC_KEY=public_TWHqSdyjv7kGh032TGbBKZb/AIc= (CONFIGURED)
IMAGEKIT_PRIVATE_KEY=private_LygDURJqV/8OVn5bN3moIAWdd84= (CONFIGURED)

# NextAuth
NEXTAUTH_SECRET=your-super-secret-key-here-change-in-production (CHANGE FOR PRODUCTION)
NEXTAUTH_URL=http://localhost:3000 (CHANGE FOR PRODUCTION)

# Firebase (Google Sign-in)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAyuKH1MP_MttahHqtRyh8sJMsZtNw33GU (CONFIGURED)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sabkatechbazar.firebaseapp.com (CONFIGURED)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sabkatechbazar (CONFIGURED)
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sabkatechbazar.firebasestorage.app (CONFIGURED)
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=393630939714 (CONFIGURED)
NEXT_PUBLIC_FIREBASE_APP_ID=1:393630939714:web:227ef59d3c9e770c624bdb (CONFIGURED)

# Razorpay (TEST KEYS - CHANGE FOR PRODUCTION)
RAZORPAY_KEY_ID=rzp_test_SdrRacK0lWfohO (CHANGE FOR PRODUCTION)
RAZORPAY_KEY_SECRET=rvsn07IwQKe9Hrj2rQrE2IiJ (CHANGE FOR PRODUCTION)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_SdrRacK0lWfohO (CHANGE FOR PRODUCTION)

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XZtLy2nIoGQ8mDbG_... (CONFIGURED)

# OneSignal Push Notifications
ONESIGNAL_APP_ID=70c19aa3-9238-4543-acf1-0c564fc4af5a (CONFIGURED)
ONESIGNAL_REST_API_KEY=os_v2_app_... (CONFIGURED)
```

### Production Changes Required

Before going live, update these in Vercel Dashboard > Settings > Environment Variables:

| Variable | Current | Production Value |
|----------|---------|------------------|
| `NEXTAUTH_SECRET` | Placeholder | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://smarttechbazaar.com` |
| `NEXT_PUBLIC_SITE_URL` | Not set | `https://smarttechbazaar.com` |
| `RAZORPAY_KEY_ID` | Test key (`rzp_test_...`) | Live key (`rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Test secret | Live secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Test key | Live key |

---

## 4. Remaining Code Updates

### 4a. Enable SEO Indexing (when ready for public)

**File:** `app/layout.tsx`

Find the robots metadata and change from:
```typescript
robots: {
  index: false,
  follow: false,
}
```

To:
```typescript
robots: {
  index: true,
  follow: true,
}
```

---

## 5. OneSignal Push Notifications

### Current Status: FULLY CONFIGURED

| Platform | Status | Notes |
|----------|--------|-------|
| Web Push | DONE | Working |
| Android (FCM) | DONE | Firebase Cloud Messaging configured |
| iOS (APNs) | DONE | Apple Push Notification service configured |

### OneSignal Credentials

```
App ID: 70c19aa3-9238-4543-acf1-0c564fc4af5a
REST API Key: (configured in environment variables)
```

### Server-Side Push Integration (DONE)

Push notifications are automatically sent for:
- Order placed confirmation
- Order status updates (shipped, delivered, cancelled, etc.)
- Support ticket replies
- Support ticket resolved

---

## 6. Median.co Configuration

### App Details

| Setting | Value |
|---------|-------|
| App Name | Smart Tech Bazaar |
| Website URL | `https://smarttechbazaar.com` |
| Package Name (Android) | `com.smarttechbazaar.app` |
| Bundle ID (iOS) | `com.smarttechbazaar.app` |
| Team ID (iOS) | `5TGG836W7V` |
| Theme Color | `#E31837` |
| Background Color | `#FFFFFF` |

### Native Plugins to Enable

| Plugin | Configuration |
|--------|---------------|
| OneSignal | App ID: `70c19aa3-9238-4543-acf1-0c564fc4af5a` |
| Social Login (Google) | Web Client ID: `393630939714-kv9uopvubdai15ob74tn0s6ppdd4jip4.apps.googleusercontent.com` |
| Social Login (Apple) | Enable for iOS |
| Pull to Refresh | Enable |
| Camera | Enable (for product reviews/profile photos) |
| Photo Library | Enable |

### URL Scheme Configuration

| Setting | Value |
|---------|-------|
| Custom URL Scheme | `stb` |
| Associated Domains | `smarttechbazaar.com` |

---

## 7. Google Play Store Submission

### Store Listing Information

| Item | Value/Requirement |
|------|-------------------|
| App Name | Smart Tech Bazaar (max 30 chars) |
| Short Description | Shop computer accessories, CCTV, printers & IT solutions (max 80 chars) |
| Full Description | See App Store description below |
| Category | Shopping |
| Content Rating | Complete questionnaire (likely "Everyone") |
| App Icon | 512x512 PNG — use `public/icons/icon-512x512.png` |
| Feature Graphic | Create 1024x500 PNG banner |
| Screenshots | Min 2 phone screenshots (1080x1920 or similar) |
| Privacy Policy | `https://smarttechbazaar.com/privacy` |

### Data Safety Form

| Data Type | Collected? | Shared? |
|-----------|------------|---------|
| Name | Yes | No |
| Email address | Yes | No |
| Phone number | Yes | No |
| User IDs | Yes | No |
| Purchase history | Yes | No |
| Device IDs | Yes | No (used for push notifications only) |

---

## 8. Apple App Store Submission

### App Store Connect Setup

| Setting | Value |
|---------|-------|
| Bundle ID | `com.smarttechbazaar.app` |
| Team ID | `5TGG836W7V` |
| Apple App Store ID | `6766469443` |
| Category | Shopping (Primary), Business (Secondary) |
| Price | Free |

### App Information

| Item | Value/Requirement |
|------|-------------------|
| App Name | Smart Tech Bazaar |
| Subtitle | Tech Products & IT Solutions (max 30 chars) |
| Keywords | computer accessories, CCTV, printers, networking, IT solutions, B2B, wholesale, India (max 100 chars) |
| Privacy Policy URL | `https://smarttechbazaar.com/privacy` |
| Support URL | `https://smarttechbazaar.com/about` |

### App Store Description (Ready to Use)

```
Smart Tech Bazaar - Your one-stop shop for computer accessories, 
CCTV cameras, networking equipment, printers, and IT solutions.

FEATURES:
• Browse 1000+ tech products from top brands
• Easy checkout with multiple payment options (UPI, Cards, Net Banking)
• Track your orders in real-time
• Get notified about deals and order updates
• Secure account with easy management
• B2B wholesale pricing for businesses
• GST invoices for all orders

CATEGORIES:
• Laptops & Desktops
• Networking Equipment
• CCTV & Security Systems
• Printers & Scanners
• Storage Solutions
• Computer Accessories
• And much more!

Whether you're a business looking for B2B wholesale pricing or 
an individual customer, Smart Tech Bazaar has you covered with 
quality products and excellent service.

Based in Bangalore, serving customers across India.

Contact: smarttechbazaar@gmail.com | +91-6363677588
```

### Screenshots Required

| Device | Size | Quantity |
|--------|------|----------|
| iPhone 6.7" | 1290x2796 | Min 2 |
| iPhone 5.5" | 1242x2208 | Min 2 |
| iPad 12.9" (if supporting) | 2048x2732 | Min 2 |

### App Review Information

**CRITICAL:** Apple will reject without valid test credentials.

- **Sign-in required:** YES
- **Username:** Create test account: `appreviewer@smarttechbazaar.com`
- **Password:** Set a secure password
- **Notes for reviewer:**
  > "Smart Tech Bazaar is a B2B and B2C e-commerce app for computer accessories and IT equipment. Use the provided credentials to browse products, add items to cart, and view order history. Push notifications can be enabled from the notification prompt that appears on first use. Account deletion is available at Dashboard > Security > Delete Account."

### Compliance

- **Export compliance?** YES (HTTPS)
- **Qualifies for exemption?** YES (standard HTTPS qualifies)
- **Account deletion available?** YES at `/dashboard/delete-account`

---

## 9. Pre-Submission Testing Checklist

### Functionality Tests

- [ ] Home page loads correctly
- [ ] Product browsing and search work
- [ ] Category filtering works
- [ ] Add to cart works
- [ ] User registration works
- [ ] User login works (email/password)
- [ ] Google Sign-In works in native app
- [ ] Checkout flow completes
- [ ] Payment (Razorpay) works
- [ ] Order confirmation displays
- [ ] Order history loads in dashboard
- [ ] Support ticket creation works
- [ ] Profile editing works
- [ ] Address management works
- [ ] Password change works
- [ ] Account deletion works (REQUIRED by Apple)
- [ ] Data export works

### Push Notification Tests

- [ ] Permission prompt appears on first launch
- [ ] Push notification received after order placed
- [ ] Push notification received when order shipped
- [ ] Push notification received when ticket replied
- [ ] Tapping notification opens correct page

### Native App Tests

- [ ] App installs correctly
- [ ] Splash screen displays
- [ ] App icon appears correctly
- [ ] Deep links work (`stb://product/...`)
- [ ] Universal links work (website URLs open in app)
- [ ] Back button works correctly on Android
- [ ] Pull to refresh works
- [ ] Offline page appears when no internet
- [ ] App rating dialog appears after 3 sessions

---

## 10. Post-Submission

### After Submitting

- [ ] Monitor review status daily
- [ ] Respond to reviewer questions promptly
- [ ] If rejected, read feedback carefully and fix specific issues

### Typical Review Times

| Platform | First Submission | Updates |
|----------|------------------|---------|
| Google Play | 3-7 business days | 1-3 days |
| Apple App Store | 1-7 days | 1-2 days |

### Common Rejection Reasons & How to Avoid

**Google Play:**
- Privacy policy missing or incomplete → You have it at `/privacy`
- Placeholder content → All content is real
- App provides no value beyond website → You have native features (push, deep links, rating)

**Apple App Store:**
- Missing demo account credentials → Provide test account
- App is just a website wrapper → You have native features
- Login doesn't work → Test thoroughly
- No account deletion → You have it at `/dashboard/delete-account`

### Your Native Features (to mention in store listing)

These justify the app is not just a web wrapper:
- Native push notifications (order updates, support replies)
- Native Google Sign-In
- Native Apple Sign-In (iOS)
- App rating prompts
- Offline handling
- Deep linking support
- Camera access for reviews

---

## Quick Reference

### Console URLs

| Purpose | URL |
|---------|-----|
| Google Play Console | https://play.google.com/console |
| Apple App Store Connect | https://appstoreconnect.apple.com |
| OneSignal Dashboard | https://onesignal.com |
| Firebase Console | https://console.firebase.google.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| Razorpay Dashboard | https://dashboard.razorpay.com |

### App Identifiers

| Platform | Identifier |
|----------|------------|
| Android Package | `com.smarttechbazaar.app` |
| iOS Bundle ID | `com.smarttechbazaar.app` |
| Apple Team ID | `5TGG836W7V` |
| Apple App Store ID | `6766469443` |
| OneSignal App ID | `70c19aa3-9238-4543-acf1-0c564fc4af5a` |
| Firebase Project | `sabkatechbazar` |
| Deep Link Scheme | `stb://` |

### Business Contact

| Info | Value |
|------|-------|
| Email | smarttechbazaar@gmail.com |
| Phone | +91-6363677588 |
| Address | 2nd Floor, No. 94/1, Behind Sharda Theater, SP Road, Bangalore 560002 |
| Facebook | https://www.facebook.com/profile.php?id=61588955768910 |
| Instagram | https://www.instagram.com/smarttechbazaar_india/ |
| LinkedIn | https://www.linkedin.com/company/smarttechbazaar/ |

### Key Files

| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA manifest |
| `public/.well-known/assetlinks.json` | Android App Links |
| `public/.well-known/apple-app-site-association` | iOS Universal Links |
| `public/icons/icon-512x512.png` | App store icon |
| `public/splash/` | iOS splash screens |
| `lib/site-config.ts` | Business/SEO configuration |
| `lib/push-notifications.ts` | Server-side push notifications |
| `lib/native-app.ts` | Native app detection & features |
| `hooks/use-app-rating.ts` | App rating prompts |
