# iOS App Store Compliance Checklist

This document tracks compliance with Apple's App Store Review Guidelines for the Smart Tech Bazaar iOS app.

## Guideline 2.1(a) - Performance - App Completeness (RESOLVED)

**Status:** FIXED (May 30, 2026)

**Issue:** Apple reported "An error occurred when using Sign in with Apple" on iPad Air 11-inch (M3).

**Root Cause:** Two bugs were identified:
1. User model required password for Apple users (validation error: "Path `password` is required")
2. Email retrieval flow failed when Apple hid the email on subsequent sign-ins

**Resolution:**
1. Fixed `models/User.ts` - Password is now optional for OAuth users (Google OR Apple)
2. Improved `lib/auth.ts` - Better handling of Apple's privacy features and user lookup

---

## Guideline 4.8 - Login Services (RESOLVED)

**Status:** IMPLEMENTED (Updated May 26, 2026)

**Issue:** Apple rejected the app because it used Google Sign-In without offering Sign in with Apple as an equivalent option.

**Resolution:** Sign in with Apple has been implemented and is now **visible to ALL users** (both native app and web), not just native app users. This ensures Apple's review team can see the button when testing.

### Implementation Details

1. **User Model** (`models/User.ts`)
   - Added `appleId` field to store Apple's unique user identifier
   - Field is indexed with sparse option for efficient lookups

2. **Authentication Provider** (`lib/auth.ts`)
   - Added Apple credentials provider with ID `apple`
   - Handles user creation, account linking, and session management
   - Apple users are automatically marked as email verified

3. **Login Page** (`app/auth/login/page.tsx`)
   - **Sign in with Apple button is ALWAYS displayed** (not hidden behind native app check)
   - Uses Apple Sign-In JS SDK for web browsers
   - Uses Median.co's native Social Login plugin for native app
   - Button appears immediately after Google button

4. **Register Page** (`app/auth/register/page.tsx`)
   - **Sign up with Apple button is ALWAYS displayed**
   - Same authentication flow as login page

5. **Native App Integration** (`lib/native-app.ts`)
   - `nativeAppleSignIn()` function handles native Apple Sign-In via Median.co
   - Properly decodes identity tokens to extract user information
   - Handles Apple's privacy features (hidden email relay)

### Apple's Requirements Met

- [x] Login option limits data collection to user's name and email
- [x] Login option allows users to keep email private (Apple's Hide My Email)
- [x] Login option does not collect interactions for advertising without consent
- [x] Sign in with Apple is displayed as prominently as Google Sign-In
- [x] **Button is visible to ALL users, including web/simulator testing**

---

## What You Need To Do

### 1. Apple Developer Account Setup (REQUIRED)

Go to [developer.apple.com](https://developer.apple.com) and:

1. **Create/Configure App ID:**
   - Go to Certificates, Identifiers & Profiles > Identifiers
   - Select your App ID or create new one
   - Enable "Sign in with Apple" capability
   - Save changes

2. **Create Services ID (for web Sign in with Apple):**
   - Go to Identifiers > Click "+" > Select "Services IDs"
   - Description: "Smart Tech Bazaar Web"
   - Identifier: `com.sabkatechbazar.web` (or your chosen ID)
   - Enable "Sign in with Apple"
   - Configure domains:
     - Domains: `sabkatechbazar.com`, `www.sabkatechbazar.com`
     - Return URLs: `https://sabkatechbazar.com/api/auth/callback/apple`
   - Save

3. **Create Private Key:**
   - Go to Keys > Click "+"
   - Name: "Sign in with Apple Key"
   - Enable "Sign in with Apple"
   - Configure with your primary App ID
   - Download the key file (.p8) and save the Key ID

### 2. Environment Variables (REQUIRED)

Add these to your Vercel project and `.env`:

```
NEXT_PUBLIC_APPLE_CLIENT_ID=com.sabkatechbazar.web
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### 3. Median.co Dashboard Setup

1. Go to your app in Median.co dashboard
2. Navigate to Native Plugins > Social Login
3. Enable Apple Sign-In
4. Ensure your Bundle ID matches your Apple Developer App ID

### 4. Update App Store Screenshots

**IMPORTANT:** Apple specifically mentioned updating screenshots. You must:

1. Take new screenshots showing the Apple button on:
   - Login screen (mobile view)
   - Register screen (mobile view)
2. Upload to App Store Connect
3. Replace old screenshots

### 5. Pre-Submission Testing

Before resubmitting:

- [ ] Test Sign in with Apple on a real iOS device
- [ ] Verify button appears on BOTH login and register screens
- [ ] Test complete sign-up flow with a new Apple ID
- [ ] Test sign-in with existing Apple account
- [ ] Test "Hide My Email" feature
- [ ] Test account linking (same email, different provider)
- [ ] Verify error messages are user-friendly

---

## Response to App Review

When resubmitting, include this note in App Store Connect:

> Thank you for your feedback. We have implemented Sign in with Apple as an equivalent login option to Google Sign-In, in full compliance with Guideline 4.8. 
>
> Changes made:
> 1. Sign in with Apple button is now prominently displayed on both login and registration screens
> 2. The button is visible to all users (web and native app)
> 3. Users can sign up or sign in using their Apple ID
> 4. Apple's "Hide My Email" privacy feature is fully supported
> 5. We have updated our App Store screenshots to reflect this change
>
> Sign in with Apple meets all requirements specified in Guideline 4.8:
> - Limits data collection to name and email
> - Allows users to keep email private
> - Does not collect interactions for advertising
>
> Please let us know if you need any additional information.

---

## Technical Notes

### How Apple Sign-In Works

**In Native App (Median.co):**
1. User taps "Continue with Apple"
2. Native Apple Sign-In sheet appears
3. User authenticates with Face ID/Touch ID
4. App receives identity token with user info
5. Token sent to backend for account creation/login

**In Web Browser:**
1. User clicks "Continue with Apple"
2. Apple Sign-In JS SDK loads
3. Apple popup appears for authentication
4. App receives authorization code and id_token
5. Token sent to backend for account creation/login

### Privacy Features

- Apple can provide a private relay email (e.g., `abc123@privaterelay.appleid.com`)
- This email still works for communication
- User's real email is hidden from the app
- App handles this gracefully

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-30 | 1.0.3 | Fixed: Password validation error for Apple users, improved email handling |
| 2026-05-26 | 1.0.2 | Fixed: Apple button now visible to ALL users (web + native) |
| 2026-05-21 | 1.0.1 | Added Sign in with Apple for Guideline 4.8 compliance |

---

## Contact

For questions about iOS compliance, contact the development team.
