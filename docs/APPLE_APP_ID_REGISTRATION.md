# Apple App ID Registration Guide for STB App (Median.co Wrapper)

**Last Updated:** May 2025

## CURRENT STATUS: READY FOR SUBMISSION

Your app is fully configured and ready for App Store submission.

---

## Configuration Summary

### Apple Developer Account

| Setting | Value | Status |
|---------|-------|--------|
| Team ID | `5TGG836W7V` | CONFIGURED |
| Bundle ID | `com.smarttechbazaar.app` | CONFIGURED |
| App Store ID | `6766469443` | CONFIGURED |

### Capabilities Enabled

| Capability | Status | Purpose |
|------------|--------|---------|
| Push Notifications | DONE | Order updates, support replies via OneSignal |
| Associated Domains | DONE | Universal links from website to app |

### OneSignal Push Notifications

| Platform | Status |
|----------|--------|
| iOS (APNs) | DONE |
| Android (FCM) | DONE |
| Web Push | DONE |

---

## App Store Requirements - All Met

### Legal Pages

| Requirement | URL | Status |
|-------------|-----|--------|
| Privacy Policy | `/privacy` | DONE |
| Terms & Conditions | `/terms` | DONE |
| Account Deletion | `/dashboard/delete-account` | DONE (Apple Requirement) |

### Technical Files

| File | Location | Status |
|------|----------|--------|
| Apple App Site Association | `/.well-known/apple-app-site-association` | DONE |
| PWA Manifest | `/manifest.json` | DONE |
| App Icons | `/icons/` | DONE |
| Splash Screens | `/splash/` | DONE |

---

## App Store Submission Checklist

### Step 1: App Store Connect Setup

- [x] Apple Developer Account active
- [x] App created in App Store Connect
- [x] Bundle ID registered: `com.smarttechbazaar.app`
- [x] Team ID configured: `5TGG836W7V`

### Step 2: App Information

Fill in App Store Connect:

| Field | Value |
|-------|-------|
| App Name | Smart Tech Bazaar |
| Subtitle | Tech Products & IT Solutions |
| Category | Shopping (Primary) |
| Secondary Category | Business (Optional) |
| Age Rating | 4+ |
| Price | Free |

### Step 3: Description & Keywords

**App Store Description:**
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
```

**Keywords (max 100 characters):**
```
tech,computer,laptop,cctv,networking,printer,accessories,b2b,wholesale,it,bangalore
```

### Step 4: URLs

| Field | URL |
|-------|-----|
| Privacy Policy | `https://smarttechbazaar.com/privacy` |
| Support URL | `https://smarttechbazaar.com/about` |
| Marketing URL | `https://smarttechbazaar.com` (optional) |

### Step 5: Screenshots Required

| Device | Size | Quantity |
|--------|------|----------|
| iPhone 6.7" (Pro Max) | 1290x2796 | Min 2 |
| iPhone 5.5" (8 Plus) | 1242x2208 | Min 2 |
| iPad 12.9" (if supporting) | 2048x2732 | Min 2 |

### Step 6: App Review Information

**CRITICAL - Provide Test Credentials:**

| Field | Value |
|-------|-------|
| Sign-in required | YES |
| Demo Username | `appreviewer@smarttechbazaar.com` |
| Demo Password | (create a secure password) |

**Review Notes:**
```
Smart Tech Bazaar is a B2B and B2C e-commerce app for computer 
accessories and IT equipment in India.

To test the app:
1. Use the provided credentials to sign in
2. Browse products and add items to cart
3. Complete checkout (test mode - no real charges)
4. View order history in Dashboard > Orders
5. Test account deletion at Dashboard > Security > Delete Account

Push notifications can be enabled from the prompt that appears 
on first use. The app supports native Google Sign-In and 
Apple Sign-In.

Contact for questions: smarttechbazaar@gmail.com
```

### Step 7: Export Compliance

| Question | Answer |
|----------|--------|
| Uses encryption? | YES |
| Is it exempt? | YES (standard HTTPS only) |

### Step 8: Build Upload

1. Export `.ipa` from Median.co
2. Upload via Transporter (Mac app) or Application Loader
3. Wait for processing (15-30 minutes)
4. Select build in App Store Connect
5. Submit for review

---

## Common Rejection Reasons & Solutions

### 1. "Minimum Functionality" (Guideline 4.2)

**Problem:** App is just a website wrapper without native features.

**Your Solution:** Your app has these native features:
- Native push notifications (OneSignal)
- Native Google Sign-In
- Native Apple Sign-In
- Deep linking (`stb://`)
- Universal links
- Offline handling
- App rating prompts
- Pull to refresh

### 2. "Missing Account Deletion" (Guideline 5.1.1)

**Problem:** Users can't delete their accounts.

**Your Solution:** Account deletion is available at `/dashboard/delete-account` with full data removal.

### 3. "Sign In with Apple Missing" (Guideline 4.8)

**Problem:** App has Google login but no Apple login.

**Your Solution:** You have both Google and Apple Sign-In configured.

### 4. "Privacy Policy Link Missing"

**Problem:** No privacy policy accessible.

**Your Solution:** Privacy Policy at `/privacy` with comprehensive data handling disclosure.

### 5. "Missing Test Credentials"

**Problem:** Reviewer can't test the app.

**Your Solution:** Always provide valid test account credentials in App Review Information.

---

## After Approval

### TestFlight (Recommended)

Before public release:
1. Add internal testers in App Store Connect
2. Test on real devices
3. Verify push notifications work
4. Test deep links
5. Confirm payment flow (test mode)

### Release Options

| Option | Description |
|--------|-------------|
| Manual Release | You control when the app goes live |
| Automatic Release | Goes live immediately after approval |
| Scheduled Release | Goes live at a specific date/time |

### Monitoring

After release:
- Monitor crash reports in App Store Connect
- Respond to user reviews
- Track download analytics

---

## Quick Reference

### Key Identifiers

| Identifier | Value |
|------------|-------|
| Bundle ID | `com.smarttechbazaar.app` |
| Team ID | `5TGG836W7V` |
| App Store ID | `6766469443` |
| OneSignal App ID | `70c19aa3-9238-4543-acf1-0c564fc4af5a` |
| Deep Link Scheme | `stb://` |

### URLs to Verify Before Submission

```
https://smarttechbazaar.com/.well-known/apple-app-site-association
https://smarttechbazaar.com/privacy
https://smarttechbazaar.com/terms
https://smarttechbazaar.com/api/health
```

### Support Resources

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Developer Support: https://developer.apple.com/support/
- Median.co Documentation: https://median.co/docs
- OneSignal iOS Setup: https://documentation.onesignal.com/docs/ios-sdk-setup

---

## Business Contact Information

| Info | Value |
|------|-------|
| Email | smarttechbazaar@gmail.com |
| Phone | +91-6363677588 |
| Address | 2nd Floor, No. 94/1, Behind Sharda Theater, SP Road, Bangalore 560002 |
| Website | https://smarttechbazaar.com |
