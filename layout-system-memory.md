---
name: layout-system
description: "Reusable multi-layout admin/dashboard system — 12 variants, demo presets, customizer drawer, command palette. Copied from Promptly project."
metadata:
  type: reference
---

# Layout System — Reuse Guide

This layout system was built in the Promptly project (`C:\Dudhat\github\promptly`) and is designed
to be dropped into any React + TypeScript + Tailwind CSS v4 project.

---

## Tech Stack Requirements

- React 18+ with TypeScript
- Tailwind CSS v4
- `motion/react` (Framer Motion v11+) — animations
- `lucide-react` — icons
- `react-router-dom` v6 — routing
- `localStorage` — config persistence

---

## Folder Structure (what was copied)

```
src/
├── demo/                          ← layout engine — single source of truth
│   ├── layout.tsx                 ← main shell, renders all 12 variants
│   ├── header/
│   │   ├── NavbarActions.tsx      ← user-side right navbar (search, apps, user menu)
│   │   ├── AdminNavbarActions.tsx ← admin-side right navbar
│   │   ├── AppsDropdown.tsx       ← 3-col app grid dropdown
│   │   ├── QuickActionsDropdown.tsx ← 4-col quick actions dropdown
│   │   └── UserBreadcrumb.tsx     ← auto breadcrumb from URL segments
│   └── sidebar/
│       ├── SidebarFooter.tsx      ← user sidebar bottom (UserCard + HelpWidget + UpgradeCard)
│       ├── AdminSidebarFooter.tsx ← admin sidebar bottom (role badge + sign out)
│       ├── UserCard.tsx           ← avatar + name + plan badge
│       └── HelpWidget.tsx        ← docs/support/changelog links
│
├── components/layout/             ← all sidebar and navbar variant components
│   ├── Sidebar.tsx                ← standard collapsible sidebar (vertical/creative/detached)
│   ├── CompactSidebar.tsx         ← 64px icon-only + flyout menus
│   ├── BigCompactSidebar.tsx      ← 80px icon + label + flyout menus
│   ├── TwoColumnSidebar.tsx       ← two-panel: icon rail + group detail panel
│   ├── VerticalTabSidebar.tsx     ← vertical tabs on left edge
│   ├── ExtendedSidebar.tsx        ← wide sidebar with nested accordion
│   ├── Navbar.tsx                 ← top navbar (all variants share this)
│   ├── TabNavBar.tsx              ← horizontal tab bar (tab variant)
│   ├── PageContainer.tsx          ← max-width content wrapper
│   └── types.ts                   ← NavItem interface
│
├── components/overlays/
│   ├── DemoShowcase.tsx           ← full-screen demo gallery (z-80)
│   ├── DemoPreview.tsx            ← CSS-only thumbnail preview of each layout
│   ├── CustomizerDrawer.tsx       ← right-side customizer panel
│   └── CommandPalette.tsx         ← Ctrl+K command palette with keyboard nav
│
├── contexts/UIProvider.tsx        ← all layout state: UIConfig, setConfig, setDemo, activeDemo
└── data/demoPresets.ts            ← 46 presets across 7 categories
```

---

## Core Concept: UIConfig

All visual settings live in `UIConfig` (persisted to `localStorage`):

```ts
interface UIConfig {
  layoutVariant:  LayoutVariant;   // which sidebar style
  mode:           'light' | 'dark';
  primaryColor:   PrimaryColor;    // 15 options
  sidebarTheme:   'default' | 'dark' | 'light' | 'gradient';
  sidebarBgPreset?: string;        // CSS gradient string
  navbarStyle:    'default' | 'floating' | 'bordered';
  radius:         number;          // border-radius multiplier
  fontFamily:     string;
  headingFont:    string;
  sidebarCollapsed: boolean;
  layoutMode:     'default' | 'boxed';
  cardShadow:     boolean;
  compactMode:    boolean;
  customPrimary?: string;
}
```

---

## The 12 Layout Variants

```ts
type LayoutVariant =
  | 'vertical'     // standard collapsible sidebar
  | 'horizontal'   // top navbar only, no sidebar
  | 'tab'          // top navbar + horizontal tab bar below
  | 'vertical-tab' // vertical tab strip on left edge
  | 'compact'      // 64px icon-only sidebar with flyouts
  | 'big-compact'  // 80px icon+label sidebar with flyouts
  | 'two-column'   // icon rail + group detail panel
  | 'extended'     // wide sidebar with deep accordion nesting
  | 'modular'      // horizontal scrollable nav toolbar, no sidebar
  | 'creative'     // gradient sidebar, same component as vertical
  | 'advanced'     // custom CSS background preset on outer wrapper
  | 'detached';    // floating sidebar card with gap around it
```

---

## Key Pattern: bottomSection Prop

Every sidebar component accepts `bottomSection?: React.ReactNode`.
This is how `SidebarFooter` (or `AdminSidebarFooter`) gets injected once in
`demo/layout.tsx` and automatically appears in ALL sidebar variants:

```tsx
// In demo/layout.tsx — edit ONCE, appears everywhere
const sidebarFooter = (
  <SidebarFooter collapsed={config.sidebarCollapsed} isGradient={isGradient} />
);

<Sidebar items={navItems} bottomSection={sidebarFooter} />
<CompactSidebar items={navItems} bottomSection={sidebarFooter} />
<TwoColumnSidebar items={navItems} bottomSection={sidebarFooter} />
// ... all 6 variants get the same prop
```

---

## NavItem Interface

```ts
interface NavItem {
  label?: string;
  icon?: React.ElementType;           // lucide-react icon
  path?: string;                      // route path (without lang prefix)
  exact?: boolean;                    // exact URL match for active state
  children?: NavItem[];               // nested items (accordion / flyout)
  badge?: string | number;            // badge text or count
  badgeVariant?: 'default' | 'danger' | 'warning';
  sectionTitle?: boolean;             // renders as section header, not link
  divider?: boolean;                  // renders as horizontal rule
}
```

---

## usePath Hook — Language-Aware Routing

The `usePath` hook prefixes every path with the current language code:

```ts
const { prefix, lng } = usePath();
// If URL is /en/dashboard, prefix('/settings') → '/en/settings'
```

**If your project has no i18n**, replace all `prefix(path)` calls with just `path`.

---

## Adapting for a New Project — 3 Steps

### Step 1: Replace nav items

```ts
// src/data/yourNavItems.ts
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', exact: true },
  { divider: true },
  { label: 'Users',     icon: Users,           path: '/users' },
  // ...
];
```

### Step 2: Simplify demo/layout.tsx

Remove Promptly-specific code:
- `useNotifications()` → remove, or replace with your own
- `buildUserNavItems()` → replace with your static `NAV_ITEMS`
- `DISCOVERY_PATHS`, `USER_TOUR_STEPS`, `GuidedTour` → delete
- `setReferralModalOpen` → delete
- `profile?.credits` → replace with your user fields

### Step 3: Adapt sidebar footer

```tsx
// demo/sidebar/UserCard.tsx — change these fields:
const { user } = useAuth();           // ← your auth hook
user.displayName                      // ← your name field
user.plan === 'pro'                   // ← your plan check
prefix('/settings/profile')           // ← your profile route
```

---

## UIProvider Setup

Wrap your app with UIProvider in `main.tsx` or `App.tsx`:

```tsx
import { UIProvider } from './contexts/UIProvider';

<UIProvider>
  <App />
</UIProvider>
```

UIProvider reads/writes `localStorage` key `'promptly-ui-config'`
(rename the constant `STORAGE_KEY` in UIProvider.tsx if desired).

---

## Demo Presets System

- `src/data/demoPresets.ts` — 46 presets across 7 categories
- Each preset is a `Partial<UIConfig>` bundled with id/name/description/category/tags
- Selecting a preset calls `setDemo(id)` from `useUI()` which merges the config
- Active demo stored in `localStorage` key `'promptly-active-demo'`
- `DemoShowcase` gallery opens via the "Demos" button in the navbar

To add your own presets, follow the same `DemoPreset` shape in `demoPresets.ts`.

---

## Command Palette (Ctrl+K)

`CommandPalette.tsx` — static nav items only (no Firestore).
To add your project's pages, edit the `ALL_ITEMS` array at the top of the file:

```ts
const ALL_ITEMS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
  // add your routes here
];
```

---

## CustomizerDrawer

The right-side drawer lets users switch:
- Theme mode (light / dark)
- Primary color (15 options)
- Layout variant (all 12)
- Sidebar theme (default / dark / light / gradient)
- Border radius
- Font family
- Navbar style
- Demo presets (opens DemoShowcase gallery)

It reads/writes `useUI()` config — no extra wiring needed.

---

## DemoPreview (CSS-only thumbnails)

`DemoPreview.tsx` renders a small visual thumbnail of each layout variant
using only inline div styles — no images, no canvas, scales to any size.
Used inside `DemoShowcase` cards and `DemoSwitcher`.

Props: `{ variant, primaryColor?, mode?, sidebarTheme?, sidebarBgPreset?, navbarStyle? }`

---

## applyTokens

UIProvider calls `applyTokens(config)` on every config change.
This function sets CSS variables on `document.documentElement`:
- `--primary`, `--radius`, `--font-sans`, `--font-heading`
- `data-theme` attribute for dark/light mode
- `data-sidebar` attribute for sidebar theme

Make sure your Tailwind config reads these CSS variables.

---

## Source Project

Original: `C:\Dudhat\github\promptly`
Memory:   `C:\Users\chintan\.claude\projects\C--Dudhat-github-promptly\memory\`

For deep context on the original codebase (auth hooks, Firestore patterns,
component API details), ask Claude to read the memory files above.
