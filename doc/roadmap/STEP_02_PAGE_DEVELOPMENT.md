# Step 02 — Page Development
> Type: Development — Pages & Routes
> Prerequisite: `STEP_01_COMPONENT_DEVELOPMENT.md` Phase 1 components must be built first. Pages depend on Alert, Spinner, Tabs, Accordion, Timeline, Rating.
> Rule: Build pages in zone order (Error → User → Public → Admin). Each page must be connected to routing before marking complete.

---

## Zone Map

Promptly has three zones. Every page belongs to exactly one zone and uses that zone's layout:

| Zone | Layout | Route Guard | Layout Component |
|---|---|---|---|
| Public | `HorizontalLayout` (top nav + footer) | None | `Header` + `Footer` |
| User Dashboard | `VerticalLayout` (sidebar + top header) | `AuthGuard` | `UserLayout` |
| Admin Panel | `AdminLayout` (admin sidebar) | `AuthGuard` + `AdminGuard` | `AdminLayout` |

---

## Zone 1 — Error & Utility Pages

These are the simplest pages to build (static, no data fetching) but among the most important for production credibility. Build all 5 in a single session.

### Pattern: Every error page follows this exact structure
```
Centered container (max-w-md, full viewport height)
  ↓ Illustration or large icon (SVG or emoji, 80–120px)
  ↓ Error code (large, semi-transparent, decorative — e.g., "403")
  ↓ Headline (bold, 2–3 words)
  ↓ Description (1–2 sentences explaining what happened)
  ↓ Primary action button ("Go to Dashboard" or "Go Home")
  ↓ Secondary action (optional — "Contact Support" or "Try Again")
```

---

### 2.1 — 403 Forbidden Page
**Route:** `/403`
**Zone:** Public (Blank layout — no header/footer, full page)
**When shown:** `AdminGuard` redirects here when a logged-in non-admin tries to access `/admin/*`

**Content:**
- Illustration: lock icon or shield (SVG)
- Code: "403"
- Headline: "Access Denied"
- Description: "You don't have permission to view this page. If you believe this is an error, contact your administrator."
- Button: "Go to Dashboard" → `/dashboard`

**Routing change needed:**
- In `AdminGuard`, change redirect from `navigate('/')` to `navigate('/403')`
- In any future role-based route guard, redirect to `/403` for permission errors

**Acceptance criteria:**
- [ ] Renders without header/footer (blank layout)
- [ ] Button navigates to correct route
- [ ] AdminGuard redirects to `/403` instead of `/`
- [ ] Works in dark mode

---

### 2.2 — 500 Server Error Page
**Route:** `/500`
**Zone:** Public (Blank layout)
**When shown:** API calls that return 5xx, Firebase outages, unhandled server errors

**Content:**
- Illustration: broken server or lightning bolt icon
- Code: "500"
- Headline: "Something Went Wrong"
- Description: "Our servers ran into an issue. This has been logged automatically. Try refreshing or come back in a few minutes."
- Buttons: "Refresh Page" (window.location.reload) + "Go Home" → `/`

**Integration:**
- The global API client (`src/lib/api.ts`) should catch 500 responses and optionally navigate to `/500`
- `ComponentErrorBoundary` can render a link to `/500` in its fallback

**Acceptance criteria:**
- [ ] Renders without header/footer
- [ ] "Refresh Page" button reloads the page
- [ ] Works in dark mode

---

### 2.3 — Maintenance Mode Page
**Route:** `/maintenance`
**Zone:** Public (Blank layout)
**When shown:** When `configs/global.maintenanceMode === true` in Firestore. `App.tsx` intercepts ALL routes and renders this page for non-admin users.

**Content:**
- Illustration: wrench/tools icon or gear animation
- Headline: "Under Maintenance"
- Description: Shows configurable message from `configs/global.maintenanceMessage`
- Estimated return: Shows `configs/global.maintenanceETA` if set
- No navigation buttons (user cannot browse the site during maintenance)
- Admin users bypass this page and see the full site normally

**Admin configuration (in AdminSettings):**
- Toggle: "Enable Maintenance Mode" (on/off switch)
- Text field: "Maintenance message"
- Text field: "Estimated return time"

**App.tsx routing logic:**
```
On app load, read configs/global from Firestore.
If maintenanceMode === true AND user is not admin:
  Render <MaintenancePage /> for all routes.
Else:
  Render normal routes.
```

**Acceptance criteria:**
- [ ] Non-admin user sees maintenance page when mode is enabled
- [ ] Admin user sees site normally even when mode is enabled
- [ ] AdminSettings toggle actually writes to Firestore
- [ ] Message and ETA from Firestore render on the page

---

### 2.4 — Coming Soon Page
**Route:** `/coming-soon`
**Zone:** Public (Blank layout)
**When shown:** Manually linked for features that are in development

**Content:**
- Illustration: rocket or clock icon
- Headline: "Coming Soon"
- Description: "We're working on something great. Drop your email to get notified when it launches."
- Email input + "Notify Me" button (stores in `waitlist` Firestore collection)
- Social links (Twitter, Discord, etc.)

**Acceptance criteria:**
- [ ] Email submit writes to `waitlist/{email}` in Firestore
- [ ] Shows confirmation message after submit
- [ ] Works without being logged in

---

### 2.5 — Offline Page
**Route:** `/offline`
**Zone:** Public (Blank layout)
**When shown:** PWA service worker serves this when user is offline and requests a non-cached page

**Content:**
- Illustration: broken Wi-Fi icon
- Headline: "You're Offline"
- Description: "Check your internet connection. Cached pages (Dashboard, Vault, Favorites) are still available."
- Button: "Try Again" (attempts to navigate to `/dashboard`)

**PWA wiring:**
- Service worker (`vite-plugin-pwa`) must be configured to serve `/offline` for navigation requests that fail due to network
- The offline page itself must be pre-cached so it loads without network

**Acceptance criteria:**
- [ ] Service worker serves this page when offline
- [ ] The offline page HTML is pre-cached (loads with no network)
- [ ] "Try Again" button attempts navigation to dashboard

---

## Zone 2 — User Dashboard Pages

---

### 2.6 — Notification Center
**Route:** `/notifications`
**Zone:** User Dashboard (`UserLayout`)
**Guard:** `AuthGuard`

**Data model (Firestore):**
```
notifications/{notificationId}
  userId: string
  title: string
  body: string
  type: 'withdrawal_approved' | 'credit_reward' | 'ticket_reply' | 'referral_converted' | 'system'
  readAt: Timestamp | null
  createdAt: Timestamp
  link: string (optional — where to navigate on click)
  icon: string (optional — overrides default type icon)
```

**Page structure:**
- `AdminPageHeader` with title "Notifications" + "Mark All Read" button (top right)
- Filter tabs (using `Tabs` component): All | Unread | Withdrawals | Credits | Support | System
- Notification list: each item shows icon, title, body, timestamp, unread dot if unread
- Click on item: marks as read + navigates to `link` if present
- Empty state: `EmptyState` component with "No notifications yet" message
- Pagination: `Pagination` component, 20 items per page

**Bell icon in header (`UserLayout`):**
- Shows unread count badge (red dot with number)
- Clicking opens a dropdown preview (last 5 notifications) with "View All" link to `/notifications`

**Acceptance criteria:**
- [ ] Unread dot shows correct count in header bell
- [ ] "Mark All Read" sets `readAt` on all unread docs
- [ ] Filter tabs correctly filter by `type`
- [ ] Clicking a notification with a link navigates correctly
- [ ] Empty state shows when no notifications exist

---

### 2.7 — Onboarding Wizard
**Route:** `/onboarding`
**Zone:** Blank layout (no sidebar — focused experience)
**Guard:** `AuthGuard` + redirect if `profile.hasCompletedOnboarding === true`

**Why this matters:** First-time users land on the dashboard with no context. This is the #1 retention driver missing from Promptly.

**Step structure (using `Stepper` component):**

```
Step 1 — Welcome
  "Welcome to Promptly, [firstName]!"
  Input: display name confirmation
  Select: how did you hear about us?

Step 2 — Your Use Case
  "What will you use Promptly for?"
  Multi-select chip options:
    Content Writing | Coding | Marketing | Research | Education | Business | Creative | Other
  This seeds the explore page with relevant categories

Step 3 — Choose Your AI Model Preference
  Cards with icons:
    GPT-4o | Claude Sonnet | Gemini Pro | Llama 3 | No Preference
  Stores as profile.preferredModel

Step 4 — Your Plan
  Simplified pricing cards (Free vs Pro)
  "Skip for now" link
  "Upgrade" button links to /pricing

Step 5 — You're All Set
  Confetti animation (CSS-only, no library)
  "Go to my Dashboard" button
```

**Firestore write on complete:**
- `profile.hasCompletedOnboarding = true`
- `profile.useCases = [selected chip values]`
- `profile.preferredModel = selected model`

**Routing logic:**
- After registration, redirect to `/onboarding` instead of `/dashboard`
- If user has `hasCompletedOnboarding: true`, redirect from `/onboarding` to `/dashboard`

**Acceptance criteria:**
- [ ] All 5 steps render with Stepper showing progress
- [ ] "Back" button returns to previous step
- [ ] Firestore writes correct data on "Finish"
- [ ] Skipping Step 4 still completes onboarding
- [ ] New registrations redirect to `/onboarding` before `/dashboard`

---

### 2.8 — Invoice / Receipt Page
**Route:** `/billing/invoice/:invoiceId`
**Zone:** Blank layout (print-optimized)
**Guard:** `AuthGuard`

**Purpose:** Buyers need downloadable/printable receipts for their subscription payments.

**Content:**
- Promptly logo + brand header
- Invoice number, date, due date
- Billed To: user name and email
- Line items: plan name, billing period, amount
- Subtotal, tax (if applicable), total
- Payment method (last 4 digits of card via Stripe)
- "Paid" status badge
- Footer: company address, support email

**Actions:**
- "Download PDF" button — uses browser `window.print()` with print-specific CSS
- "Email Receipt" button — triggers API call to resend confirmation email

**Print CSS:**
- `@media print` — hide all navigation, action buttons, header/footer
- Show only the invoice content
- Break page correctly for long invoices

**Data source:** Stripe invoice object via `/api/payments/invoice/:invoiceId`

**Acceptance criteria:**
- [ ] Invoice renders with real data from Stripe
- [ ] Print/Download shows clean invoice without UI chrome
- [ ] Only the invoice owner can view it (auth check on API)
- [ ] Accessible link from `/settings/billing` page

---

### 2.9 — Usage Analytics Page
**Route:** `/dashboard/analytics`
**Zone:** User Dashboard (`UserLayout`)
**Guard:** `AuthGuard`

**Purpose:** Show users their personal usage data — prompts used, credits spent, vault size, activity over time.

**Content:**
- Date range selector (last 7 days / 30 days / 90 days)
- Stat cards row: Total Prompts Used | Credits Spent | Prompts Unlocked | Prompts Favorited
- Chart: Credits usage over time (line chart)
- Chart: Prompts by category (bar chart or donut)
- Table: Recent activity (last 20 prompt actions) — using `Timeline` component

**Data sources:**
- Credits: `creditTransactions` collection filtered by `userId`
- Prompts: `userUnlocks`, `userFavorites` collections
- Activity: `activityLog` or derive from transaction timestamps

**Acceptance criteria:**
- [ ] Date range filter updates all charts and stats
- [ ] Charts render correctly in dark mode
- [ ] Stats match what's visible on other pages (no discrepancy)
- [ ] Works on mobile (charts scale down, stats stack vertically)

---

## Zone 3 — Public Pages

---

### 2.10 — FAQ Page
**Route:** `/faq`
**Zone:** Public (`Header` + `Footer`)
**Priority: High** — reduces support tickets and adds SEO value

**Content structure:**
- Hero: "Frequently Asked Questions" with a search input to filter questions
- Sections using `Accordion` component:
  - **General** — What is Promptly? How does it work? Is it free?
  - **Billing** — What payment methods are accepted? How do I cancel? Can I get a refund?
  - **AI Builder** — What models are supported? How many credits does generation use?
  - **Affiliate Program** — How do I earn? When are withdrawals processed? Minimum payout?
  - **Privacy & Security** — Is my data safe? Do you store my prompts?

**Search:**
- Client-side filter — no API needed
- Filters accordion items whose `title` or `description` matches the search query
- Shows "No results for X" EmptyState if no match

**Admin management:**
- FAQ content should be manageable from admin panel (future: `/admin/faq` page or from `/admin/site-pages`)
- For now: hardcoded content in a `faqData.ts` file that admin can edit via code

**SEO:**
- Add `FAQPage` JSON-LD schema to `<head>`
- Each question/answer maps to `mainEntity` array in the schema

**Acceptance criteria:**
- [ ] Search filters questions in real time
- [ ] "No results" EmptyState shows correctly
- [ ] All accordion sections work
- [ ] FAQPage JSON-LD schema present in page source
- [ ] Page is accessible via header navigation link

---

### 2.11 — Changelog Page (Public)
**Route:** `/changelog`
**Zone:** Public (`Header` + `Footer`)
**Priority: Medium** — builds trust and product authority

**Content structure:**
- Hero: "What's New in Promptly"
- List of releases, newest first, using `Timeline` component
- Each release entry:
  - Version badge (e.g., `v2.4.0`)
  - Date (formatted: "May 10, 2026")
  - Release title (e.g., "Theme Customizer & Dark Mode Improvements")
  - Categorized list:
    - ✅ Added (green)
    - 🔧 Improved (blue)
    - 🐛 Fixed (yellow)
    - ⚠️ Breaking (red)
- Link to previous version or full GitHub diff (optional)

**Data source:**
- Hardcoded `changelogData.ts` file OR Firestore `changelog` collection (admin creates entries)
- If using Firestore: admin creates entries from `/admin/blog` or dedicated `/admin/changelog` route

**Acceptance criteria:**
- [ ] Releases display newest-first
- [ ] Color-coded categories (Added/Improved/Fixed/Breaking)
- [ ] Page links from the site footer
- [ ] Renders correctly on mobile

---

### 2.12 — Status Page
**Route:** `/status`
**Zone:** Public (`Header` + `Footer`)
**Priority: Low** — nice-to-have, visible trust signal

**Content:**
- "All Systems Operational" / "Degraded Performance" / "Partial Outage" headline with colored indicator
- Service status table:
  - Promptly Web App
  - AI Builder API
  - Payment Processing (Stripe)
  - Authentication (Firebase)
  - CDN / File Storage
- Incident history: last 5 incidents with resolution notes

**Data source:**
- For MVP: hardcoded JSON in `statusData.ts` that is manually updated
- Future: integrate with Upptime or a status page service

**Acceptance criteria:**
- [ ] All services listed with status indicators
- [ ] Overall status headline matches worst service status
- [ ] Page loads without authentication

---

## Zone 4 — Admin Pages

---

### 2.13 — Analytics Deep-Dive Page
**Route:** `/admin/analytics`
**Zone:** Admin Panel (`AdminLayout`)
**Guard:** `AuthGuard` + `AdminGuard`

**Content:**
- Page views over time (line chart)
- Traffic sources (organic, direct, referral, social) — pie chart
- Top pages by views (bar chart)
- User registration funnel (registered → onboarded → upgraded) — funnel chart
- Geographic distribution (users by country) — table with flags
- Retention: new vs. returning users chart

**Data source:**
- Analytics from Google Analytics 4 via GA Reporting API, OR
- Firestore events (page views tracked manually in `App.tsx` on route change)
- For MVP: mock data from `src/_mock/` that mirrors real GA structure

**Acceptance criteria:**
- [ ] All charts render in dark mode
- [ ] Date range picker filters all charts
- [ ] Mobile layout stacks charts vertically

---

### 2.14 — Media Library Page
**Route:** `/admin/media`
**Zone:** Admin Panel (`AdminLayout`)
**Guard:** `AuthGuard` + `AdminGuard`

**Content:**
- Upload area: drag-and-drop + click-to-browse (uses `FileInput` component from Phase 3)
- Grid of uploaded assets (thumbnails for images, file icon for others)
- Filters: All | Images | Documents | Videos
- Search by filename
- Each asset: thumbnail, filename, file size, upload date, copy URL button, delete button
- Bulk selection: checkbox on each + bulk delete action

**Data source:** Firebase Storage — list files from a `media/` folder

**Acceptance criteria:**
- [ ] File upload writes to Firebase Storage and Firestore (metadata)
- [ ] Copy URL copies the Firebase Storage download URL
- [ ] Delete removes from both Storage and Firestore
- [ ] Only image files show thumbnails; others show file-type icons
- [ ] Bulk delete prompts confirmation via `ConfirmModal`

---

### 2.15 — Roles & Admin Users Page
**Route:** `/admin/roles`
**Zone:** Admin Panel (`AdminLayout`)
**Guard:** `AuthGuard` + `AdminGuard` (super-admin only)

**Purpose:** Currently, adding admin users requires direct Firestore access. This page provides a UI.

**Content:**
- List of current admin users (DataTable): name, email, role, date added, status
- "Add Admin" button → modal with email input + role selector (admin | super-admin | moderator)
- Revoke admin access button (per row) → ConfirmModal
- Role changes: dropdown to change user's role inline

**Data source:**
- `users` collection filtered by `role !== 'user'`

**Security note:**
- Only super-admin users can access this page
- The role change API endpoint must verify the requesting user is a super-admin server-side

**Acceptance criteria:**
- [ ] Adding an admin by email works (updates `users/{uid}.role`)
- [ ] Revoking access removes admin role (sets back to `'user'`)
- [ ] Super-admin cannot revoke their own role via this page
- [ ] API endpoint validates requester is super-admin

---

### 2.16 — API Keys Management Page
**Route:** `/admin/api-keys`
**Zone:** Admin Panel (`AdminLayout`)

**Purpose:** Generate, view, and revoke user-facing API tokens for programmatic access to Promptly.

**Content:**
- List of generated API keys: name, key prefix (first 8 chars + `...`), created date, last used, status
- "Generate New Key" button → modal: key name input → shows full key ONCE with copy button and warning "This key will not be shown again"
- Revoke key: ConfirmModal, sets `status: 'revoked'` on the key document

**Data source:** `apiKeys` Firestore collection: `{ userId, name, keyHash, prefix, createdAt, lastUsedAt, status }`

**Security note:**
- Store only a hash of the key in Firestore (never the raw key)
- Show the raw key only once at generation time (derive from a secret + random bytes, then hash for storage)

**Acceptance criteria:**
- [ ] Generated key is shown exactly once with copy button
- [ ] Stored key in Firestore is a hash, not the raw value
- [ ] Revoked keys cannot be used for API authentication
- [ ] Last used timestamp updates on API use

---

## Page Completion Checklist

Before marking any page as complete:

- [ ] Correct layout and zone (Public/User/Admin)
- [ ] Route is registered in `App.tsx`
- [ ] Correct route guard applied
- [ ] Page renders in light mode
- [ ] Page renders in dark mode
- [ ] Page renders in RTL mode
- [ ] Mobile layout works (320px–768px)
- [ ] Loading state (Skeleton or Spinner) shown during data fetch
- [ ] Empty state shown when no data exists
- [ ] Error state shown if data fetch fails
- [ ] Page title updates (`document.title`) for the route
- [ ] Added to nav or accessible via a link from a related page

---

*Feeds into: `STEP_03_FEATURE_DEVELOPMENT.md` (features that live on these pages), `STEP_06_PRODUCTION_CHECKLIST.md` (SEO + accessibility verification per page)*
