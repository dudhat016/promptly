# Step 03 — Feature Development
> Type: Development — Application Features
> Prerequisite: `STEP_01_COMPONENT_DEVELOPMENT.md` Phase 1 + `STEP_02_PAGE_DEVELOPMENT.md` error pages
> Rule: Features are behaviors that span multiple components and pages. Each feature entry describes the full scope — data model, UI, API, and admin control — not just the frontend.

---

## Feature Priority Legend
- **P0** — Must ship before ThemeForest listing. Buyers notice its absence immediately.
- **P1** — Required for best-seller level. Expected by buyers at this price point.
- **P2** — Differentiators. Makes Promptly stand above competition.
- **P3** — Future enhancements. Build after stable listing.

---

## Feature 3.1 — Cookie Consent Banner `P0`

**Why:** GDPR compliance. The `CookiePolicyPage` exists but there is no consent gate. `NeuralMarketingScripts.tsx` (Google Analytics, Facebook Pixel) fires immediately on load regardless of user consent — this is a GDPR violation.

**Where:**
- New component: `src/components/CookieConsent.tsx`
- Modified: `NeuralMarketingScripts.tsx` — must check consent before loading scripts
- Modified: `App.tsx` — renders `CookieConsent` globally

**Behavior:**

Step 1 — First visit detection:
- Check `localStorage.getItem('cookie-consent')` on app load
- If null or expired: show consent banner
- If set: apply previously chosen preferences silently

Step 2 — Consent banner UI:
- Fixed to the bottom of the viewport (above all other content)
- Content: "We use cookies to improve your experience. See our [Cookie Policy]."
- Three buttons: "Accept All" | "Reject Non-Essential" | "Manage Preferences"
- "Manage Preferences" opens a modal with category toggles:
  - **Strictly Necessary** — always on, cannot toggle (auth, cart, security)
  - **Analytics** — Google Analytics, Hotjar (default off)
  - **Marketing** — Facebook Pixel, ad tracking (default off)
  - **Functional** — preferences, saved settings (default on)

Step 3 — Consent storage:
```
localStorage['cookie-consent'] = JSON.stringify({
  version: 1,
  date: ISO string,
  analytics: boolean,
  marketing: boolean,
  functional: boolean
})
```

Step 4 — Script conditional loading in `NeuralMarketingScripts.tsx`:
- Only inject Google Analytics if `consent.analytics === true`
- Only inject Facebook Pixel if `consent.marketing === true`
- On consent change: if user revokes, remove scripts (reload page or manually disable)

**Acceptance criteria:**
- [ ] Banner shows on first visit to any page
- [ ] Banner does not show after consent is given (until version changes)
- [ ] Google Analytics does not load until analytics consent is given
- [ ] "Accept All" sets all categories to true
- [ ] "Reject Non-Essential" sets analytics and marketing to false
- [ ] Preferences modal saves per-category choices correctly
- [ ] Banner is keyboard navigable (Tab, Enter)

---

## Feature 3.2 — Announcement Banner `P0`

**Why:** Site-wide communication to all users — new features, maintenance notices, sale announcements, critical information. Every top SaaS product has this.

**Where:**
- New component: `src/components/AnnouncementBanner.tsx`
- Admin control in `AdminSettings.tsx`
- `UserLayout.tsx` + `Header.tsx` — renders the banner above the main content

**Behavior:**

Admin control (in AdminSettings):
- Toggle: "Enable Announcement Banner"
- Text field: "Banner message" (supports basic HTML or markdown links)
- Select: "Banner type" (info | success | warning | danger) — controls color
- Text field: "CTA button text" (optional)
- Text field: "CTA button URL" (optional)
- Date fields: "Show from" / "Show until" (optional scheduling)

Firestore: `configs/global.announcement = { enabled, message, type, ctaText, ctaUrl, showFrom, showUntil }`

User-facing:
- Renders a thin colored bar above the site header (not inside the header)
- Shows dismiss button (×) on the right
- After dismiss: store dismissed state in `localStorage['dismissed-announcement-{hash}']`
  - Use a hash of the message content so new messages are not auto-dismissed
- CTA button (if set) opens link in new tab
- If `showFrom` / `showUntil` are set, only show during that window

**Acceptance criteria:**
- [ ] Admin can toggle, update text, and change type from AdminSettings
- [ ] Banner appears above header in UserLayout and on public pages
- [ ] Dismiss hides banner and remembers preference (per message content)
- [ ] New announcement message is not auto-dismissed (old dismissed state does not apply)
- [ ] Correct color for each banner type (info=blue, success=green, warning=yellow, danger=red)
- [ ] Scheduled show/hide works based on current date

---

## Feature 3.3 — Maintenance Mode Toggle `P0`

**Why:** Every production deployment needs a way to take the site offline for maintenance without a code deploy.

**Where:**
- `AdminSettings.tsx` — toggle control
- `App.tsx` — check on app load
- New page: `MaintenancePage` (see STEP_02, section 2.3)

**Behavior:**

Admin control in AdminSettings:
- Toggle: "Enable Maintenance Mode" — writes to `configs/global.maintenanceMode`
- Text field: "Maintenance message" — writes to `configs/global.maintenanceMessage`
- Text field: "Estimated return time" — writes to `configs/global.maintenanceETA`

App.tsx routing logic:
- On app initialization, read `configs/global` from Firestore (single document, cheap read)
- If `maintenanceMode === true`:
  - If user's role is 'admin' or 'super-admin': show site normally
  - Otherwise: render `<MaintenancePage />` for all route requests
- Add a real-time listener so maintenance can be toggled without users needing to refresh

**Acceptance criteria:**
- [ ] Admin toggle in AdminSettings writes to Firestore immediately
- [ ] Non-admin users see maintenance page within 5 seconds of toggle (real-time listener)
- [ ] Admin users see site normally while maintenance is active
- [ ] Maintenance message and ETA render on the page
- [ ] Turning maintenance off restores normal routing within 5 seconds

---

## Feature 3.4 — Annual / Monthly Pricing Toggle `P1`

**Why:** Standard SaaS pricing pattern. "Save 20%" framing on annual increases conversion. Currently PricingPage shows only monthly prices.

**Where:** `src/pages/PricingPage.tsx`

**Behavior:**
- Toggle switch at the top of pricing cards: "Monthly | Annually" with "Save 20%" badge on Annual
- Annual price = monthly price × 10 (equivalent to 2 months free)
- Price display animates (number transition) when toggling
- Toggle state stored in component state only (no persistence needed)
- Stripe links / checkout buttons must use the correct price ID based on toggle state
- Annual prices are passed to the checkout flow so Stripe creates the correct subscription interval

**Acceptance criteria:**
- [ ] Toggle switches between monthly and annual prices
- [ ] "Save 20%" badge is visible on the annual option
- [ ] Price numbers update when toggling (smooth transition optional)
- [ ] Checkout button uses the correct Stripe price ID for the selected interval
- [ ] Works on mobile (toggle and cards stack correctly)

---

## Feature 3.5 — DataTable Column Visibility Toggle `P1`

**Why:** Requested in buyer feedback from multiple templates. Admin users managing large tables need to hide irrelevant columns.

**Where:** `src/components/data/DataTable.tsx`

**Behavior:**
- "Columns" button added to DataTable toolbar, next to "Export CSV" button
- Clicking opens a `Popover` panel with a checkbox list of all column keys
- Each checkbox maps to a column's `key` value
- Unchecked columns are excluded from the rendered table and from CSV export
- Hidden column state stored in `sessionStorage` keyed by a `tableId` prop
  - `sessionStorage['datatable-cols-{tableId}'] = JSON.stringify(['col1', 'col3'])`
- Reset button in the Popover restores all columns

**Props change to DataTable:**
- Add optional `tableId: string` prop — enables persistence; without it, no persistence
- Add optional `hiddenColumns: string[]` prop — externally controlled (uncontrolled mode available too)

**Acceptance criteria:**
- [ ] Columns button appears only when `tableId` is provided or `showColumnToggle` prop is true
- [ ] Hiding a column removes it from both the table and CSV export
- [ ] Column visibility persists through page reload (sessionStorage)
- [ ] Reset restores all columns
- [ ] Column toggle state is independent per table (multiple DataTables on same page don't share state)

---

## Feature 3.6 — DataTable Server-Side Mode `P1`

**Why:** Admin pages with large datasets (users, prompts, transactions) cannot load all data client-side. Server-side pagination is required for performance at scale.

**Where:** `src/components/data/DataTable.tsx` + all admin DataTable usage sites

**Behavior — new prop: `serverSide: true`**

When `serverSide={true}`:
- DataTable does NOT sort or filter data internally
- Instead, it calls `onFetchData({ page, pageSize, sortKey, sortDir, search })` prop whenever these change
- DataTable receives `data` and `totalItems` as external props (not managed internally)
- Loading state: shows Skeleton rows while fetch is in progress
- Page changes, sort changes, and search changes all trigger `onFetchData`

API contract:
```
GET /api/users?page=2&pageSize=20&sortKey=createdAt&sortDir=desc&search=john
→ { data: User[], totalItems: 450 }
```

Firestore implementation:
- Use cursor-based pagination with Firestore `startAfter` for true server-side pagination
- Cache the last document reference for "next page" cursor

**Acceptance criteria:**
- [ ] Sorting triggers a new API call with `sortKey` and `sortDir` params
- [ ] Search input debounces 300ms before triggering fetch
- [ ] Page change triggers fetch with correct `page` and `pageSize`
- [ ] Skeleton rows show during loading
- [ ] Total items label is accurate from the server response
- [ ] Works in all admin DataTable pages that need it (Users, Prompts, Transactions)

---

## Feature 3.7 — Guided Tour / Help Overlay `P2`

**Why:** New users who skip onboarding or return after time away need contextual help. This prevents the "I'm lost" support tickets.

**Where:**
- New component: `src/components/GuidedTour.tsx`
- Triggered from a "?" help button added to `UserLayout` header

**Behavior:**

Tour data structure:
```ts
type TourStep = {
  target: string        // CSS selector of the element to highlight
  title: string
  description: string
  placement: 'top' | 'bottom' | 'left' | 'right'
}
```

Dashboard tour steps:
1. Highlight sidebar "Vault" item → "Your Vault — all prompts you've unlocked live here"
2. Highlight sidebar "AI Builder" item → "Use the AI Builder to generate custom prompts instantly"
3. Highlight header credit balance → "Credits are your currency — use them to unlock and generate"
4. Highlight "Explore" link → "Browse thousands of community prompts in the marketplace"
5. Highlight user avatar/profile → "Manage your account, billing, and referral links here"

Implementation approach:
- Use a simple custom implementation (no Shepherd.js — avoid adding a library)
- Tour component creates a backdrop overlay with a transparent "spotlight" cutout around the target element
- Position tooltip next to the target using `getBoundingClientRect()`
- Previous / Next / Close buttons on each step
- "Don't show again" checkbox on the last step — stores in `localStorage['tour-dismissed'] = true`

**Acceptance criteria:**
- [ ] Tour starts from "?" button in UserLayout header
- [ ] Spotlight correctly highlights target element
- [ ] Tooltip positions correctly relative to target
- [ ] Previous/Next navigate between steps
- [ ] "Don't show again" prevents future auto-start
- [ ] Tour is dismissible at any step with Escape key
- [ ] Works on mobile (tooltip repositions for small viewports)

---

## Feature 3.8 — Complete RTL Mode `P1`

**Why:** RTL is listed as supported but must be verified at the component level, not just layout level. RTL buyers are extremely loyal when it works correctly and leave immediately when it doesn't.

**What RTL must cover beyond layout flipping:**

Step 1 — Layout-level (verify these are already working):
- Sidebar flips to the right side
- Nav arrows point correct direction
- Content area is to the left of the sidebar

Step 2 — Component-level (must verify each):
- **Button:** icon-left appears on correct side in RTL (`flex-row-reverse` in RTL context)
- **Input:** icon prefix/suffix appear on correct sides
- **Select:** dropdown arrow on correct side
- **Tabs:** underline alignment, scroll direction
- **Accordion:** chevron on correct side
- **Chip:** remove × on correct side
- **Timeline:** icon on right, content on left
- **Pagination:** prev/next arrows reversed
- **Alert:** icon on correct side
- **Progress bar:** fills from right in RTL
- **DataTable:** text alignment, sort arrows, pagination arrows
- **Tooltip/Popover:** left/right placements swap in RTL

Step 3 — Typography:
- Arabic/Hebrew text should render with `text-align: right` by default
- Mixed LTR+RTL content (English words inside Arabic sentences) should use `unicode-bidi: embed`

Step 4 — Create a dedicated RTL test page (admin only):
- Route: `/admin/rtl-test`
- Shows every component in RTL mode
- Allows toggling LTR/RTL to compare side-by-side
- Document any known RTL limitations per component in `STEP_05_DOCUMENTATION.md`

Step 5 — Customizer RTL toggle:
- Add explicit LTR | RTL toggle buttons to the Customizer panel (see `STEP_04_THEME_CUSTOMIZER.md`)

**Acceptance criteria:**
- [ ] All 12 component types listed in Step 2 are verified in RTL
- [ ] RTL test page exists and accessible to admin users
- [ ] All known RTL limitations documented
- [ ] RTL toggle in Customizer works
- [ ] Arabic text test content renders correctly

---

## Feature 3.9 — PWA Offline Support `P2`

**Why:** Promptly already has PWA install prompt. Completing the offline experience makes it genuinely installable as an app, which is a significant differentiator.

**Prerequisite:** `vite-plugin-pwa` must be installed and configured.

**Step-by-step setup:**

Step 1 — Service Worker caching strategy:
- **App shell** (HTML, CSS, JS, fonts): Cache-first (files change rarely)
- **API responses** (`/api/*`): Network-first with cache fallback (always try fresh data)
- **Images and static assets** (`/assets/*`, Firebase Storage URLs): Stale-while-revalidate
- **Firestore real-time**: not cacheable by service worker — use Firestore's built-in offline persistence (`enableIndexedDbPersistence`)

Step 2 — Pre-cache these specific pages for offline use:
- `/dashboard` (Vault summary)
- `/vault` (if already loaded once)
- `/dashboard/favorites`
- `/offline` (the offline fallback page — always pre-cached)

Step 3 — Firestore offline persistence:
- Enable in `src/lib/firebase.ts`: `enableIndexedDbPersistence(db)`
- This allows reads from cached Firestore data when offline
- Writes while offline are queued and sync when reconnected

Step 4 — Offline detection and UI:
- Listen to `navigator.onLine` and the `online`/`offline` window events
- When offline: show global banner (use `Banner` component): "You're offline — some features are unavailable. Changes will sync when you reconnect."
- When reconnected: banner dismisses automatically
- Disable write-dependent actions when offline (form submit buttons show "Unavailable offline")

Step 5 — PWA manifest (verify these exist in `public/manifest.json`):
- `name`, `short_name`, `start_url: "/"`, `display: "standalone"`
- Icons: 192×192, 512×512, and maskable variant
- `theme_color` and `background_color` matching brand

**Acceptance criteria:**
- [ ] App installs to home screen on Android and iOS
- [ ] Dashboard and Vault pages load while offline (after one online visit)
- [ ] Offline banner shows when connection drops
- [ ] Banner dismisses when connection restores
- [ ] Disabled form buttons when offline
- [ ] Firestore writes queue while offline and sync on reconnect
- [ ] Lighthouse PWA score 90+

---

## Feature 3.10 — LandingPage Testimonials Section `P1`

**Why:** Testimonials are the highest-converting section on a landing page. Currently absent from Promptly's landing page. Buyers building their own SaaS also want a testimonials section they can reference.

**Where:** `src/pages/LandingPage.tsx`

**Content structure:**
- Section heading: "What users are saying"
- Grid of testimonial cards (3 columns desktop, 1 column mobile)
- Each card:
  - Avatar (using `Avatar` component)
  - Name + role/company
  - Star rating (using `Rating` component, readonly, 5 stars)
  - Quote text (2–4 sentences)
  - Verified badge (optional)
- Source data: hardcoded testimonial data in `LandingPage.tsx` (realistic fake or real user quotes)
- Animation: cards animate in on scroll (Intersection Observer, no library)

**Admin management (future):**
- Eventually allow admin to add/edit testimonials from `/admin/site-pages`
- For now, hardcoded in the page component

**Acceptance criteria:**
- [ ] Section renders between Features and Pricing sections
- [ ] 3-column grid collapses to 1 column on mobile
- [ ] Rating stars show correctly (5 filled stars)
- [ ] Avatar shows correctly (initials fallback if no image)
- [ ] Scroll animation does not run if `prefers-reduced-motion` is set

---

## Feature Development Checklist

For every feature before marking complete:

- [ ] Data model fully defined (Firestore schema or component state)
- [ ] Admin control exists if the feature is configurable
- [ ] Feature works with no data (empty state handled)
- [ ] Feature works with maximum realistic data (100 items in a list)
- [ ] Loading state shown during async operations
- [ ] Error state shown if async operation fails
- [ ] Feature works in dark mode
- [ ] Feature works in RTL mode
- [ ] Mobile layout works for all feature UI
- [ ] No console errors or TypeScript errors
- [ ] Security: user can only access their own data (check Firestore rules and API endpoints)

---

---

## Feature 3.10 — Staff Role RBAC `P1` ✅ Implemented

**Why:** A SaaS admin template must demonstrate multi-operator scenarios. Buyers need to model a content team (writers), a support team, and a finance team all operating from the same admin panel but seeing only their own sections.

**Reference:** `doc/STAFF_ROLES_AND_CREDITS.md` for the complete spec.

**What was built:**

1. **`configs/staff_roles` Firestore document** — stores an array of `StaffRoleDefinition` objects, each with an ID, name, color, description, and list of allowed `AdminSection` keys.

2. **`/admin/roles` page** (`AdminRoles.tsx`) — fully dynamic CRUD:
   - Role card grid with color-coded badges and section tag pills
   - Slide-in editor drawer with name, description, color picker, and grouped section checkboxes
   - Role ID auto-generated (slugified) from the name on creation
   - Delete with confirmation

3. **`useStaffRoles` hook** — real-time Firestore listener, `canAccessSection(section)` method.

4. **Route protection:**
   - `AdminRoute` now passes `role === 'staff'` users into the admin panel
   - `SectionRoute` wrapper on every admin child route: calls `canAccessSection()` and redirects to `/admin` if the staff user lacks access

5. **Sidebar filtering** (`AdminLayout.tsx`) — `filterNavForRole()` removes nav items (and their section headers if empty) for sections the staff user cannot access.

6. **Staff role assignment** (`AdminUserDetails.tsx`) — one-click role buttons in the user profile "Staff Role" panel; immediately writes `{ role: 'staff', staffRole: '<id>' }` to Firestore.

**Acceptance criteria:**
- [x] Admin can create, edit, delete staff roles from `/admin/roles`
- [x] Role names generate stable slug IDs
- [x] Assigning a role from user profile takes effect immediately (real-time listener)
- [x] Staff user sees only their allowed sections in the sidebar
- [x] Direct URL navigation to a forbidden section redirects to `/admin`
- [x] Full admin (`role: 'admin'`) is never affected by role filtering

---

## Feature 3.11 — Plan-Driven Credit System `P0` ✅ Implemented

**Why:** Credits are the core monetisation hook for free users. If the credit amount awarded on subscription isn't driven by the plan config, admins cannot create flexible plans without a code deploy.

**Reference:** `doc/STAFF_ROLES_AND_CREDITS.md` for the complete spec.

**What was built:**

1. **`PricingPlan.monthlyCredits`** — new field on the plan type and Firestore document. Set by admin in the plan edit form.

2. **Subscription flows updated** — both the direct-card fallback (`CheckoutPage.tsx`) and the server-side Cashfree/PayPal handlers (`api/services/paymentService.ts`) now read `plan.monthlyCredits` instead of hardcoding 500/2500/50. Both `credits` and `monthlyLimit` are set to `plan.monthlyCredits`.

3. **`vaultLimit` typed in `GlobalConfig`** — TypeScript error in `PromptDetailPage` and `DashboardPage` fixed by adding `vaultLimit?: number` to the interface.

4. **Daily reward reads from config** — `useAuth.tsx` now reads `configs/global.aiDefaults.freeCreditsDaily` at reward time rather than hardcoding `increment(5)`.

5. **`AdminSubscriptionForm`** — added "Monthly Credits" number input and INR monthly price field.

**Credit flow summary:**

```
Registration  → credits = plan.monthlyCredits (or 50 for free)
Daily login   → credits += configs/global.aiDefaults.freeCreditsDaily
Prompt unlock → credits -= 1  (free users only)
Prompt copy   → credits -= 1  (free users only, requires canCopyPrompts)
Plan upgrade  → credits = plan.monthlyCredits (reset, not additive)
```

**Acceptance criteria:**
- [x] Admin sets `monthlyCredits` on a plan in the plan edit form
- [x] Subscribing sets user's credit balance to exactly `plan.monthlyCredits`
- [x] `monthlyLimit` matches `plan.monthlyCredits` (used for progress bar)
- [x] Daily reward uses `freeCreditsDaily` from Firestore config, not a hardcoded value
- [x] Free user unlock decrements `credits` by 1 and adds to `unlockedPrompts`
- [x] Pro/admin users bypass credit deduction entirely
- [x] Vault full at `vaultLimit` prompts upgrade modal

## Feature 3.12 — Personalization Engine `P1` ✅ Implemented

**Why:** Cold feed = bounced users. Every major content platform (Instagram, TikTok, Spotify) personalizes on first load and improves with every interaction. Promptly needed the same loop: onboarding → interest seed → behavioral scoring → ranked feed → email digest → CRM segmentation.

**Reference:** `src/lib/affinity.ts` for the complete scoring and sync logic.

**What was built:**

### 1 — Affinity Engine (`src/lib/affinity.ts`)

Central module that owns all personalization state.

| Export | Purpose |
|---|---|
| `INTERACTION_WEIGHTS` | Canonical weights: `VIEW=1, LIKE=5, COPY=10, UNLOCK=8, VAULT_ADD=3, ONBOARDING_SEED=5` |
| `recordPromptInteraction(prompt, weight)` | Adds weight to category/tag/model slots in localStorage profile, applies micro-decay |
| `recordBlogInteraction(post, weight)` | Same for blog tag slots |
| `calculatePromptScore(prompt, profile)` | Returns affinity score for a prompt given a profile |
| `calculateBlogScore(post, profile)` | Same for blog posts |
| `seedAffinityFromInterests(interests)` | Cold-start fix — sets interest IDs to `ONBOARDING_SEED` score, never lowers existing scores |
| `getTopInterests(n)` | Returns top N keys by score — used for email and CRM tags |
| `mergeCloudAffinity(cloudProfile)` | Merges Firestore profile into local (highest scores win) |
| `syncAffinityToCloud(uid)` | Throttled (5 min) sync to `users/{uid}.affinityProfile` + CRM tag update |

**Time decay:** 0.95× per interaction (keeps profile fresh). 5% per 30-day absence, capped at 50% retention.

---

### 2 — Cold-Start Fix (three layers)

**Problem:** A new user who picks interests during onboarding had an empty affinity profile until they manually interacted with prompts. On a new device, returning users had the same problem.

**Solution — three seeding points:**

| Where | When | What |
|---|---|---|
| `OnboardingPage.tsx` | `completeOnboarding()` fires | `seedAffinityFromInterests(interests)` + writes `affinityProfile` to Firestore |
| `useAuth.tsx` | Profile loaded, local affinity empty | `seedAffinityFromInterests(data.interests)` if cloud profile also empty |
| `ExplorePage.tsx` | "For You" sort, affinity empty | Falls back to `profile.interests` to build a temporary scoring profile |

After onboarding, `users/{uid}.affinityProfile` is written to Firestore so any new device inherits the seed on login.

---

### 3 — "For You" Feed (`ExplorePage.tsx`)

The "Recommended for You" sort option now uses real affinity data:

```
getAffinityProfile() → has data?
  Yes → calculatePromptScore(prompt, profile) for each prompt → sorted descending
  No  → profile.interests exists?
    Yes → build temporary profile from interests (score=5 each) → calculatePromptScore
    No  → fall back to likesCount descending
```

---

### 4 — Interaction Signal Collection

Every significant user action records an affinity signal with the canonical weight:

| Action | File | Weight |
|---|---|---|
| View prompt page | `PromptDetailPage.tsx` | `VIEW (1)` |
| Read time (every 60s on page) | `PromptDetailPage.tsx` | `VIEW (1)` |
| Like prompt | `PromptDetailPage.tsx` | `LIKE (5)` |
| Copy prompt | `PromptDetailPage.tsx` | `COPY (10)` |
| Unlock prompt | `PromptDetailPage.tsx` | `UNLOCK (8)` |
| View blog post | `BlogDetailPage.tsx` | `VIEW (1)` |
| Read time (every 10s on page) | `BlogDetailPage.tsx` | `VIEW (1)` |
| Search term typed | `ExploreSidebar.tsx` | `0.5` (no decay) |
| Onboarding interest selected | `OnboardingPage.tsx` | `ONBOARDING_SEED (5)` |

---

### 5 — CRM Segmentation Sync

Every affinity sync (`syncAffinityToCloud`) updates `marketing_contacts` tags:

| Score | Tag applied |
|---|---|
| `>= 10` | `High-Intent: CATEGORY` (removes Low-Intent) |
| `1–9` | `Low-Intent: CATEGORY` (removes High-Intent) |

Onboarding completion adds `Interest: <Name>` tags and `onboarding_complete` to the contact record.

---

### 6 — Personalized Email (`emailService.ts`)

Added `sendOnboardingCompleteEmail(uid, email, name, interests)`:
- Sends after onboarding completes
- Includes user's interest list in the body
- Supports `onboarding_complete` Firestore template override (dynamic body/subject from Admin → Email Templates)

---

**Acceptance criteria:**
- [x] New user's "For You" feed shows interest-relevant prompts immediately after onboarding
- [x] Returning user on a new device gets a seeded feed on first login (no empty state)
- [x] Every view/like/copy/unlock updates the affinity profile (localStorage + throttled Firestore sync)
- [x] All interaction weights use `INTERACTION_WEIGHTS` constants — no magic numbers in calling code
- [x] Marketing contacts receive `Interest:` and `onboarding_complete` tags after onboarding
- [x] Affinity score drives `High-Intent` / `Low-Intent` CRM tags automatically
- [x] Personalized onboarding-complete email sent with interest list
- [x] Time decay keeps profile fresh — high-frequency interests don't dominate forever

---

*Feeds into: `STEP_04_THEME_CUSTOMIZER.md` (customizer is itself a feature), `STEP_06_PRODUCTION_CHECKLIST.md` (security and GDPR verification for each feature)*


---

## Feature 3.13 — Creator Prompt Submission `P1` ✅ Implemented

**Why:** The marketplace grows only through admin-created content. Opening submission to verified creators unlocks community-driven growth while admin approval keeps quality controlled.

**Flow:**

```
Creator fills form → client validation → hash duplicate check
  → Firestore write with status: 'pending'
  → Admin review queue (approve free / approve premium / reject with reason)
  → If approved: appears on Explore with creator profile
  → If rejected: creator notified, can revise + resubmit (max 3 attempts)
```

**Data model changes (`src/types.ts`):**

| New field | Type | Notes |
|---|---|---|
| `status` | `'pending' \| 'approved' \| 'rejected'` | Default `pending` on submit |
| `submittedAt` | `string` | ISO timestamp of original submission |
| `approvedBy` | `string?` | Admin UID who approved |
| `approvedAt` | `string?` | ISO timestamp of approval |
| `rejectionReason` | `string?` | Admin-written reason, shown to creator |

**Key files:**

| File | Role |
|---|---|
| `src/pages/dashboard/SubmitPromptPage.tsx` | New — user-facing submission form (title, description, content, category, tags, model, difficulty, image, SEO fields, sampleOutput, usageGuide) |
| `src/pages/dashboard/DashboardLibrary.tsx` | Updated — status badges (Pending/Approved/Rejected) + Submit New Prompt button |
| `src/pages/admin/AdminPrompts.tsx` | Updated — Pending tab with approve/reject/premium toggle actions |
| `src/pages/ExplorePage.tsx` | Updated — filters to `status === 'approved'` and `moderationStatus !== 'hidden'` |
| `firestore.rules` | Updated — `create` rule enforces `status === 'pending'`; only admin `update` can flip to `approved` |

**Validation gates (client-side, no AI):**

- Title: ≥ 10 chars
- Content: ≥ 150 chars
- Description: ≥ 30 chars
- Image: required
- Tags: 2–10
- Category: required

**Duplicate guard:** SHA-style content hash compared before submission — blocks re-submission of near-identical content.

**Creator trust queue:** Admin queue sorted by known vs new creators. Admin manually approves all submissions.

**Admin actions per pending prompt:**

| Action | Effect |
|---|---|
| Approve as Free | `status: approved`, `isPaid: false` |
| Approve as Premium | `status: approved`, `isPaid: true` |
| Reject | `status: rejected`, stores `rejectionReason` |

**Acceptance criteria:**
- [x] Verified creators can submit prompts from `/dashboard/submit-prompt`
- [x] Submissions appear in admin review queue with status `pending`
- [x] DashboardLibrary shows all creator's own prompts with status badges
- [x] Explore only shows `approved` prompts
- [x] Admin can approve as free/premium or reject with reason
- [x] Creator notified in-app on approval or rejection

---

## Feature 3.14 — Prompt Reporting & Moderation `P1` ✅ Implemented

**Why:** User-generated and community-reviewed content creates trust risks. A report system mirrors industry-standard moderation (Instagram, Skool) and protects the platform from harmful/spam content.

**Flow:**

```
Any user (logged in or out) clicks ··· → Report
  → Modal: select reason → confirm
  → Firestore write to prompt_reports collection
  → If reportCount >= 5: moderationStatus auto-flips to 'flagged'
  → Admin reviews in /admin/reports
  → Admin: Dismiss / Warn Creator / Hide Prompt / Delete Prompt
  → Explore filters out status: 'hidden' prompts
```

**Data model:**

`prompt_reports/{reportId}`:
```
promptId: string
promptTitle: string          (denormalized)
promptCreatorId: string      (denormalized)
reporterId: string | null    (null if logged out)
reason: string               (enum)
details: string?             (optional free text)
status: 'pending' | 'reviewed' | 'dismissed' | 'actioned'
createdAt: Timestamp
reviewedBy: string?
reviewedAt: Timestamp?
adminNote: string?
```

`prompts/{id}` — added fields:
```
reportCount: number          (incremented on each report)
moderationStatus: 'active' | 'flagged' | 'hidden'
```

**Report reasons:**

| Reason | Description |
|---|---|
| `spam` | Spam or misleading |
| `harmful` | Harmful or dangerous |
| `inappropriate` | Offensive content |
| `copyright` | Copyright violation |
| `wrong_category` | Miscategorized |
| `duplicate` | Near-identical to another |
| `other` | Free text, max 200 chars |

**Key files:**

| File | Role |
|---|---|
| `src/components/ReportModal.tsx` | New — reason selection + confirmation modal |
| `src/components/PromptCard.tsx` | Updated — three-dot menu (hover) with Report option |
| `src/pages/PromptDetailPage.tsx` | Updated — Report option in action area |
| `src/pages/admin/AdminReports.tsx` | New — moderation queue (Pending/Reviewed/Dismissed/Actioned tabs) |
| `src/pages/admin/AdminLayout.tsx` | Updated — Reports nav item under Support section |
| `src/components/admin/AdminNotificationBell.tsx` | Updated — Flagged Prompts group (red Flag icon) |
| `firestore.rules` | Updated — `prompt_reports` collection rules |

**Abuse prevention (rule-based, no AI):**

- Max 5 reports per user per 24h (client-enforced + Firestore rule)
- Same user cannot report same prompt twice
- Auto-flag at 5+ reports on a prompt

**Admin actions:**

| Action | Effect |
|---|---|
| Dismiss | Reports → `dismissed`, prompt unchanged |
| Warn Creator | Notification to creator, reports → `reviewed` |
| Hide Prompt | `moderationStatus: hidden`, removed from Explore |
| Delete Prompt | Hard delete, reports → `actioned` |

**Creator privacy:** Reports are anonymous — creator is notified of outcomes (warn/hide) but never sees who reported or how many reports.

**Acceptance criteria:**
- [x] Any user (logged in or out) can report any prompt from card or detail page
- [x] Report modal shows reason categories + optional details
- [x] Same user cannot report same prompt twice
- [x] Admin sees pending reports with count badge in notification bell
- [x] Admin can dismiss/warn/hide/delete per report
- [x] Prompts with `moderationStatus: hidden` do not appear in Explore
- [x] Auto-flag fires at 5+ reports

---

*Feeds into: `STEP_04_THEME_CUSTOMIZER.md`, `STEP_06_PRODUCTION_CHECKLIST.md`*
