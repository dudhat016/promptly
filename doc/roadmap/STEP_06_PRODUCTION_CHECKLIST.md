# Step 06 — Production Readiness Checklist
> Type: Operations — Pre-Launch Verification
> Prerequisite: All items in STEP_01 through STEP_05 must be complete before running this checklist.
> Reference: `DEPLOYMENT.md` for infrastructure setup, `security_spec.md` for Firestore rules.

---

## How to Use This File

Work through each category from top to bottom. Check each item only after you have **verified it yourself** — not just implemented it. "Done" means tested in a production-like environment (Vercel preview or production), not just locally.

---

## Phase 1 — Performance

### 6.1 Bundle Size Audit

**Target:** JS initial bundle < 250KB gzipped. Lazy-load all page-level components.

**Steps:**

1. Run production build and analyze:
   ```bash
   npm run build
   npx vite-bundle-visualizer
   ```
   Open `stats.html` in browser — look for large chunks that should be code-split.

2. Verify page-level lazy loading in `App.tsx`:
   - All page imports use `React.lazy(() => import('./pages/...'))`
   - A `<Suspense fallback={<PageSkeleton />}>` wraps the router
   - Admin pages are in a **separate chunk** — never loaded for regular users

3. Verify font loading does not block render:
   - All Google Fonts have `font-display: swap` in `index.html`
   - Fonts are preconnected: `<link rel="preconnect" href="https://fonts.googleapis.com">`
   - Only 3 weights per font: 400, 500, 600

4. Check dynamic CSS variables from `UIProvider`:
   - `applyTokens()` runs synchronously before first paint (not in a `useEffect`)
   - CSS variables are set on `<html>` before any child renders → no FOUC

**Acceptance criteria:**
- [ ] Initial JS bundle < 250KB gzipped (verified with vite-bundle-visualizer)
- [ ] No page-level component loaded eagerly
- [ ] Admin bundle never included in user-facing chunk
- [ ] Google Fonts load without FOUT (flash of unstyled text)
- [ ] No layout shift from late CSS variable application

---

### 6.2 Core Web Vitals

**Target:** LCP < 2.5s, INP < 200ms, CLS < 0.1

**Steps:**

1. Deploy to Vercel preview branch.
2. Run Lighthouse CI against the preview URL:
   - LandingPage (most critical for ThemeForest demos)
   - ExplorePage
   - PricingPage
3. Fix any LCP issue:
   - Hero image should have `loading="eager"` and `fetchpriority="high"`
   - Hero image served as WebP
4. Fix any CLS issue:
   - All images have explicit `width` and `height` (or `aspect-ratio` CSS)
   - Fonts use `font-display: swap` (as above)
   - `AnnouncementBanner` does not push layout — it uses a CSS `min-height` reservation

5. Fix any INP issue:
   - Heavy click handlers (AI generation, payment flow) show loading state immediately
   - `CustomizerDrawer` slider interactions use `useTransition` or `startTransition` for non-urgent updates

**Acceptance criteria:**
- [ ] Lighthouse Performance score ≥ 85 on LandingPage
- [ ] LCP < 2.5s on desktop (fast 3G equivalent)
- [ ] INP < 200ms on Customizer slider interactions
- [ ] CLS < 0.1 on all public pages

---

### 6.3 Image Optimization

**Steps:**

1. All images in `public/` folder:
   - Convert PNG/JPEG to WebP format
   - Provide `2x` version for retina: `logo.webp` (1x) + `logo@2x.webp` (2x)
   - Use `<img srcset="logo.webp 1x, logo@2x.webp 2x">` pattern

2. User-uploaded images (Hostinger FTP):
   - Test upload via Admin → Settings → Storage → Test Connection
   - Confirm a test upload returns a working public URL
   - Confirm the image is accessible in browser without auth

3. AI-generated images:
   - Stored in Hostinger under `promptly/public/creative_suite/`
   - URL returned by `/api/upload-ftp` is publicly accessible
   - If Firestore `configs/ftp.enabled` is `false`, uploads return a clear error

**Acceptance criteria:**
- [ ] All static images in public/ are WebP
- [ ] No image missing width/height attributes
- [ ] FTP test connection succeeds from Admin Panel
- [ ] Uploaded images are publicly reachable via the FTP_ENDPOINT URL
- [ ] AI gallery images load without CORS errors

---

## Phase 2 — Security

### 6.4 Firestore Rules Verification

Run each of the 12 security scenarios from `security_spec.md` against the **production Firestore project** (not the emulator).

**Setup:**
```bash
firebase use promptly-prod
firebase emulators:start --only firestore,auth
```

**Run the dirty dozen:**

| # | Scenario | Expected result |
|---|---|---|
| 1 | Set `role: 'admin'` as normal user | DENIED |
| 2 | Update another user's prompt | DENIED |
| 3 | Read paid prompt content as free user | DENIED |
| 4 | Set `subscriptionStatus: 'pro'` from client | DENIED |
| 5 | Create prompt with fake `creatorId` | DENIED |
| 6 | Inject 1MB string into prompt title | DENIED (size validation) |
| 7 | Delete a category as non-admin | DENIED |
| 8 | List all `users` documents | DENIED |
| 9 | Update `createdAt` on a prompt | DENIED |
| 10 | Create favorite for another user's ID | DENIED |
| 11 | Manually update `likesCount` | DENIED |
| 12 | Create user profile as another UID | DENIED |

**Acceptance criteria:**
- [ ] All 12 dirty dozen scenarios are denied as expected
- [ ] `firebase deploy --only firestore:rules` succeeds with no warnings
- [ ] Storage rules deployed and tested for user uploads

---

### 6.5 API Security Verification

**Steps:**

1. Test each API endpoint without an auth token → expect `401`.
2. Test admin-only endpoints with a regular user token → expect `403`.
3. Verify rate limiting is active:
   ```bash
   for i in {1..20}; do curl -X POST https://your-domain.com/api/payments/create-order; done
   ```
   Should receive `429` after 10 rapid requests.
4. Verify Cashfree webhook HMAC validation:
   - Send a request to `/api/payments/webhook` with an invalid signature → expect `400`.
5. Check response headers with:
   ```bash
   curl -I https://your-domain.com
   ```
   Verify presence of: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`.

**Acceptance criteria:**
- [ ] All unauthenticated requests to protected endpoints return `401`
- [ ] Non-admin users get `403` on admin endpoints
- [ ] Rate limiter returns `429` after threshold
- [ ] Webhook rejects invalid HMAC signature
- [ ] Security headers present on all responses

---

### 6.6 Environment Variable Audit

Run this checklist against Vercel project settings:

- [ ] `VITE_FIREBASE_*` — all 6 Firebase config values present
- [ ] `FIREBASE_SERVICE_ACCOUNT` — base64-encoded JSON, no newlines
- [ ] `FTP_SERVER` + `FTP_USERNAME` + `FTP_PASSWORD` — Hostinger FTP credentials
- [ ] `FTP_FOLDER` + `FTP_ENDPOINT` — correct path and public URL base
- [ ] `CASHFREE_APP_ID` + `CASHFREE_SECRET_KEY` — **production** credentials (not sandbox)
- [ ] `CASHFREE_ENV=production` — not `sandbox`
- [ ] `APP_URL` — custom domain (not Vercel preview URL)
- [ ] `NODE_ENV=production` — set explicitly

**Verify no secrets in frontend bundle:**
```bash
npm run build
grep -r "CASHFREE_SECRET_KEY\|FIREBASE_SERVICE_ACCOUNT" dist/
```
Should return no results. If anything matches, a `VITE_` prefix was accidentally added to a server-only var.

**Acceptance criteria:**
- [ ] All required env vars present in Vercel
- [ ] No server-side secrets in the built JS bundle
- [ ] Vercel preview environments use separate Firebase project (not production)

---

## Phase 3 — Functionality

### 6.7 Auth Flow End-to-End

Test in a fresh incognito window:

- [ ] Register with email → confirmation email received → account created
- [ ] Login with email → redirected to `/onboarding` on first login
- [ ] Complete onboarding → redirected to `/dashboard`
- [ ] Logout → redirected to `/login`
- [ ] Forgot password → reset email received → can set new password
- [ ] Google OAuth login works end-to-end
- [ ] Admin login at `/login` → can access `/admin/*`
- [ ] Non-admin accessing `/admin/*` → redirected to `/403`

---

### 6.8 Payment Flow End-to-End

**Use Cashfree sandbox first, then repeat with production:**

- [ ] Click upgrade on PricingPage → Cashfree checkout opens
- [ ] Complete payment (use test card: `4111 1111 1111 1111`)
- [ ] Return to app → `subscriptionStatus` updated to `pro` in Firestore
- [ ] User vault and pro features unlocked immediately
- [ ] Subscription confirmation appears in BillingSettings
- [ ] Cancel subscription → `canceledAt` recorded, access continues until period end

---

### 6.9 AI Integration End-to-End

- [ ] Navigate to `/settings/ai` → add Gemini API key
- [ ] "Test Connection" button returns success
- [ ] Navigate to `/dashboard/ai-studio`
- [ ] Upload reference images → generate image → result displays
- [ ] Generated image auto-saved to gallery
- [ ] Invalid API key → clear error message shown (not a blank crash)

---

### 6.10 Error States

Test each error page renders correctly:

- [ ] Navigate to a non-existent URL → `NotFoundPage` (404) renders
- [ ] Log in as non-admin, navigate to `/admin` → `ForbiddenPage` (403) renders
- [ ] Enable maintenance mode in AdminSettings → non-admin sees `MaintenancePage`
- [ ] Admin sees site normally during maintenance mode
- [ ] `ComponentErrorBoundary` catches render errors (test by temporarily throwing in a component)

---

## Phase 4 — SEO & Discoverability

### 6.11 Meta Tags & Schema

- [ ] All public pages have unique `<title>` and `<meta name="description">`
- [ ] LandingPage has `og:title`, `og:description`, `og:image` (1200×630px)
- [ ] BlogDetailPage generates correct `og:*` per post
- [ ] `Schema.tsx` component renders valid JSON-LD (test with Google Rich Results Test)
- [ ] `robots.txt` exists at `/robots.txt` and does not disallow all crawlers
- [ ] `sitemap.xml` exists at `/sitemap.xml` with all public URLs

**Verify sitemap:**
```bash
curl https://your-domain.com/sitemap.xml
```

---

### 6.12 i18n & RTL

- [ ] Language switcher works in the Customizer
- [ ] All 5 languages render without broken UI (EN, HI, AR, ES, FR)
- [ ] Arabic (AR) triggers RTL layout: sidebar on right, text right-aligned
- [ ] RTL toggle in Customizer sets `dir="rtl"` on `<html>` element
- [ ] Icons are mirrored correctly in RTL (directional icons use `DirectionalIcon` component)
- [ ] No hardcoded LTR-only CSS (`margin-left`, `padding-right` → use logical properties)

---

## Phase 5 — Accessibility

### 6.13 Keyboard & Screen Reader

- [ ] All interactive elements are reachable via `Tab`
- [ ] Focus ring is visible on all focusable elements (not `outline: none` without a replacement)
- [ ] Modals trap focus within them when open
- [ ] Modals close on `Escape` key
- [ ] `Alert` component uses `role="alert"` for errors, `role="status"` for success
- [ ] Icon-only buttons have `aria-label` or `Tooltip` with descriptive label
- [ ] Form inputs have associated `<label>` elements (not just placeholder text)
- [ ] Color contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text (verify with axe DevTools)

---

## Phase 6 — Analytics & Observability

### 6.14 Analytics Setup

- [ ] Google Analytics 4 fires only after cookie consent (`analytics: true`)
- [ ] Facebook Pixel fires only after marketing consent
- [ ] Key conversion events tracked: `sign_up`, `subscription_purchased`, `prompt_unlocked`
- [ ] Test events visible in GA4 DebugView before going live

### 6.15 Error Monitoring (Recommended)

- [ ] Sentry (or equivalent) initialized in `src/main.tsx`
- [ ] Uncaught errors are captured with user context (uid, plan)
- [ ] Sentry source maps uploaded on deploy (Vercel Sentry integration)

---

## Phase 7 — Marketplace-Specific

### 6.16 Demo Environment

The ThemeForest demo must be a clean, fully functional installation.

- [ ] Demo Firebase project is **separate** from production (no real user data)
- [ ] Demo seeded with realistic data:
  - 20+ prompts across 5+ categories
  - 3 sample blog posts (published)
  - 3 user accounts: admin / pro user / free user
  - Credentials documented in `README.md`
- [ ] Admin demo credentials: `admin@promptly.com` / `admin123`
- [ ] Pro user credentials: `pro@promptly.com` / `demo123`
- [ ] Free user credentials: `free@promptly.com` / `demo123`
- [ ] All 5 customizer presets look great (screenshot each for item preview)

### 6.17 Buyer Documentation

- [ ] `README.md` updated with:
  - Installation steps (Firebase setup + Vercel deploy)
  - Environment variable list with descriptions
  - Admin credentials for demo
  - Feature list matching ThemeForest item description
  - Changelog section (v1.0.0 release notes)
- [ ] In-product help available (`?` tour button in dashboard)

---

## Final Sign-Off

Before submitting to ThemeForest, confirm all phases are complete:

- [ ] Phase 1 — Performance ✓
- [ ] Phase 2 — Security ✓
- [ ] Phase 3 — Functionality ✓
- [ ] Phase 4 — SEO & Discoverability ✓
- [ ] Phase 5 — Accessibility ✓
- [ ] Phase 6 — Analytics & Observability ✓
- [ ] Phase 7 — Marketplace-Specific ✓

---

*Feeds into: `STEP_07_MARKETPLACE_LAUNCH.md` (item submission and post-launch)*
