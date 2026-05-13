# Promptly — Developer Guide

> Type: Reference — Development Setup & Conventions
> Read this before touching any code. These rules keep the codebase coherent.

---

## Setup

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | LTS recommended |
| npm | 10+ | Bundled with Node 20 |
| Firebase CLI | Latest | `npm i -g firebase-tools` |

### First-time setup

```bash
# 1. Clone and install
git clone <repo>
cd promptly
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Fill in required values in .env (see Environment Variables below)

# 4. Start dev server
npm run dev
```

### Environment Variables

See `.env.example` for the full list with descriptions. Key variables:

| Variable | Scope | Description |
|---|---|---|
| `VITE_FIREBASE_*` | Browser | Firebase project config (6 vars) |
| `VITE_FIREBASE_DATABASE_ID` | Browser | Firestore database ID (usually `(default)`) |
| `FIREBASE_SERVICE_ACCOUNT` | Server | Base64-encoded service account JSON |
| `FTP_SERVER` | Server | Hostinger FTP hostname |
| `FTP_USERNAME` | Server | FTP login username |
| `FTP_PASSWORD` | Server | FTP login password |
| `FTP_FOLDER` | Server | Remote upload directory (e.g. `promptly/public/`) |
| `FTP_ENDPOINT` | Server | Public HTTP base URL for served images |
| `CASHFREE_APP_ID` | Server | Cashfree App ID |
| `CASHFREE_SECRET_KEY` | Server | Cashfree secret key |
| `CASHFREE_ENV` | Server | `sandbox` or `production` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Server | Email sending credentials |
| `APP_URL` | Server | Full app URL (used in email links) |

---

## Folder Structure

```
src/
├── components/
│   ├── primitives/     → Atomic UI: Button, Input, Badge, Avatar, Chip, Card…
│   ├── forms/          → Form controls: Switch, ImageUpload, TagInput…
│   ├── feedback/       → Alert, Spinner, Progress, Rating, EmptyState, Skeleton
│   ├── navigation/     → Tabs, Accordion, Breadcrumbs, CommandPalette, PageShell
│   ├── overlays/       → Dialog, Drawer, Tooltip, CustomizerDrawer
│   ├── data/           → StatCard, Timeline, Banner, DataTable (admin)
│   ├── layout/         → Sidebar, Navbar, HorizontalMenu, PageContainer, UserDropdown
│   ├── ai/twinStudio/  → AI Twin Studio module components
│   ├── auth/           → LoginForm, RegisterForm, ForgotPasswordForm, UnifiedAuth
│   ├── marketing/      → CRM components: ContactManager, SegmentBuilder, AutomationBuilder…
│   ├── admin/          → Admin-specific: DataTable, ConfirmModal, AdminTable…
│   └── SEO/            → Schema markup components
│
├── pages/
│   ├── admin/          → All /admin/* pages
│   ├── auth/           → /login, /register, /forgot-password
│   ├── dashboard/      → /dashboard/* pages (user zone)
│   ├── error/          → 404, 403, 500, ComingSoon, Maintenance pages
│   └── settings/       → /settings/* pages
│
├── layouts/
│   ├── BlankLayout.tsx        → No chrome (error pages)
│   ├── HorizontalLayout.tsx   → Public pages (Header + Footer)
│   └── UserLayout.tsx         → Dashboard (sidebar + top nav)
│
├── contexts/
│   └── UIProvider.tsx         → Theme tokens, customizer state, applyTokens()
│
├── hooks/              → Custom React hooks
├── services/           → Firebase & API service modules
├── lib/                → Utilities (firebase, api client, utils, analytics…)
├── guards/             → Route guards (AuthGuard, AdminGuard, OnboardingGuard)
├── i18n/               → Translation files (en, hi, ar, es, fr)
├── styles/             → Global CSS (index.css, responsive.css)
├── types.ts            → Shared TypeScript types
└── _mock/              → Mock data for development (data.ts, utils.ts)

api/                    → Express server (Vercel Functions)
├── index.ts            → Main Express app entry
└── routes/
    ├── auth.ts         → /api/auth/*
    ├── payments.ts     → /api/payments/*
    ├── marketing.ts    → /api/marketing/*
    ├── location.ts     → /api/location/*
    └── support.ts      → /api/support/*
```

---

## Zone Architecture

Promptly has three zones. Every page belongs to exactly one zone:

| Zone | Route Prefix | Layout | Guard |
|---|---|---|---|
| Public | `/`, `/explore`, `/blog`, `/pricing`… | `HorizontalLayout` | None |
| User Dashboard | `/dashboard/*`, `/settings/*` | `UserLayout` | `AuthGuard` |
| Admin Panel | `/admin/*` | `AdminLayout` | `AuthGuard` + `AdminGuard` |
| Error / Utility | `/404`, `/403`, `/500`, `/maintenance` | `BlankLayout` | None |

---

## Code Conventions

### TypeScript

- All files are `.tsx` (components) or `.ts` (utilities, services, hooks).
- Avoid `any`. If you need an escape hatch, use `unknown` and narrow it.
- Export types from the file they're used in. Shared types go in `src/types.ts`.
- Use `interface` for object shapes that may be extended; `type` for unions and mapped types.

### Components

- One component per file.
- File name = component name in PascalCase: `Alert.tsx` exports `Alert`.
- Props interface is always named `{ComponentName}Props` and defined at the top of the file.
- No default props — use destructuring defaults: `({ size = 'md' }: AlertProps)`.
- Keep render logic minimal. Extract complex derived values to `const` above the return.

### Styling

- **Never hardcode hex values.** All colors via CSS variables: `var(--primary)`, `var(--muted)`, `var(--card)`.
- **Never use Tailwind color scales directly** (`bg-violet-600`). Use semantic classes (`bg-primary`).
- Use the 4px grid: all spacing values are multiples of 4 (`p-1`=4px, `p-4`=16px).
- Avoid arbitrary Tailwind values (`p-[13px]`) unless documented with a comment explaining why.
- Shadows:
  - `shadow-sm` — cards, inputs, dropdowns
  - `shadow-md` — modals, dialogs
  - `shadow-lg` — sheets, overlays

### Icons

- One icon library only. Do not mix libraries.
- Icon sizes: `h-4 w-4` inline, `h-5 w-5` standalone action, `h-6 w-6`+ decorative.
- All icon-only interactive elements must have a `Tooltip` with a descriptive label.

### Imports

- Group imports: external libraries → internal absolute → relative.
- Never use barrel re-exports (`index.ts`) for lazy-loaded pages — keep them direct imports.
- Component folder barrel files (`index.ts`) are fine for grouping related exports.

### Comments

- Write no comments by default.
- Only add a comment when the WHY is non-obvious: hidden constraint, subtle invariant, library bug workaround.
- Never describe WHAT the code does — well-named identifiers do that already.

---

## Common Patterns

### Data fetching with Firebase

```ts
// Real-time listener (live updates)
useEffect(() => {
  const unsub = onSnapshot(doc(db, 'configs/global'), (snap) => {
    setConfig(snap.data())
  })
  return () => unsub()
}, [])

// One-time read
const snap = await getDoc(doc(db, 'users', uid))
const user = snap.data() as UserProfile
```

### Protected API calls

```ts
// All API calls go through src/lib/api.ts
import { api } from '@/lib/api'

const result = await api.post('/payments/create-order', { amount, plan })
```

### UIConfig (theme tokens)

```ts
// Read config
const { uiConfig, setUIConfig } = useConfig()

// Update a value (triggers applyTokens automatically)
setUIConfig((prev) => ({ ...prev, primaryColor: 'cyan' }))
```

### Toast notifications

```ts
import { toast } from 'sonner'

toast.success('Saved')
toast.error('Something went wrong')
```

---

## Running Scripts

```bash
npm run dev          # Start Vite dev server + API server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript type check (no output)
```

---

## Git Workflow

- Branch naming: `feature/short-description`, `fix/issue-name`, `chore/task-name`
- Commit messages: imperative mood, present tense ("Add Alert component", not "Added Alert")
- PRs: squash-merge to keep main history clean
- Never force-push to `main`

---

*Related: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [API_REFERENCE.md](./API_REFERENCE.md)*
