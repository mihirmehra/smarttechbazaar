# NoIndex Removal Guide

This document lists all locations where noindex/nofollow directives have been added to prevent Google and other search engines from indexing your site before products and brands are added.

**When to remove:** After you have added your products and brands and the site is ready for public discovery.

---

## Files to Update

### 1. `app/robots.ts`

**Location:** Line 7

**Current Code:**
```typescript
const BLOCK_ALL_CRAWLERS = true;
```

**Change To:**
```typescript
const BLOCK_ALL_CRAWLERS = false;
```

**What this does:** When `true`, it tells all search engine crawlers to not index any page on your site. When `false`, it uses the detailed rules that allow indexing of public pages while blocking admin, cart, checkout, etc.

---

### 2. `app/layout.tsx`

**Location:** Lines 64-69 (inside the `metadata` export)

**Current Code:**
```typescript
robots: {
  index: false, // TODO: Change to true after adding products and brands
  follow: false, // TODO: Change to true after adding products and brands
  googleBot: {
    index: false, // TODO: Change to true after adding products and brands
    follow: false, // TODO: Change to true after adding products and brands
  },
},
```

**Change To:**
```typescript
robots: {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
  },
},
```

**What this does:** The metadata robots directive adds `<meta name="robots" content="noindex, nofollow">` to every page. Changing to `true` allows search engines to index and follow links on your pages.

---

## Quick Removal Steps

1. Open `app/robots.ts`
2. Change line 7 from `const BLOCK_ALL_CRAWLERS = true;` to `const BLOCK_ALL_CRAWLERS = false;`
3. Open `app/layout.tsx`
4. Find the `robots` object in metadata (around line 64)
5. Change all `false` values to `true`
6. Deploy your changes
7. Submit your sitemap to Google Search Console: `https://yourdomain.com/sitemap.xml`
8. Delete this file (NOINDEX-REMOVAL-GUIDE.md) from your project

---

## Verification After Removal

After making these changes and deploying:

1. Visit `https://yourdomain.com/robots.txt` - should show `Allow: /` for most paths
2. Check page source for `<meta name="robots">` - should show `index, follow`
3. Use Google Search Console to request indexing of your homepage
4. Use the "URL Inspection" tool in Search Console to verify pages are indexable

---

## Files Summary

| File | Line | Change |
|------|------|--------|
| `app/robots.ts` | 7 | `BLOCK_ALL_CRAWLERS = true` → `false` |
| `app/layout.tsx` | 64-69 | `index: false` → `true`, `follow: false` → `true` |
