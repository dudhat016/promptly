# Promptly — System Architecture

> Type: Reference — System Design & Data Flow
> Read alongside `DEV_GUIDE.md` before making structural changes.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React SPA)                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Public  │  │User Dashboard│  │     Admin Panel          │   │
│  │  Pages   │  │ /dashboard/* │  │     /admin/*             │   │
│  └──────────┘  └──────────────┘  └──────────────────────────┘   │
│              React Router v6 · React 19 · Tailwind v4            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
          ┌──────────────┴──────────────┐
          │                             │
   ┌──────▼──────┐               ┌──────▼──────┐
   │  Express API │               │  Firebase   │
   │  (Vercel Fn) │               │  Services   │
   │  /api/*      │               │             │
   │              │               │ Firestore   │
   │  Auth Routes │               │ Auth        │
   │  Payment     │               │ FCM (push)  │
   │  Marketing   │               └─────────────┘
   │  Upload FTP  │
   └──────┬───────┘
          │
   ┌──────┴──────────────────────────┐
   │                                 │
   ┌──────▼───────┐          ┌───────▼──────┐
   │  Cashfree    │          │  Hostinger   │
   │  (Payments)  │          │  FTP Storage │
   └──────────────┘          │  (Images)    │
                             └──────────────┘
```

---

## Frontend Architecture

### State Management

No global store (Redux/Zustand). State is managed at three levels:

| Level | Tool | What lives here |
|---|---|---|
| Global | React Context | `UIProvider` (theme), `AuthContext` (user), `CurrencyContext` |
| Server state | Direct Firebase | `onSnapshot` listeners for real-time data |
| Local | `useState` / `useReducer` | Component-level UI state |

### Routing

File: `src/App.tsx`

```
/                          → LandingPage         (HorizontalLayout)
/explore                   → ExplorePage         (HorizontalLayout)
/pricing                   → PricingPage         (HorizontalLayout)
/blog                      → BlogPage            (HorizontalLayout)
/blog/:slug                → BlogDetailPage      (HorizontalLayout)
/contact                   → ContactPage         (HorizontalLayout)
/login                     → LoginPage           (BlankLayout)
/register                  → RegisterPage        (BlankLayout)
/forgot-password           → ForgotPasswordPage  (BlankLayout)
/dashboard                 → DashboardPage       (UserLayout) [AuthGuard]
/dashboard/builder         → DashboardBuilder    (UserLayout) [AuthGuard]
/dashboard/favorites       → DashboardFavorites  (UserLayout) [AuthGuard]
/dashboard/library         → DashboardLibrary    (UserLayout) [AuthGuard]
/dashboard/vault           → MyVaultPage         (UserLayout) [AuthGuard]
/dashboard/ai-studio       → AITwinStudioPage    (UserLayout) [AuthGuard]
/dashboard/usage           → UsagePage           (UserLayout) [AuthGuard]
/dashboard/credits         → CreditHistoryPage   (UserLayout) [AuthGuard]
/settings/*                → SettingsLayout      (UserLayout) [AuthGuard]
/settings/account          → AccountSettings
/settings/billing          → BillingSettings
/settings/security         → SecuritySettings
/settings/notifications    → NotificationSettings
/settings/ai               → AIIntegrationPage
/admin/*                   → AdminLayout         [AuthGuard + AdminGuard]
/profile/:username         → PublicProfilePage   (HorizontalLayout)
/prompt/:id                → PromptDetailPage    (HorizontalLayout)
/onboarding                → OnboardingPage      (BlankLayout) [AuthGuard]
/403                       → ForbiddenPage       (BlankLayout)
/404                       → NotFoundPage        (BlankLayout)
/500                       → ServerErrorPage     (BlankLayout)
/maintenance               → MaintenancePage     (BlankLayout)
```

### Auth Flow

```
User visits protected route
  ↓
AuthGuard checks Firebase Auth state
  ↓ not logged in → /login
  ↓ logged in
OnboardingGuard checks Firestore profile
  ↓ profile incomplete → /onboarding
  ↓ profile complete
AdminRoute (for /admin/* only)
  ↓ role == 'user' → /
  ↓ role == 'admin' → full access to all admin pages
  ↓ role == 'staff' → enters AdminLayout
        ↓
        AdminLayout — filterNavForRole() hides nav items
        for sections not in the user's staffRole
        ↓
        SectionRoute (wraps every admin child route)
        ↓ canAccessSection() == false → /admin (dashboard)
        ↓ canAccessSection() == true  → render page
```

**Staff role lookup:**
`users/{uid}.staffRole` → `configs/staff_roles.roles[].id` → sections array

See `doc/STAFF_ROLES_AND_CREDITS.md` for the complete spec.

---

## Data Model (Firestore)

### Collections

```
users/{uid}
  ├── displayName: string
  ├── email: string
  ├── role: 'user' | 'admin' | 'staff'
  ├── staffRole?: string              ← role ID from configs/staff_roles (only when role='staff')
  ├── subscriptionStatus: 'free' | 'pro' | 'enterprise'
  ├── activePlanId?: string
  ├── credits: number                 ← spendable credit balance
  ├── monthlyLimit: number            ← set from plan.monthlyCredits on subscription
  ├── totalUsedCredits: number
  ├── unlockedPrompts: string[]       ← permanently unlocked prompt IDs
  ├── lastCreditsRewardAt: Timestamp
  ├── referralCode: string
  ├── referredBy?: string
  ├── affiliateEarnings: number
  ├── createdAt: Timestamp
  └── hasCompletedOnboarding: boolean

prompts/{promptId}
  ├── title: string
  ├── description: string
  ├── content: string          ← locked for paid prompts
  ├── category: string
  ├── tags: string[]
  ├── isPaid: boolean
  ├── price: number
  ├── creatorId: string
  ├── likesCount: number
  └── createdAt: Timestamp

favorites/{userId_promptId}
  ├── userId: string
  └── promptId: string

subscriptions/{uid}
  ├── plan: 'pro' | 'enterprise'
  ├── status: 'active' | 'canceled' | 'expired'
  ├── interval: 'monthly' | 'annual'
  ├── currentPeriodEnd: Timestamp
  └── cashfreeOrderId: string

plans/{planId}
  ├── name: string
  ├── monthlyPrice: number
  ├── yearlyPrice: number
  ├── inrMonthlyPrice: number
  ├── monthlyCredits: number       ← credits set on user profile when they subscribe
  ├── permissionGroupId: string    ← links to configs/access_levels.groups[].id
  ├── features: string[]
  └── isPopular: boolean

configs/global
  ├── maintenanceMode: boolean
  ├── maintenanceMessage: string
  ├── vaultLimit: number           ← max unlocked prompts for free users (default: 10)
  ├── aiDefaults.freeCreditsDaily: number  ← daily login reward (default: 5)
  └── siteSettings: { ... }

configs/staff_roles
  └── roles: StaffRoleDefinition[]
        ├── id: string             ← slug e.g. "content_creator"
        ├── name: string
        ├── description: string
        ├── color: string
        ├── sections: AdminSection[]
        └── createdAt: string

configs/access_levels
  └── groups: PermissionGroup[]    ← subscription-tier feature flags

credits_history/{id}
  ├── userId: string
  ├── type: 'unlock' | 'copy' | 'admin_grant' | 'admin_deduct'
  ├── promptId?: string
  ├── amount: number
  ├── balanceAfter?: number
  └── createdAt: Timestamp

blog/{postId}
  ├── title: string
  ├── slug: string
  ├── content: string          ← rich text / markdown
  ├── excerpt: string
  ├── coverImage: string
  ├── category: string
  ├── tags: string[]
  ├── authorId: string
  ├── status: 'draft' | 'published'
  └── publishedAt: Timestamp

categories/{categoryId}
  ├── name: string
  ├── slug: string
  └── promptCount: number

support_tickets/{ticketId}
  ├── userId: string
  ├── subject: string
  ├── status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ├── priority: 'low' | 'medium' | 'high'
  └── createdAt: Timestamp

support_messages/{messageId}
  ├── ticketId: string
  ├── senderId: string
  ├── content: string
  └── createdAt: Timestamp

marketing_contacts/{contactId}
  ├── email: string
  ├── name: string
  ├── tags: string[]
  ├── segments: string[]
  └── subscribed: boolean

ai_gallery/{uid}/images/{imageId}
  ├── url: string
  ├── prompt: string
  ├── model: string
  └── createdAt: Timestamp
```

---

## Backend Architecture (Express API)

### Server entry: `server.ts` (dev) / `api/index.ts` (Vercel)

All routes are prefixed `/api/`. Vercel rewrites `/api/*` to the Express function.

### Middleware stack (in order)

1. `cors` — allows requests from `VITE_APP_URL`
2. `express.json` — parse JSON bodies
3. `helmet` — security headers
4. `rateLimit` — 100 req/15min per IP
5. Route-specific: `verifyFirebaseToken` — validates Firebase ID token from `Authorization: Bearer <token>`

### Route modules

| Module | File | Responsibility |
|---|---|---|
| Auth | `api/routes/auth.ts` | Token verification, role assignment, profile sync |
| Payments | `api/routes/payments.ts` | Cashfree order creation, webhook handling, subscription updates |
| Marketing | `api/routes/marketing.ts` | Email campaigns, contact management via CRM service |
| Location | `api/routes/location.ts` | IP geolocation for currency detection |
| Support | `api/routes/support.ts` | Ticket creation, reply sending, status updates |
| Upload | `api/index.ts → POST /api/upload-ftp` | Multipart file upload → FTP → Hostinger → returns public URL |

---

## UI Theme System

### UIProvider (`src/contexts/UIProvider.tsx`)

Manages all runtime theming. Calls `applyTokens()` on every config change.

```ts
type UIConfig = {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string                    // preset name or { type: 'custom', h, s, l }
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  layoutMode: 'boxed' | 'full'
  navOrientation: 'vertical' | 'horizontal'
  sidebarWidth: number                    // 240 | 260 | 280
  sidebarTheme: 'default' | 'dark' | 'light' | 'gradient'
  navbarStyle: 'fixed' | 'floating' | 'static'
  contentWidth: 'compact' | 'wide'
  cardShadow: boolean
  fontFamily: 'inter' | 'geist' | 'outfit' | 'space-grotesk'
  language: string
  direction: 'ltr' | 'rtl'
}
```

`applyTokens()` writes CSS custom properties to `document.documentElement`:
- `--primary-h`, `--primary-s`, `--primary-l`
- `--radius`
- `--sidebar-width`
- `--card-shadow`
- `--font-sans`

---

## Image Storage Architecture

All image uploads go through a single pipeline: browser → Express API → FTP → Hostinger file manager → public CDN URL.

```
User selects file
  ↓
useImageUpload() hook (src/hooks/useImageUpload.ts)
  ↓
POST /api/upload-ftp  (multipart/form-data: file + folder)
  ↓
api/services/generalService.ts → uploadFtp()
  ↓ reads FTP config from Firestore configs/ftp (or env vars as fallback)
basic-ftp client → connects to Hostinger FTP
  ↓ uploads file to: {FTP_FOLDER}/{folder}/{sanitized-filename}
  ↓ returns public URL: {FTP_ENDPOINT}/{folder}/{sanitized-filename}
  ↓
URL stored in Firestore (user profile, prompt cover, blog post, etc.)
```

### FTP Configuration

Config is read first from Firestore `configs/ftp`, then falls back to env vars:

| Firestore field | Env var fallback | Description |
|---|---|---|
| `host` | `FTP_SERVER` | Hostinger FTP hostname |
| `username` | `FTP_USERNAME` | FTP login username |
| `password` | `FTP_PASSWORD` | FTP login password |
| `path` | `FTP_FOLDER` | Remote directory path (e.g. `promptly/public/`) |
| `endpoint` | `FTP_ENDPOINT` | Public HTTP base URL for served files |
| `enabled` | — | Toggle to disable uploads without code change |

**Admin UI:** FTP config can be updated at runtime from the Admin Panel → Settings → Storage — no redeploy needed.

### Folder structure on Hostinger

```
promptly/public/
├── general/        ← default folder
├── prompts/        ← prompt cover images
├── blog/           ← blog post covers
├── avatars/        ← user profile pictures
├── categories/     ← category icons
└── creative_suite/ ← AI-generated images
```

---

## AI Integration Architecture

### BYOK (Bring Your Own Key)

Users provide their own Gemini API key in `/settings/ai`. The key is stored encrypted in Firestore under `users/{uid}/private/aiKeys.gemini`. The AI service decrypts it on the client side before making API calls — keys never leave the browser.

### AI Service Flow

```
User submits prompt → aiService.ts
  ↓
Decrypt stored API key
  ↓
Build Gemini request (flash-image / pro / veo)
  ↓
Call Gemini API directly from browser
  ↓
Stream response / receive images
  ↓
Auto-save results to ai_gallery/{uid}/images
```

---

## Personalization Engine

### Overview

Every user interaction is scored and stored in a local affinity profile (localStorage), then throttled-synced to Firestore. The profile drives the "For You" feed, blog recommendations, CRM segmentation, and email personalization.

**Module:** `src/lib/affinity.ts`

### Signal → Score → Rank Pipeline

```
User action (view / like / copy / unlock / onboarding)
  ↓
recordPromptInteraction(prompt, INTERACTION_WEIGHTS.X)
  ├── Adds weight to profile[categoryId]
  ├── Adds weight to profile[tag] for each tag
  └── Adds weight to profile[model]
  ↓
Micro-decay: all keys × 0.95 to keep profile fresh
  ↓
localStorage["user_affinity_profile"] updated
  ↓
syncAffinityToCloud(uid)  ← throttled: once per 5 min
  ├── updateDoc(users/{uid}, { affinityProfile })
  └── updateDoc(marketing_contacts, { tags })  ← High/Low Intent tags
```

### Interaction Weights

| Constant | Value | Trigger |
|---|---|---|
| `VIEW` | 1 | Prompt or blog post page load; +1 every 60s on-page |
| `LIKE` | 5 | User favorites a prompt |
| `COPY` | 10 | User copies prompt text |
| `UNLOCK` | 8 | User unlocks a paid prompt |
| `VAULT_ADD` | 3 | (Reserved for vault add action) |
| `ONBOARDING_SEED` | 5 | Onboarding interest selection |

### Cold-Start Fix

New users and returning users on new devices have no local affinity. Three seeding layers prevent an empty feed:

1. **Onboarding:** `seedAffinityFromInterests(interests)` runs in `completeOnboarding()` — writes to localStorage and Firestore immediately
2. **Login:** `useAuth.tsx` checks if local affinity is empty after cloud merge; if `data.interests` exists, calls `seedAffinityFromInterests` 
3. **Feed render:** `ExplorePage.tsx` "For You" falls back to a temporary profile built from `profile.interests` if both affinity sources are empty

### Time Decay

| Trigger | Decay |
|---|---|
| Every interaction | All keys × 0.95 (keeps recent actions weighted higher) |
| 30+ day absence | × 0.95 per month, floored at 50% retention |
| Key drops below 0.1 | Key deleted from profile |

### Firestore Fields

`users/{uid}.affinityProfile: Record<string, number>` — synced from local, used to restore on new devices

`marketing_contacts/{id}.tags[]` — `High-Intent: CATEGORY` (score ≥ 10), `Low-Intent: CATEGORY` (score 1–9), `Interest: <Name>` (from onboarding), `onboarding_complete`

---

## Security Model

See `security_spec.md` for full Firestore security rules spec.

### Key rules

- `users/{uid}` — only the owner can write their own profile. Role cannot be self-elevated.
- `prompts/{id}` — paid prompt `content` field is server-side only (Cloud Function / Admin SDK reads for purchase flow).
- `configs/global` — admin role required for writes.
- `subscriptions/{uid}` — only writable via server-side webhook (not from client).

---

*Related: [DEV_GUIDE.md](./DEV_GUIDE.md) · [API_REFERENCE.md](./API_REFERENCE.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)*

---

## Creator Submission & Moderation Pipeline

### Prompt Lifecycle

```
draft (client) → pending (submitted) → approved / rejected
                                              ↓
                                     active → flagged → hidden
```

| Status | Visible on Explore | Who sets it |
|---|---|---|
| `pending` | No | Creator on submit |
| `approved` | Yes | Admin |
| `rejected` | No | Admin |
| `hidden` | No | Admin (via report action) |

### Report Pipeline

```
User clicks Report → ReportModal → prompt_reports/{id} (status: pending)
                                          ↓
                             reportCount++ on prompts/{id}
                                          ↓
                   reportCount >= 5 → moderationStatus: flagged
                                          ↓
                             AdminReports queue (admin reviews)
                                          ↓
                   Dismiss | Warn | Hide (moderationStatus: hidden) | Delete
```

### Firestore Collections

| Collection | Purpose |
|---|---|
| `prompts/{id}.status` | Approval state: `pending / approved / rejected` |
| `prompts/{id}.moderationStatus` | Visibility: `active / flagged / hidden` |
| `prompt_reports/{id}` | Individual report records |

### Admin Queue Sort

Pending submissions sorted by:
1. New creators (0 previously approved) — higher priority
2. Known creators (≥1 approved prompt) — lower priority, reviewed after

Pending reports sorted by:
1. `reportCount` descending
2. `createdAt` ascending (oldest first)

### Security Rules Summary

- `prompts` create: user-submitted docs must have `status === 'pending'`
- `prompts` update: only admin can change `status` to `approved/rejected` or `moderationStatus` to `hidden`
- `prompt_reports` create: any authenticated or anonymous user (rate-limited client-side)
- `prompt_reports` read/update: admin only

