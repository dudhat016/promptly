# Promptly — Platform Modernization Roadmap

> Organized by implementation phase. Each task is self-contained with scope, deliverables, and checklists.
> **Tech stack**: React 19, Tailwind CSS v4, Vite, Firebase, Express, TypeScript.

---

## Task 1: Component Architecture Reorganization ✅

### Scope
Restructure `src/components/ui` from a flat folder into categorized directories and add universal polymorphism to all primitives.

### Current State
- 8 files in a flat `src/components/ui/` directory (Button, Input, Select, Textarea, Checkbox, ImageUpload, Breadcrumbs, PageShell).
- Only `Button` supports the `as` prop for polymorphism.

### Deliverables
- [ ] Create categorized directories:
  ```
  src/components/
  ├── primitives/    → Button, Input, Select, Textarea, Checkbox, Badge, Skeleton, Avatar, Divider
  ├── forms/         → FormGroup, SearchBar, MultiSelect, Switch, DatePicker, Stepper, FileInput
  ├── navigation/    → Breadcrumbs, Tabs, Sidebar, DesktopNav
  ├── feedback/      → ConfirmModal, ToastProvider, ProgressTracker, EmptyState, Tooltip, Popover
  ├── overlays/      → Dialog, Drawer, ShareModal
  ├── data/          → DataTable, StatCard, ActivityFeed, ChartWrapper, Banner
  ```
- [ ] Extend `as` prop pattern to `Input`, `Textarea`, and `Card` with `ComponentPropsWithRef` for type-safety.
- [ ] Update all import paths across the project.

### New UI Components to Build
| Category | Component | Purpose |
|---|---|---|
| Primitives | `Badge` (Advanced) | Dot indicators, pulsing status, outline/soft variants |
| Primitives | `Skeleton` | Standardized loading placeholders |
| Primitives | `Avatar` / `AvatarGroup` | User presence in comments, assignments |
| Primitives | `Divider` | With optional text/icon center-labels |
| Primitives | `Tooltip` / `Popover` | Floating UI for advanced positioning |
| Forms | `Switch` | Premium toggle for settings |
| Forms | `MultiSelect` | Tags/chips within a dropdown |
| Forms | `DatePicker` / `DateRangePicker` | Integrated with `date-fns` |
| Forms | `FileInput` (Drag & Drop) | Multiple file types |
| Forms | `Stepper` | Multi-step onboarding/payment flows |
| Data | `StatCard` | KPIs with sparkline and percentage changes |
| Data | `ActivityFeed` | Chronological event logs |
| Data | `Banner` | Global notifications, maintenance alerts |
| Feedback | `EmptyState` | Standardized empty lists/tables |
| Overlays | `Dialog` (Advanced) | Multiple sizes, scrollable, sticky header/footer |
| Overlays | `Drawer` | Side-panel for detail views |

---

## Task 2: Design Token System & Theme Engine ✅

### Scope
Centralize all design tokens, extract variant logic from components, and build a dynamic `UIProvider`.

### Current State
- `index.css` uses `@theme` with HSL CSS variables for light/dark mode.
- Variant logic (colors, sizes) is hardcoded inside each component file.
- No runtime theme customization beyond dark/light toggle.

### Deliverables
- [ ] Create `src/utils/theme.ts` — centralized variant maps for Button, Badge, Input (eliminates duplicated Tailwind strings).
- [ ] Build `UIProvider` context that injects `--radius`, `--primary`, `--sidebar-width` as CSS variables on `<html>`.
- [ ] Implement merged themes: `systemTheme` (base) + `userTheme` (overrides) at runtime.
- [ ] Create `src/lib/animations.ts` — shared `initial`, `animate`, `transition` presets for consistent motion.

---

## Task 3: Data-Driven UI & Mock Layer ✅

### Scope
Introduce a mock data layer and refactor tables/dashboards to be configuration-driven.

### Deliverables
- [ ] Create `src/_mock/` directory with realistic JSON data and latency simulation helpers.
- [ ] Refactor `DataTable` to accept a `columns` config object defining rendering logic, sorting, and cell types (badge, currency, date).
- [ ] Refactor `AdminOverview` stat cards to use `StatCard` component with data props.
- [ ] Ensure UI development can continue when Firebase/Stripe APIs are unavailable.

---

## Task 4: API Architecture Refactoring ✅

### Scope
Refactor the flat `api/` folder into a scalable, domain-driven architecture with middleware, services, and typed client.

### Current State
```
api/
├── index.ts          (9.8KB — monolithic)
├── routes/           (auth, payments, marketing, support, location)
├── lib/              (firebase, stripe, payouts)
```

### Deliverables

#### Backend
- [ ] Create `api/middleware/auth.ts` — reusable Firebase `verifyIdToken` middleware.
- [ ] Create `api/middleware/validate.ts` — Zod schema validation at middleware level.
- [ ] Create `api/middleware/errorHandler.ts` — consistent `{ success, error, code }` response shape.
- [ ] Create `api/middleware/rateLimit.ts` — per-route rate limiting for login, checkout, password reset.
- [ ] Create `api/services/` — extract business logic from routes into `authService`, `paymentService`, `marketingService`, `supportService`.
- [ ] Create `api/types/api.ts` — shared request/response TypeScript types.
- [ ] Slim down `api/index.ts` to lean router mounting only.

#### Frontend
- [ ] Create `src/lib/api.ts` — centralized API client with:
  - Auto-attached Firebase auth tokens.
  - 401 token refresh handling.
  - Error normalization into user-friendly toast messages.
  - Typed responses matching `api/types/api.ts`.
- [ ] (Optional) Wrap API calls in custom hooks (`usePayments`, `useTickets`) with React Query for caching, refetching, and optimistic updates.

---

## Task 5: Error Handling Strategy ✅

### Scope
Implement comprehensive error handling from component-level boundaries to API error normalization.

### Deliverables
- [ ] Create `ComponentErrorBoundary` — wraps individual widgets (charts, tables, sidebars) with contextual "retry" fallback.
- [ ] Implement consistent API error shape:
  ```ts
  interface ApiError {
    success: false;
    error: string;        // User-friendly message
    code: string;         // Machine-readable (e.g., "AUTH_EXPIRED")
    details?: unknown;    // Validation errors
  }
  ```
- [ ] Map backend Zod validation errors to individual `Input` `error` props on forms.
- [ ] Add optimistic rollback — restore previous field values on submission failure.
- [ ] Add exponential backoff retry for transient failures in checkout and account creation.
- [ ] Implement offline detection with global banner and Firestore offline persistence.

---

## Task 6: Security Hardening

### Scope
Audit and harden authentication, authorization, input handling, and infrastructure security.

### Deliverables

#### Input & Output
- [ ] Sanitize all user-supplied strings server-side before writing to Firestore (prevent stored XSS).
- [ ] Audit `react-markdown` config to block raw HTML injection.

#### Authentication & Authorization
- [ ] Audit all `api/routes/*` for unprotected endpoints — every route must use `authMiddleware`.
- [ ] Enforce admin-only access at middleware level, not just UI rendering.
- [ ] Implement automatic token refresh and force re-login after extended inactivity.

#### Infrastructure ✅
- [x] Lock CORS `Access-Control-Allow-Origin` to production domain(s) only.
- [x] Add `Helmet.js` for security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- [x] Audit `.env` — ensure no server secrets (Stripe key, service account) leak into Vite client bundle. Prefix client-safe vars with `VITE_`.

#### Firestore ✅
- [x] Audit `firestore.rules` — ensure write rules validate data shape, not just authentication.
- [x] Enforce deny-by-default on every collection.

---

## Task 7: Internationalization (i18n) & RTL ✅

### Scope
Add multi-language support with runtime switching and automatic LTR/RTL layout direction.

### Deliverables

#### Setup ✅
- [x] Install `react-i18next`, `i18next`, `i18next-browser-languagedetector`.
- [x] Create `src/i18n/index.ts` with fallback language and namespace config.
- [x] Create locale files: `en.json`, `hi.json`, `ar.json` (RTL), `es.json`, `fr.json`.
- [x] Build `useTranslation` typed wrapper hook.

#### String Extraction (priority order) ✅
- [x] Auth pages: Login, Register, ForgotPassword.
- [x] Dashboard: Vault, Builder, Favorites, Credits.
- [x] Public: LandingPage, PricingPage, ExplorePage, BlogPage.
- [x] Settings: Account, Billing, Security, Notifications.
- [x] Admin: All 37 admin pages — labels, toasts, modals.

#### RTL Layout ✅
- [x] Set `dir="rtl"` on `<html>` dynamically via `useDirection()` hook.
- [x] Replace hardcoded `ml-`/`mr-`/`left-`/`right-` with logical `ms-`/`me-`/`start-`/`end-`.
- [x] Create `DirectionalIcon` wrapper to flip arrows/chevrons in RTL.
- [x] Flip sidebar to right side in RTL mode.
- [x] Reverse slide-in animation directions for RTL.

#### UI ✅
- [x] Build `LanguageSwitcher` dropdown in `UserLayout` header and settings page.
- [x] Persist selected language in `localStorage` with browser auto-detect fallback.

---

## Task 8: Theme Customizer & Multiple Layouts ✅

### Scope
Build a live customizer panel and support multiple layout systems.

### Deliverables

#### Customizer Panel
- [ ] Create `src/store/customizerSlice.ts` (or React Context) with settings:
  | Setting | Options |
  |---|---|
  | Theme Mode | `light` / `dark` / `system` |
  | Primary Color | violet, blue, emerald, rose, amber swatches |
  | Border Radius | `0` / `4` / `8` / `12` / `16` px |
  | Sidebar Width | `240` / `260` / `280` px |
  | Sidebar Collapsed | `true` / `false` (mini sidebar) |
  | Layout Mode | `boxed` / `full-width` |
  | Card Shadow | `on` / `off` |
  | Navbar Style | `fixed` / `static` / `floating` |
  | Content Width | `compact` / `wide` |
- [ ] Build `<CustomizerDrawer />` sliding panel (dev/admin only).
- [ ] Persist settings in `localStorage`, apply via CSS variable injection.

#### Multiple Layouts
- [ ] Create `VerticalLayout` (current `UserLayout` — sidebar + top header).
- [ ] Create `HorizontalLayout` (top navbar with dropdown menus — for landing/marketing).
- [ ] Create `BlankLayout` (no sidebar/header — for auth, 404, print views).
- [ ] Create `LayoutWrapper` that selects layout based on route metadata.

---

## Task 9: Route Guards & Permission System ✅

### Scope
Implement route-level protection and role-based UI rendering.

### Deliverables
- [ ] Create `AuthGuard` HOC — redirects to `/login` if unauthenticated.
- [ ] Create `GuestOnlyRoute` HOC — redirects to `/dashboard` if already authenticated.
- [ ] Create `AdminGuard` HOC — checks `profile.role === 'admin'` at route level.
- [ ] Create `SubscriptionGuard` HOC — redirects free users to `/pricing` for premium features.
- [ ] Define `src/lib/ability.ts` with RBAC permission rules per role (free, pro, admin).
- [ ] (Optional) Integrate `@casl/react` for `<Can>` component-based permission rendering.

---

## Task 10: Mobile Responsiveness Audit ✅

### Scope
Ensure every component and page is fully functional from `320px` to `1920px+`.

### Component Fixes ✅
- [x] `Button` icon-only: enforce `min-w-11 min-h-11` (44px) tap target.
- [x] `Input` / `Select`: ensure `font-size: 16px` minimum (prevents iOS auto-zoom).
- [x] `DataTable`: horizontal scroll container, hide low-priority columns on `sm:`.
- [x] `Modal` / `Dialog`: `max-w-[calc(100vw-2rem)]`, `max-h-[calc(100vh-2rem)]`.
- [x] `Select` dropdown: viewport-aware placement via Floating UI.

### Page Audit Checklist ✅
- [x] **Public**: LandingPage hero scaling, PricingPage grid collapse, AffiliateInfoPage earnings table.
- [x] **Content**: ExplorePage filter sidebar → bottom sheet, BlogPage card grid → single column.
- [x] **Dashboard**: Sidebar overlay on mobile, form layouts stacking, Builder responsive.
- [x] **Settings**: Tab navigation → horizontal scroll or dropdown on mobile.
- [x] **Admin**: Stat cards grid, data tables horizontal scroll, form layouts.
- [x] **Auth**: Padding/margin audit (already single column).

### Rules
- Mobile-first: base styles target `< 640px`, layer up with `sm:`, `md:`, `lg:`.
- Grids: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3` → `xl:grid-cols-4`.
- Typography: `text-2xl` → `md:text-4xl` → `lg:text-5xl` for hero headings.

---

## Task 11: Progressive Web App (PWA) ✅

### Scope
Make Promptly installable with offline support and home screen presence.

### Deliverables
- [ ] Install `vite-plugin-pwa`.
- [ ] Create `public/manifest.json`:
  ```json
  {
    "name": "Promptly — AI Prompt Marketplace",
    "short_name": "Promptly",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0a0a0f",
    "theme_color": "#7c3aed"
  }
  ```
- [ ] Generate PWA icons: `192x192`, `512x512`, and maskable variant.
- [ ] Configure caching strategies:
  - App shell (HTML, CSS, JS): Cache-first.
  - API responses: Network-first with cache fallback.
  - Images/assets: Stale-while-revalidate.
- [ ] Add `<link rel="manifest">` and `<meta name="theme-color">` to `index.html`.
- [ ] Build `InstallPrompt` component — custom "Add to Home Screen" banner.
- [ ] Implement offline experience:
  - Cached pages: Dashboard, Vault, Favorites.
  - Queued actions: form submissions sync when reconnected.
  - Offline banner: "You're offline — changes will sync when reconnected."
- [ ] Target Lighthouse PWA score: 100%.

---

## Cross-Zone Compatibility Reference

Every task above must be validated across all three zones:

| Zone | Layout | Routes | Guard |
|---|---|---|---|
| **Public Landing** | `HorizontalLayout` / `BlankLayout` | `/`, `/explore`, `/blog`, `/pricing` | None |
| **User Dashboard** | `VerticalLayout` (sidebar) | `/dashboard/*`, `/settings/*` | `AuthGuard` |
| **Admin Panel** | `AdminLayout` (sidebar) | `/admin/*` | `AuthGuard` + `AdminGuard` |

### Zone-Specific Priorities

**Public Landing:**
- Code-split `LandingPage.tsx` (46KB — heaviest file).
- Skeleton shimmer for Blog/Explore data fetching.
- Pricing toggle uses standardized `Button`.

**User Dashboard:**
- `EmptyState` fallbacks for Vault, Favorites, Credits.
- `DashboardBuilder` wrapped in `SubscriptionGuard`.
- Full i18n extraction for all Settings pages.

**Admin Panel:**
- All 37 pages use standardized `Button`, `Input`, `Select`, `DataTable`.
- `AdminOverview` charts wrapped in `ComponentErrorBoundary`.
- `AdminLayout` sidebar supports `isCollapse` from Customizer.
- `AdminPermissions` is source of truth for RBAC ability definitions.
