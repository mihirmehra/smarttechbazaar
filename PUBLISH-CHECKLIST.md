# Smart Tech Bazaar - Final Publishing Checklist

Use this checklist to verify everything is ready before submitting to app stores.

**Last Updated:** May 2025

---

## CONFIGURATION STATUS

### Completed

- [x] `manifest.json` - PWA manifest configured with PNG icons
- [x] `assetlinks.json` - Android App Links with SHA-256 fingerprint
- [x] `apple-app-site-association` - iOS Universal Links with Team ID: `5TGG836W7V`
- [x] `/api/health` - Health check endpoint working
- [x] Splash screens - All 8 iOS splash screen sizes (PNG)
- [x] App icons - PNG icons (192x192, 512x512)
- [x] OG Image - 1200x630 social sharing image
- [x] robots.txt - Configured via `app/robots.ts`
- [x] sitemap.xml - Dynamic sitemap via `app/sitemap.ts`
- [x] Privacy Policy page - `/privacy`
- [x] Terms of Service page - `/terms`
- [x] Shipping Policy page - `/shipping`
- [x] Account Deletion page - `/dashboard/delete-account` (Apple requirement)
- [x] OneSignal configured - App ID: `70c19aa3-9238-4543-acf1-0c564fc4af5a`
- [x] FCM configured - Firebase Cloud Messaging for Android push
- [x] iOS APNs configured - Apple Push Notification service in OneSignal
- [x] Server-side push notifications - Integrated with order/ticket flows
- [x] Native app detection - `lib/native-app.ts`
- [x] Deep linking - URL scheme `stb://`
- [x] App rating dialog - Prompts after 3 sessions
- [x] Apple App Store ID - `6766469443` in `hooks/use-app-rating.ts`
- [x] Offline page - `/offline`
- [x] Error handling - `error.tsx`, `not-found.tsx`
- [x] Google Sign-In - Native and web fallback
- [x] Business contact info - Updated in `lib/site-config.ts`
- [x] Social media links - Facebook, Instagram, LinkedIn in Footer

### Pending (Before Production)

- [ ] Production Razorpay keys - Replace test keys with live keys
- [ ] Production NextAuth secret - Generate secure secret
- [ ] Enable SEO indexing - Change `index: false` to `index: true`

---

## ENVIRONMENT VARIABLES CHECKLIST

### Vercel Production Environment

| Variable | Status | Action |
|----------|--------|--------|
| `MONGODB_URI` | Set | Verify working |
| `IMAGEKIT_URL_ENDPOINT` | Set | Verify working |
| `IMAGEKIT_PUBLIC_KEY` | Set | Verify working |
| `IMAGEKIT_PRIVATE_KEY` | Set | Verify working |
| `NEXTAUTH_SECRET` | CHANGE | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | CHANGE | Set to `https://smarttechbazaar.com` |
| `NEXT_PUBLIC_SITE_URL` | ADD | Set to `https://smarttechbazaar.com` |
| `NEXT_PUBLIC_FIREBASE_*` | Set | Verify working |
| `RAZORPAY_KEY_ID` | CHANGE | Replace with live key (`rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | CHANGE | Replace with live secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | CHANGE | Replace with live key |
| `BLOB_READ_WRITE_TOKEN` | Set | Verify working |
| `ONESIGNAL_APP_ID` | Set | `70c19aa3-9238-4543-acf1-0c564fc4af5a` |
| `ONESIGNAL_REST_API_KEY` | Set | Configured |

---

## PRE-DEPLOYMENT CHECKLIST

### Domain & SSL

- [ ] Domain connected to Vercel
- [ ] SSL certificate active (automatic)
- [ ] All URLs accessible over HTTPS

### Test These URLs After Deployment

```
https://smarttechbazaar.com/                              → Home page
https://smarttechbazaar.com/manifest.json                 → JSON response
https://smarttechbazaar.com/.well-known/assetlinks.json   → JSON response
https://smarttechbazaar.com/.well-known/apple-app-site-association → JSON response
https://smarttechbazaar.com/api/health                    → {"status":"ok",...}
https://smarttechbazaar.com/privacy                       → Privacy policy page
https://smarttechbazaar.com/terms                         → Terms page
https://smarttechbazaar.com/dashboard/delete-account      → Account deletion (logged in)
```

---

## FUNCTIONALITY TESTING

### Core Shopping Flow

- [ ] Browse products
- [ ] View product detail
- [ ] Add to cart
- [ ] View cart
- [ ] Apply coupon code
- [ ] Proceed to checkout
- [ ] Select/add address
- [ ] Complete payment (Razorpay)
- [ ] View order confirmation
- [ ] Receive confirmation email

### User Account

- [ ] Register new account
- [ ] Login with email/password
- [ ] Login with Google
- [ ] View dashboard
- [ ] View order history
- [ ] View order detail
- [ ] Cancel order (if eligible)
- [ ] Download invoice
- [ ] Edit profile
- [ ] Change password
- [ ] Manage addresses
- [ ] Export data
- [ ] Delete account (REQUIRED by Apple)

### Support System

- [ ] Create support ticket
- [ ] View ticket list
- [ ] Reply to ticket
- [ ] Receive admin replies

### Push Notifications

- [ ] Permission prompt appears
- [ ] Order placed notification received
- [ ] Order shipped notification received
- [ ] Ticket reply notification received
- [ ] Notification opens correct page

### Native App Features (Test in Median.co app)

- [ ] App opens without white screen
- [ ] Splash screen displays
- [ ] Google Sign-In works natively
- [ ] Deep links work (`stb://product/...`)
- [ ] Universal links work
- [ ] Pull to refresh works
- [ ] Back button works (Android)
- [ ] Offline page appears when disconnected
- [ ] App rating dialog appears after 3 sessions

---

## GOOGLE PLAY STORE CHECKLIST

### Store Listing

- [ ] App name: **Smart Tech Bazaar** (max 30 chars)
- [ ] Short description (max 80 chars)
- [ ] Full description (4000 chars)
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Phone screenshots (min 2)
- [ ] Tablet screenshots (if supporting)
- [ ] Privacy policy URL: `https://smarttechbazaar.com/privacy`
- [ ] Category: Shopping

### App Content (Policy)

- [ ] Privacy policy entered
- [ ] Ads declaration (No ads)
- [ ] App access: Test credentials provided
- [ ] Content rating completed
- [ ] Target audience: 13+
- [ ] Data safety form completed

### Release

- [ ] Internal testing completed
- [ ] Production release created
- [ ] `.aab` file uploaded
- [ ] Release notes written
- [ ] Submitted for review

---

## APPLE APP STORE CHECKLIST

### App Store Connect

- [x] App created with Bundle ID: `com.smarttechbazaar.app`
- [x] Team ID: `5TGG836W7V`
- [x] Apple App Store ID: `6766469443`
- [ ] SKU set

### App Information

- [ ] App name: **Smart Tech Bazaar**
- [ ] Subtitle (max 30 chars): **Tech Products & IT Solutions**
- [ ] Description
- [ ] Keywords (max 100 chars)
- [ ] Category: Shopping
- [ ] Privacy policy URL: `https://smarttechbazaar.com/privacy`
- [ ] Support URL: `https://smarttechbazaar.com/about`

### Screenshots

- [ ] iPhone 6.7" (1290x2796) - min 2
- [ ] iPhone 5.5" (1242x2208) - min 2
- [ ] iPad 12.9" (2048x2732) - if supporting iPad

### App Review Information

- [ ] Sign-in required: YES
- [ ] Demo username provided
- [ ] Demo password provided
- [ ] Review notes written

### Build

- [x] APNs key uploaded to OneSignal
- [ ] `.ipa` uploaded via Transporter
- [ ] Build processed
- [ ] Build selected
- [ ] Submitted for review

### Compliance

- [ ] Export compliance answered (Yes - HTTPS)
- [ ] Age rating completed
- [ ] Account deletion available (REQUIRED)

---

## ONESIGNAL PLATFORM STATUS

| Platform | Configuration | Status |
|----------|---------------|--------|
| Web Push | Dashboard | DONE |
| Android (FCM) | Firebase Server Key | DONE |
| iOS (APNs) | `.p8` key upload | DONE |

---

## POST-SUBMISSION

- [ ] Monitor review status
- [ ] Respond to reviewer questions within 24 hours
- [ ] If rejected, read feedback and fix specific issues
- [ ] Plan for review times: Google (3-7 days), Apple (1-7 days)

---

## QUICK REFERENCE

### Console URLs

| Service | URL |
|---------|-----|
| Google Play Console | https://play.google.com/console |
| App Store Connect | https://appstoreconnect.apple.com |
| OneSignal | https://onesignal.com |
| Firebase | https://console.firebase.google.com |
| Vercel | https://vercel.com/dashboard |
| Razorpay | https://dashboard.razorpay.com |

### App Identifiers

| Identifier | Value |
|------------|-------|
| Android Package | `com.smarttechbazaar.app` |
| iOS Bundle ID | `com.smarttechbazaar.app` |
| Apple Team ID | `5TGG836W7V` |
| Apple App Store ID | `6766469443` |
| OneSignal App ID | `70c19aa3-9238-4543-acf1-0c564fc4af5a` |
| Deep Link Scheme | `stb://` |
| Theme Color | `#E31837` |
| Background Color | `#FFFFFF` |

### Business Contact

| Info | Value |
|------|-------|
| Email | smarttechbazaar@gmail.com |
| Phone | +91-6363677588 |
| Address | 2nd Floor, No. 94/1, Behind Sharda Theater, SP Road, Bangalore 560002 |

### Social Media

| Platform | URL |
|----------|-----|
| Facebook | https://www.facebook.com/profile.php?id=61588955768910 |
| Instagram | https://www.instagram.com/smarttechbazaar_india/ |
| LinkedIn | https://www.linkedin.com/company/smarttechbazaar/ |
