# Promptly — Competitive UI & Feature Update Plan

**Date:** 2026-05-09
**Goal:** Match and exceed the top-selling ThemeForest admin/SaaS templates
**Scope:** UI components, missing pages, features, theme customizer, competitive gaps

---

## Reference Templates

| Template | Stack | ThemeForest Sales | Strength |
|---|---|---|---|
| [Ecme](https://ecme-react.themenate.net/ui-components/button) | React + Vite + TS | Top 10 | Component library depth, clean design system |
| [Able Pro](https://ableproadmin.com/react/dashboard/default) | React + Material UI | Top 5 | Dashboard widgets, data visualization |
| [Skote](https://skote-v-light.react.themesbrand.com/ui-alerts) | React | Top 10 | Alert/feedback system, admin patterns |
| [Velzon](https://themesbrand.com/velzon/html/master/ui-buttons.html) | HTML/Bootstrap | #1 Themesbrand | Button system depth, 8+ button variants |
| [Vuexy](https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/user-interface/components/) | Next.js + MUI | #1 Pixinvent | Documentation quality, component coverage |

---

## Current Component Inventory — What We Have

### ✅ Primitives (`src/components/primitives/`)

| Component | Variants / Features | Competitive Grade |
|---|---|---|
| `Button` | 7 variants, 5 sizes, 5 rounding, loading, icons | 🟡 A- (missing soft, gradient, link) |
| `Badge` | 7 variants, 3 sizes, dot, pulse | ✅ A |
| `Card` | 4 variants, 4 paddings, interactive hover | 🟡 B+ (no sub-components) |
| `Input` | 3 variants, 3 sizes, icons, loading, success, error | ✅ A |
| `Textarea` | Exists | 🟡 B (needs char counter, autoResize) |
| `Select` | Exists | 🟡 B (needs searchable, multi-select) |
| `Checkbox` | Exists | 🟡 B (needs indeterminate state) |
| `Avatar` + `AvatarGroup` | 5 sizes, 4 status colors | ✅ A |
| `Skeleton` | 3 variants, text multi-line | ✅ A |
| `Divider` | Exists | 🟡 B (needs label divider) |

### ✅ Forms (`src/components/forms/`)

| Component | Status |
|---|---|
| `Switch` | ✅ 3 sizes, animated spring, label + description |
| `ImageUpload` | ✅ Exists |

### ✅ Overlays (`src/components/overlays/`)

| Component | Status |
|---|---|
| `Dialog` | ✅ 5 sizes, keyboard dismiss, footer, spring animation |
| `Drawer` | ✅ Left/right, spring animation, footer |
| `CustomizerDrawer` | 🟡 Exists but incomplete (see Customizer section) |

### ✅ Feedback (`src/components/feedback/`)

| Component | Status |
|---|---|
| `EmptyState` | ✅ 3 presets, motion, action slot |
| `ComponentErrorBoundary` | ✅ Exists |

### ✅ Data & Layout

| Component | Status |
|---|---|
| `StatCard` | ✅ Trend indicator, % change |
| `Banner` | ✅ Exists |
| `DataTable` | ✅ Search, sort, CSV export, bulk select, pagination |
| `AdminPageHeader` | ✅ Label, title, subtitle, actions |
| `AdminGlobalSearch` | ✅ Ctrl+K spotlight, grouped results |
| `AdminShortcutsModal` | ✅ Keyboard reference panel |
| `AdminNotificationBell` | ✅ Exists |
| `AdminBreadcrumb` | ✅ Exists |
| `ConfirmModal` | ✅ useConfirm() promise pattern |

### ✅ Infrastructure Already Built

| Feature | Status |
|---|---|
| Dark / Light / System mode | ✅ UIProvider + CSS vars |
| 5 primary color themes | ✅ Violet, Blue, Emerald, Rose, Amber |
| Border radius control | ✅ 0–16px via CSS var `--radius` |
| Boxed / Full layout | ✅ UIProvider config |
| Vertical / Horizontal nav | ✅ UIProvider config |
| RTL support | ✅ `rtl:` classes on Customizer |
| Language switching | ✅ i18n + UIProvider |
| Sidebar collapsed | ✅ UIProvider config |
| Persistent config | ✅ localStorage |
| PWA install prompt | ✅ Exists |

---

## Gap Analysis — What Needs to Be Added

---

### 🔴 SECTION 1: Missing UI Primitives (Phase 1 — Build First)

---

#### 1.1 `Alert` — `src/components/feedback/Alert.tsx`

All 5 reference templates ship this. Currently Promptly re-creates inline alert banners in every page that needs one.

```
Variants:  success | warning | error | info
Features:  icon, title, description, dismissible ×, soft/solid mode, border-left accent variant
Where used today (hardcoded):
  - AdminSettings save confirmation
  - Form validation messages
  - Subscription status notices in BillingSettings
  - Campaign send status in AdminMarketing
```

---

#### 1.2 `Tabs` — `src/components/navigation/Tabs.tsx`

Every premium template has a Tab primitive. Promptly currently reimplements tabs inline with inconsistent styling on 6+ pages.

```
Variants:  line (underline), pill (rounded bg), card (boxed), soft
Features:  controlled + uncontrolled, keyboard nav (← →), disabled state, badge count on tab
Where used today (hardcoded):
  - AdminUserDetails (Overview / Security / Credits tabs)
  - AdminMarketing (Contacts / Tags / Segments / Automations)
  - AccountSettings (Profile / Security / Notifications)
  - DashboardPage (Library / Favorites / Builder tab switcher)
```

---

#### 1.3 `Tooltip` — `src/components/overlays/Tooltip.tsx`

No hover tooltip exists anywhere. Icon-only buttons are inaccessible without labels, and shortcut hints cannot be surfaced.

```
Variants:  dark | light | primary
Features:  placement (top/bottom/left/right/auto), delay, max-width, arrow pointer, portal rendering
Where needed:
  - All icon-only buttons in admin sidebar and table actions
  - DataTable column header sort indicators
  - Credit balance display in header
  - Sidebar nav badges explanation
```

---

#### 1.4 `Progress` — `src/components/feedback/Progress.tsx`

Progress bars are hardcoded in 4+ places with different heights, colors, and animation.

```
Variants:  bar (horizontal) | circular (ring)
Features:  value %, animated fill, color (primary/success/warning/danger), striped+animated stripe,
           label inside/outside, size (sm/md/lg)
Where used today (hardcoded):
  - AffiliatePage milestone tracker
  - UserLayout credit usage bar
  - DashboardPage credits/vault/builder mini-bars
  - DashboardBuilder completion indicator
```

---

#### 1.5 `Spinner` — `src/components/feedback/Spinner.tsx`

Loading states use raw `animate-spin` + Loader2 or manual `border-t-white animate-spin` divs everywhere.

```
Sizes:   xs | sm | md | lg | xl
Colors:  primary | white | muted
Modes:   inline (next to text) | overlay (full container/full screen)
Where used today (hardcoded):
  - SupportPage send reply and ticket create
  - CheckoutPage Cashfree loading
  - AffiliatePage withdraw
  - DashboardBuilder generation (manual border spinner)
```

---

#### 1.6 Button System — Add 3 Missing Variants

Add to existing `src/components/primitives/Button.tsx`:

| Variant | Style | Used for |
|---|---|---|
| `soft` | Muted bg + colored text, no border | Secondary CTAs (all premium templates have this) |
| `gradient` | `linear-gradient(135deg, hsl(258…), hsl(280…))` | Primary hero CTAs (used inline on 8 pages currently) |
| `link` | Text-only, underline on hover | Inline text links, nav links |

Also add `ButtonGroup` wrapper (`src/components/primitives/ButtonGroup.tsx`) that merges borders and handles first/last/middle radius for a segmented control.

---

#### 1.7 Card Sub-components

Add to existing `src/components/primitives/Card.tsx`:

```
Card.Header  — sticky header with title slot and action slot
Card.Body    — flex-1 overflow scroll are
Card.Footer  — sticky bottom with border-t
Variant: raised — stronger shadow (shadow-lg shadow-black/8)
Variant: flat   — no shadow, very subtle bg (bg-muted/20)
```

---

### 🟡 SECTION 2: Medium Priority Components (Phase 2)

---

#### 2.1 `Accordion` — `src/components/navigation/Accordion.tsx`
Vuexy, Ecme, Skote all ship this. Useful for FAQ, settings panels, filter groups.

```
Features: single/multi open, animated height (motion), custom trigger, icon rotate, disabled item
Where needed: FAQ page, AdminSettings sub-sections, ExplorePage filter groups
```

---

#### 2.2 `Chip` — `src/components/primitives/Chip.tsx`
Different from Badge — interactive, removable, used for multi-select and tag display.

```
Variants: filled | outline | soft
Features: removable (×), clickable active state, icon left, size sm/md/lg, color variants
Where needed: TagInput (replace raw divs), ExplorePage category filters, AdminMarketing tags, Search filters
```

---

#### 2.3 `Timeline` — `src/components/data/Timeline.tsx`
Ecme and Vuexy both ship Timeline. AdminActivityLog uses DataTable rows which loses the visual story.

```
Features: icon per event, colored dot, connector line, timestamp right-aligned, compact/comfortable density
Where needed: AdminActivityLog (replace DataTable), CreditHistoryPage alternate view, user notification feed
```

---

#### 2.4 `Pagination` standalone — `src/components/data/Pagination.tsx`
DataTable has inline pagination but it can't be reused for ExplorePage or any list outside DataTable.

```
Features: page count, prev/next arrows, ellipsis, jump-to-page, page size selector, total count label
Where needed: ExplorePage prompt grid, AdminBlog list, any future paginated list
```

---

#### 2.5 `Rating` — `src/components/primitives/Rating.tsx`
Star rating for prompt quality. Prompts show only `likesCount` as a number — a visual star rating on PromptCard and PromptDetailPage is a major UX upgrade.

```
Features: read-only display (half-star), interactive (click to rate), size sm/md/lg, color override
Where needed: PromptCard, PromptDetailPage, LandingPage testimonials
```

---

#### 2.6 `Popover` — `src/components/overlays/Popover.tsx`
Floating panel anchored to a trigger — needed for filter dropdowns, user mention pickers.

```
Features: placement, click/hover trigger, arrow, portal rendering, close on outside click + Escape
Where needed: AdminMarketing campaign send options, filter dropdowns, column settings in DataTable
```

---

### 🟢 SECTION 3: Low Priority / Polish (Phase 3)

- `Stepper` — Multi-step form progress (checkout, onboarding wizard)
- `ColorPicker` — Visual hex picker for AdminSettings branding
- `NumberInput` — Increment/decrement with +/- buttons (quantity, credit amount)
- `DatePicker` — Calendar-based date selection (campaign schedule, date filters)
- `Divider` enhancement — Add `label` prop for section dividers like `——— or ———`
- `Textarea` — Add `autoResize` prop and character counter
- `Select` — Add `searchable` and `multi` modes

---

## SECTION 4: Missing Pages — Full List

### 4.1 Error / Utility Pages

| Page | Route | Status | Why Needed |
|---|---|---|---|
| 404 Not Found | `*` | ✅ Exists | — |
| 403 Unauthorized | `/403` | ❌ Missing | Admin route guards should redirect here instead of `/` |
| 500 Server Error | `/500` | ❌ Missing | API failures, Firebase down scenarios |
| Maintenance | `/maintenance` | ❌ Missing | Toggle via AdminSettings to put site in maintenance mode |
| Coming Soon | `/coming-soon` | ❌ Missing | Placeholder for features in development |
| Offline | `/offline` | ❌ Missing | PWA offline fallback (service worker registered) |

**Implementation:** All 5 missing pages are static — no Firestore queries. Each follows the same pattern: centered icon + headline + description + back/home button. 2–3 hours of work.

---

### 4.2 User Dashboard Pages

| Page | Route | Status | Priority |
|---|---|---|---|
| Vault (unlocked prompts) | `/vault` | ✅ Exists | — |
| My Library | `/dashboard/library` | ✅ Exists | — |
| Favorites | `/dashboard/favorites` | ✅ Exists | — |
| AI Builder | `/builder` | ✅ Exists | — |
| Affiliate Dashboard | `/affiliate/dashboard` | ✅ Exists | — |
| Credits / Transactions | `/credits` | ✅ Exists | — |
| Support / Tickets | `/support` | ✅ Exists | — |
| **Notification Center** | `/notifications` | ❌ Missing | Medium — all premium templates have this |
| **Changelog / Updates** | `/changelog` | ❌ Missing | Low — shows platform release notes |
| **Onboarding Wizard** | `/onboarding` | ❌ Missing | High — first-time user setup, major retention driver |
| **Invoice / Receipt** | `/billing/invoice/:id` | ❌ Missing | Medium — downloadable/printable billing receipt |
| **Usage Analytics** | `/dashboard/analytics` | ❌ Missing | Low — personal usage charts (prompts used, credits) |

---

### 4.3 Public / Marketing Pages

| Page | Status | Notes |
|---|---|---|
| Landing Page | ✅ Exists | Needs Testimonials section (uses Rating component) |
| Pricing | ✅ Exists | Needs annual/monthly toggle |
| Blog | ✅ Exists | — |
| Blog Detail | ✅ Exists | — |
| Contact | ✅ Exists | — |
| Affiliate Info | ✅ Exists | — |
| Terms | ✅ Exists | — |
| Privacy | ✅ Exists | — |
| DMCA | ✅ Exists | — |
| Cookies | ✅ Exists | — |
| **FAQ** | ❌ Missing | High — reduces support tickets, SEO value |
| **Changelog** | ❌ Missing | Medium — builds trust and product authority |
| **Status Page** | ❌ Missing | Low — shows Firebase/API uptime |

---

### 4.4 Admin Pages

| Page | Route | Status | Notes |
|---|---|---|---|
| Overview | `/admin` | ✅ Exists | — |
| Users | `/admin/users` | ✅ Exists | — |
| User Details | `/admin/users/:id` | ✅ Exists | — |
| Prompts | `/admin/prompts` | ✅ Exists | — |
| Categories | `/admin/categories` | ✅ Exists | — |
| Models | `/admin/models` | ✅ Exists | — |
| Blog | `/admin/blog` | ✅ Exists | — |
| Templates | `/admin/templates` | ✅ Exists | — |
| Marketing | `/admin/marketing` | ✅ Exists | — |
| Affiliates | `/admin/referrals` | ✅ Exists | — |
| Withdrawals | `/admin/withdrawals` | ✅ Exists | — |
| Financials | `/admin/revenue` | ✅ Exists | — |
| Tickets | `/admin/tickets` | ✅ Exists | — |
| Inquiries | `/admin/inquiries` | ✅ Exists | — |
| Emails | `/admin/emails` | ✅ Exists | — |
| Email Settings | `/admin/emails/settings` | ✅ Exists | — |
| Subscriptions | `/admin/subscriptions` | ✅ Exists | — |
| Permissions | `/admin/permissions` | ✅ Exists | — |
| SEO | `/admin/seo` | ✅ Exists | — |
| Site Pages | `/admin/site-pages` | ✅ Exists | — |
| Settings | `/admin/settings` | ✅ Exists | — |
| Activity Log | `/admin/activity` | ✅ Exists | — |
| **Analytics Deep-dive** | `/admin/analytics` | ❌ Missing | Page views, geography, funnel charts |
| **Push Notifications** | `/admin/push` | ❌ Missing | Send browser push to users |
| **Media Library** | `/admin/media` | ❌ Missing | View/manage all uploaded assets |
| **Roles & Admins** | `/admin/roles` | ❌ Missing | UI to add/remove admin users (currently done via Firestore) |
| **API Keys** | `/admin/api-keys` | ❌ Missing | Generate/revoke user API tokens |

---

## SECTION 5: Theme Customizer — Complete Enhancement

### 5.1 Current State

The `CustomizerDrawer` already exposes: Theme Mode, Primary Color (5), Border Radius, Layout Mode, Orientation, Language, Sidebar Collapsed.

The `UIConfig` already has (in context but **not wired to Customizer UI**):
- `sidebarWidth` — 240 | 260 | 280
- `cardShadow` — boolean
- `navbarStyle` — fixed | static | floating
- `contentWidth` — compact | wide

### 5.2 Customizer — What Premium Templates Have That We're Missing

| Option | Ecme | Able Pro | Velzon | Promptly Today | Action |
|---|---|---|---|---|---|
| Theme mode (light/dark/system) | ✅ | ✅ | ✅ | ✅ | — |
| Primary color swatches | ✅ 8+ | ✅ 6+ | ✅ 8+ | 🟡 5 only | Add 5 more colors |
| Custom hex color input | ✅ | ✅ | ✅ | ❌ | Add hex input |
| Border radius | ✅ | ✅ | ✅ | ✅ | — |
| Layout (boxed/full) | ✅ | ✅ | ✅ | ✅ | — |
| Sidebar width | ✅ | ✅ | ✅ | ❌ (in config, not UI) | Wire to customizer |
| Card shadow toggle | ✅ | ✅ | — | ❌ (in config, not UI) | Wire to customizer |
| Navbar style (fixed/floating/static) | ✅ | ✅ | ✅ | ❌ (in config, not UI) | Wire to customizer |
| Content density (compact/comfortable) | ✅ | ✅ | — | ❌ (in config, not UI) | Wire to customizer |
| Sidebar color scheme | ✅ | ✅ | ✅ | ❌ | Add: dark/light/gradient sidebar |
| Font family | ✅ | — | ✅ | ❌ | Add: Inter/Geist/Outfit/Space Grotesk |
| Preview thumbnails | ✅ | ✅ | ✅ | ❌ | Visual mini-preview per layout option |
| RTL toggle | ✅ | ✅ | ✅ | 🟡 CSS only via `dir` | Add toggle button |
| Language selector | ✅ | — | ✅ | ✅ | — |
| Copy config as JSON | ✅ | — | — | ❌ | Developer export button |
| Reset to default | ✅ | ✅ | ✅ | ✅ | — |

### 5.3 Color Palette — Expand from 5 to 10

```
Current 5:  violet, blue, emerald, rose, amber
Add 5 more: cyan, indigo, purple, orange, teal
```

Each needs HSL values added to `colorTokens` in `UIProvider.tsx`:
```
cyan:   { h: 189, s: 94, l: 43 }
indigo: { h: 239, s: 84, l: 67 }
purple: { h: 271, s: 91, l: 65 }
orange: { h: 25,  s: 95, l: 53 }
teal:   { h: 172, s: 66, l: 41 }
```

### 5.4 Sidebar Color Scheme — New Option

Add `sidebarTheme: 'default' | 'dark' | 'light' | 'gradient'` to `UIConfig`.

```
default   — uses current card/background colors
dark      — dark bg regardless of light/dark mode (sidebar always #0f0f11)
light     — white bg always (sidebar always white)
gradient  — brand gradient from primary dark to primary (like Velzon's sidebar)
```

### 5.5 Font Family — New Option

Add `fontFamily: 'inter' | 'geist' | 'outfit' | 'space-grotesk'` to `UIConfig`.

Apply via `document.documentElement.style.setProperty('--font-sans', ...)` in `applyTokens()`.

### 5.6 Customizer Visual Layout Redesign

Group options into collapsible sections with visual thumbnails:

```
Section 1: Appearance
  ├── Theme Mode     [light] [dark] [system]  (with sun/moon/monitor icons)
  ├── Primary Color  (10 swatches + hex input)
  └── Font Family    (4 cards with font name preview)

Section 2: Layout
  ├── Layout Width   [boxed thumbnail] [full thumbnail]
  ├── Navigation     [vertical thumbnail] [horizontal thumbnail]
  ├── Navbar Style   [fixed] [floating] [static]
  └── Content Width  [compact] [wide]

Section 3: Sidebar
  ├── Width          [240] [260] [280] slider
  ├── Collapsed      toggle switch
  └── Color Scheme   [default] [dark] [light] [gradient] (color swatches)

Section 4: Components
  ├── Border Radius  [square] [slight] [rounded] [pill]  (visual buttons)
  └── Card Shadow    toggle switch

Section 5: Region
  ├── Language       (5 language buttons)
  └── Direction      [LTR] [RTL]  (new toggle)

Footer:
  [Copy Config JSON]  [Reset to Default]
```

---

## SECTION 6: Missing Features (Not Just Components)

### 6.1 Onboarding Wizard — High Priority
First-time users get no guidance. Every top-selling SaaS template includes an onboarding flow.

```
Step 1: Welcome + username setup
Step 2: Choose interests / use case (filters marketplace)
Step 3: Connect model preference (GPT-4, Claude, Gemini)
Step 4: Choose plan (free vs upgrade)
Step 5: Done — redirect to vault

Store `hasCompletedOnboarding: boolean` on user profile.
Show wizard if `!profile.hasCompletedOnboarding`.
```

---

### 6.2 Notification Center — Medium Priority
Currently AdminNotificationBell exists only in admin. Users have no notification system.

```
User notifications:
  - "Your withdrawal was approved"
  - "New credit reward available"
  - "Admin replied to your ticket #123"
  - "Your referral converted to Pro"

Firestore collection: notifications/{notificationId}
  { userId, title, body, type, readAt, createdAt, link }

UI: Bell icon in UserLayout header with unread dot badge
    Dropdown with notification list + mark-all-read
    Full /notifications page for history
```

---

### 6.3 FAQ Page — High Priority (SEO + Support Reduction)

```
Route: /faq
Public page (Header + Footer layout)
Uses: Accordion component
Sections: General / Billing / AI Builder / Affiliate / Privacy
Admin control: FAQ items editable from AdminSitePages or new /admin/faq route
```

---

### 6.4 Changelog Page — Medium Priority

```
Route: /changelog
Public page listing product updates by version/date
Admin creates entries from /admin/blog or a dedicated /admin/changelog
Uses: Timeline component
Format: Version tag + date + list of changes (New / Improved / Fixed)
```

---

### 6.5 Cookie Consent Banner — Compliance (GDPR)

```
CookiePolicyPage exists but there's no consent banner.
Show on first visit: a fixed bottom bar with "Accept" / "Manage" / "Reject"
Store consent in localStorage: { analytics: bool, marketing: bool, functional: bool }
Block NeuralMarketingScripts (GA/FB pixel) until consent is given
```

---

### 6.6 Maintenance Mode Toggle

```
Admin can toggle `configs/global.maintenanceMode = true` in AdminSettings.
App.tsx checks this on load: if maintenanceMode && !isAdmin → render /maintenance page.
Show estimated return time and status message configurable from admin.
```

---

### 6.7 Announcement Banner

```
A dismissible top banner above the header for site-wide announcements.
Configurable from AdminSettings: text, color, link, enabled flag.
Stored in configs/global.announcement = { text, href, color, enabled }
Dismissed state in localStorage to not re-show after user closes.
```

---

### 6.8 Guided Tour / Help Overlay

```
A "?" help button in UserLayout header (not just admin shortcuts).
Clicking opens an overlay that highlights key UI regions with
step-by-step callouts (similar to Shepherd.js or custom simple version):
  Step 1: "This is your Vault — all unlocked prompts"
  Step 2: "Use the AI Builder to generate prompts"
  Step 3: "Earn credits by sharing your referral link"
```

---

### 6.9 DataTable — Column Visibility Toggle

```
A "Columns" dropdown button in DataTable toolbar (next to Export).
Clicking shows a checklist of all column keys.
Hidden columns are excluded from render and CSV export.
State persisted in sessionStorage per table.
```

---

### 6.10 Annual/Monthly Pricing Toggle

```
PricingPage currently shows monthly prices only.
Add a toggle switch (Monthly / Annual) with "Save 20%" badge.
Annual prices = monthly × 10 (2 months free).
```

---

## SECTION 7: Implementation Priority Roadmap

### Sprint 1 — Foundation (highest ROI)
| Item | File | Effort |
|---|---|---|
| `Alert` component | `src/components/feedback/Alert.tsx` | 2h |
| `Spinner` component | `src/components/feedback/Spinner.tsx` | 1h |
| `Progress` component | `src/components/feedback/Progress.tsx` | 2h |
| Button: `soft` + `gradient` + `link` variants | `Button.tsx` | 1h |
| Customizer: Wire 4 existing UIConfig options | `CustomizerDrawer.tsx` | 2h |
| Customizer: Expand to 10 colors + hex input | `UIProvider.tsx` + `CustomizerDrawer.tsx` | 3h |
| FAQ page | `src/pages/FAQPage.tsx` | 3h |
| Error pages (403, 500, Maintenance, Coming Soon) | 4 new files | 3h |

### Sprint 2 — Component Library
| Item | File | Effort |
|---|---|---|
| `Tabs` component | `src/components/navigation/Tabs.tsx` | 3h |
| `Tooltip` component | `src/components/overlays/Tooltip.tsx` | 3h |
| Card sub-components | `Card.tsx` | 2h |
| `Accordion` component | `src/components/navigation/Accordion.tsx` | 2h |
| `Chip` component | `src/components/primitives/Chip.tsx` | 2h |
| Cookie consent banner | `src/components/CookieConsent.tsx` | 3h |
| Announcement banner | `src/components/AnnouncementBanner.tsx` | 2h |
| Pricing: Annual/Monthly toggle | `PricingPage.tsx` | 2h |

### Sprint 3 — Features
| Item | Effort |
|---|---|
| Notification center (Firestore + UI) | 6h |
| Onboarding wizard | 5h |
| Changelog page | 3h |
| Customizer: Sidebar color scheme + font selector | 3h |
| Customizer: Visual preview thumbnails | 4h |
| DataTable: Column visibility toggle | 3h |
| `Timeline` component | 3h |
| Maintenance mode toggle in AdminSettings | 2h |

### Sprint 4 — Advanced
| Item | Effort |
|---|---|
| `Rating` component + add to PromptCard | 3h |
| `ButtonGroup` component | 2h |
| `Pagination` standalone | 3h |
| Admin: Roles & Admins page | 4h |
| Admin: Media Library page | 5h |
| LandingPage: Testimonials section with Rating | 3h |
| User: Usage Analytics page | 4h |

---

## SECTION 8: Pages That Need Existing-Component Migration

Once new primitives are built, refactor these pages to use them:

| Page | Inline Pattern | Target Component |
|---|---|---|
| `AffiliatePage.tsx` | Hardcoded progress bar | `Progress` |
| `UserLayout.tsx` | Hardcoded credit bar | `Progress` |
| `DashboardPage.tsx` | 3 inline mini progress bars | `Progress` |
| `SupportPage.tsx` | Manual `border-t-white animate-spin` | `Spinner` |
| `AdminUserDetails.tsx` | Custom tab switcher (Overview/Security/Credits) | `Tabs` |
| `AdminMarketing.tsx` | Custom tab switcher | `Tabs` |
| `AccountSettings.tsx` | Inline tab buttons | `Tabs` |
| `AdminSettings.tsx` | Inline alert banners | `Alert` |
| `AdminActivityLog.tsx` | DataTable for events | `Timeline` |
| `CreditHistoryPage.tsx` | List view only | `Timeline` (alternate) |
| All icon-only admin buttons | No accessible label | `Tooltip` |
| `LandingPage.tsx` | `likesCount` numbers | `Rating` stars |
| `PromptCard.tsx` | Like count number | `Rating` display |

---

## Summary — Competitive Assessment

| Dimension | Current Grade | After All Sprints |
|---|---|---|
| Core primitives | B+ (7/12 complete) | A (12/12) |
| Button system | B (missing 3 variants) | A |
| Form components | B | A- |
| Overlay / Modal | A | A |
| Data components | B+ | A |
| Theme customizer | C+ (partial, 5 colors) | A (10 colors, fonts, sidebar themes) |
| Missing pages | C (4 error pages missing) | A |
| User features | B (no notifications, no onboarding) | A |
| Admin completeness | A- (22 pages) | A |
| Competitive position | Top 30% of ThemeForest | Top 5% |

**Highest-ROI items that make the biggest difference vs competitors:**
1. `Alert` + `Tabs` + `Tooltip` — removes all inline reimplementations (Sprint 1–2)
2. Customizer expanded to 10 colors + sidebar themes + font picker (Sprint 1–3)
3. Onboarding wizard — major user retention and activation driver (Sprint 3)
4. FAQ page — SEO value + ticket reduction (Sprint 1)
5. Cookie consent + Announcement banner — compliance + marketing (Sprint 2)

# ?? UI Infrastructure Update Complete
All sprints have been successfully implemented.

# ?? UI Infrastructure Update Complete
All sprints have been successfully implemented. The platform is now growth-optimized and technically robust.
