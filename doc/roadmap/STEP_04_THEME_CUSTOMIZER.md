# Step 04 — Theme Customizer & Design System
> Type: Development — Theme Engine
> Prerequisite: `UIProvider.tsx` and `CustomizerDrawer.tsx` must be read before working on this step.
> Context: The Customizer already exists with partial functionality. This step wires existing config options, expands color/font choices, and redesigns the Customizer UI to match best-seller quality.

---

## Current State vs. Target State

| Option | Currently in UIConfig | Currently in Customizer UI | Action Needed |
|---|---|---|---|
| Theme mode (light/dark/system) | ✅ | ✅ | None |
| Primary color (5 swatches) | ✅ | ✅ | Expand to 10 + hex input |
| Border radius | ✅ | ✅ | None |
| Layout mode (boxed/full) | ✅ | ✅ | None |
| Navigation orientation (vertical/horizontal) | ✅ | ✅ | None |
| Language selector | ✅ | ✅ | None |
| Sidebar collapsed | ✅ | ✅ | None |
| **Sidebar width** | ✅ (in config) | ❌ Missing from UI | Wire to customizer |
| **Card shadow toggle** | ✅ (in config) | ❌ Missing from UI | Wire to customizer |
| **Navbar style** (fixed/floating/static) | ✅ (in config) | ❌ Missing from UI | Wire to customizer |
| **Content width** (compact/wide) | ✅ (in config) | ❌ Missing from UI | Wire to customizer |
| **Sidebar color scheme** | ❌ Not in config | ❌ Not in UI | Add to both |
| **Font family** | ❌ Not in config | ❌ Not in UI | Add to both |
| **RTL direction toggle** | CSS only | ❌ Not in UI | Add toggle button |
| **Custom hex color input** | ❌ | ❌ | Add to color section |
| **Copy config as JSON** | ❌ | ❌ | Add export button |
| **Layout preview thumbnails** | ❌ | ❌ | Add visual thumbnails |

---

## Step 4.1 — Wire Existing UIConfig Options to Customizer UI

These four options are already in `UIConfig` and applied via `applyTokens()` but are not exposed in `CustomizerDrawer.tsx`. This is the quickest win — add controls for them.

**Sidebar Width:**
- Add a slider or segmented button (3 options: 240px | 260px | 280px) to the Customizer
- Label: "Sidebar Width" with the current value shown (e.g., "260px")
- Writes to `uiConfig.sidebarWidth`
- `applyTokens()` must already set `--sidebar-width: {value}px` as a CSS variable

**Card Shadow:**
- Add a toggle switch labeled "Card Shadow"
- When on: cards have `shadow-sm` or `shadow-md` applied via the card CSS class
- When off: cards are flat (border only, no shadow)
- Writes to `uiConfig.cardShadow`
- Implementation: `applyTokens()` sets `--card-shadow: 0 1px 3px rgba(0,0,0,0.1)` or `none`

**Navbar Style:**
- Add 3 option buttons: Fixed | Floating | Static
- Fixed: header is `position: sticky top-0`
- Floating: header has `mx-4 mt-4 rounded-xl` and floats above content
- Static: header scrolls with page content
- Writes to `uiConfig.navbarStyle`
- Implementation: `UserLayout.tsx` reads `uiConfig.navbarStyle` and applies the correct class

**Content Width:**
- Add 2 option buttons: Compact | Wide
- Compact: `max-w-6xl mx-auto` on the content wrapper
- Wide: full width (no max-width)
- Writes to `uiConfig.contentWidth`

**Acceptance criteria for Step 4.1:**
- [ ] All 4 new options appear in CustomizerDrawer
- [ ] Changes apply in real time without page reload
- [ ] Changes persist to localStorage
- [ ] All 4 options reset correctly on "Reset to Default"

---

## Step 4.2 — Expand Color System: 5 → 10 Colors + Hex Input

**Current 5 colors:** violet, blue, emerald, rose, amber

**Add 5 more:**
| Name | HSL Values |
|---|---|
| cyan | `h: 189, s: 94, l: 43` |
| indigo | `h: 239, s: 84, l: 67` |
| purple | `h: 271, s: 91, l: 65` |
| orange | `h: 25, s: 95, l: 53` |
| teal | `h: 172, s: 66, l: 41` |

Add to the `colorTokens` map in `UIProvider.tsx`:
```ts
const colorTokens = {
  violet:  { h: 262, s: 83, l: 58 },
  blue:    { h: 217, s: 91, l: 60 },
  emerald: { h: 158, s: 64, l: 52 },
  rose:    { h: 350, s: 89, l: 60 },
  amber:   { h: 38,  s: 92, l: 50 },
  cyan:    { h: 189, s: 94, l: 43 },
  indigo:  { h: 239, s: 84, l: 67 },
  purple:  { h: 271, s: 91, l: 65 },
  orange:  { h: 25,  s: 95, l: 53 },
  teal:    { h: 172, s: 66, l: 41 },
}
```

**Custom hex color input:**
- After the 10 swatches, add a small hex input field (e.g., `#7c3aed`)
- When user types a valid 6-digit hex:
  - Convert hex to HSL: `hexToHSL(hex)` utility function
  - Apply as custom primary color via the same `applyTokens()` flow
  - Store as `uiConfig.primaryColor = { type: 'custom', h, s, l }`
- The hex input shows a live color preview swatch next to it
- Validation: show a subtle error border if the hex is invalid (not 3 or 6 hex digits)

**Acceptance criteria for Step 4.2:**
- [ ] All 10 color swatches render correctly
- [ ] Active swatch has a visible checkmark or ring indicator
- [ ] Custom hex input updates the primary color in real time
- [ ] Invalid hex input does not crash — shows error state quietly
- [ ] All 10 preset colors look visually distinct and aesthetically appropriate in dark mode

---

## Step 4.3 — Sidebar Color Scheme

**Add `sidebarTheme` to UIConfig:**
```ts
type SidebarTheme = 'default' | 'dark' | 'light' | 'gradient'
```

**Behavior per option:**

- `default` — sidebar uses the same background token as the page (adapts with light/dark mode)
- `dark` — sidebar bg is always `#0f0f11` regardless of light/dark mode. Text is always white. Works well with a light content area.
- `light` — sidebar bg is always `#ffffff`. Text is always dark. Works well for a clean/minimal look.
- `gradient` — sidebar has `linear-gradient(to bottom, hsl(primary-dark), hsl(primary))`. Text is white. Looks bold.

**Implementation:**
- In `UserLayout.tsx` (or the sidebar component), read `uiConfig.sidebarTheme`
- Apply the correct CSS class or inline style to the sidebar element
- The sidebar text, icons, and active item indicator must adapt to the sidebar's bg color

**Customizer UI:**
- 4 color swatch-style option buttons in the Sidebar section
- Each shows a mini visual preview (a small rectangle with the sidebar color + a few fake menu items)

**Acceptance criteria for Step 4.3:**
- [ ] All 4 sidebar themes render correctly
- [ ] `dark` sidebar shows white text even in light mode
- [ ] `light` sidebar shows dark text even in dark mode
- [ ] `gradient` sidebar uses the currently selected primary color
- [ ] Active menu item has visible indicator in all 4 themes

---

## Step 4.4 — Font Family Selector

**Add `fontFamily` to UIConfig:**
```ts
type FontFamily = 'inter' | 'geist' | 'outfit' | 'space-grotesk'
```

**Implementation:**
- Fonts must be loaded via Google Fonts (add to `index.html` or loaded dynamically)
- `applyTokens()` sets `document.documentElement.style.setProperty('--font-sans', fontMap[fontFamily])`
- CSS uses `font-family: var(--font-sans)` — all Tailwind `font-sans` usage inherits

**Font map:**
```ts
const fontMap = {
  inter:        '"Inter", sans-serif',
  geist:        '"Geist", sans-serif',
  outfit:       '"Outfit", sans-serif',
  'space-grotesk': '"Space Grotesk", sans-serif',
}
```

**Customizer UI:**
- 4 cards, each showing the font name rendered in that font
- Example text in each card: "Aa Bb Cc" or "The quick brown fox"

**Performance note:**
- Load all 4 fonts in `index.html` with `font-display: swap` so initial load is not blocked
- Only 2–3 font weights needed: 400, 500, 600

**Acceptance criteria for Step 4.4:**
- [ ] Font changes apply to all text on the page in real time
- [ ] Font persists to localStorage
- [ ] All 4 fonts load without FOUT (flash of unstyled text)
- [ ] Customizer font cards preview each font correctly

---

## Step 4.5 — Customizer UI Redesign

**Goal:** Restructure `CustomizerDrawer.tsx` from a flat list to a visually organized panel with sections, visual thumbnails, and a developer export feature.

**New section structure:**

```
┌─────────────────────────────────┐
│  APPEARANCE                     │
│  Theme Mode: [☀ Light] [🌙 Dark] [💻 System] │
│  Primary Color: ● ● ● ● ● ● ● ● ● ● [#hex] │
│  Font Family: [Inter] [Geist] [Outfit] [Space G] │
├─────────────────────────────────┤
│  LAYOUT                         │
│  Width:       [▭ Boxed] [▬ Full Width]  │
│  Navigation:  [▏Vertical] [▬ Horizontal] │
│  Navbar:      [Fixed] [Floating] [Static] │
│  Content:     [Compact] [Wide]           │
├─────────────────────────────────┤
│  SIDEBAR                        │
│  Width:       ──●──── 260px     │
│  Collapsed:   [toggle]          │
│  Color:       [Default][Dark][Light][Gradient] │
├─────────────────────────────────┤
│  COMPONENTS                     │
│  Border Radius: [■][▢][▣][◉]   │
│  Card Shadow:   [toggle]        │
├─────────────────────────────────┤
│  REGION                         │
│  Language:  [EN][HI][AR][ES][FR] │
│  Direction: [LTR] [RTL]         │
├─────────────────────────────────┤
│  [Copy Config JSON] [Reset All] │
└─────────────────────────────────┘
```

**Visual thumbnails for layout options:**
- Each layout option (Boxed/Full, Vertical/Horizontal) shows a small SVG thumbnail
- Thumbnail is ~60×40px, schematic representation of the layout
- Active option has a primary-color border ring

**RTL toggle button:**
- Two buttons: "LTR" | "RTL"
- Clicking RTL sets `document.documentElement.dir = 'rtl'` and saves to UIConfig
- This replaces the CSS-only RTL that currently exists

**Copy Config JSON button:**
- Copies `JSON.stringify(uiConfig, null, 2)` to clipboard
- Shows a "Copied!" Tooltip or toast for 2 seconds
- Developers use this to hardcode a specific config as the default

**Reset All button:**
- Resets `uiConfig` to the default values
- Prompts a `ConfirmModal`: "Reset all customization settings to default?"

**Customizer drawer behavior:**
- Drawer slides in from the right (already implemented)
- Should have a visible "Customizer" handle/tab visible on the right edge when closed
  - Clicking the handle opens the drawer without needing to find a menu item
- Drawer is 320px wide on desktop, full-width on mobile

**Acceptance criteria for Step 4.5:**
- [ ] All existing Customizer controls still work after redesign
- [ ] 5 sections render with correct labels and options
- [ ] Layout thumbnails render at correct size
- [ ] RTL toggle sets `dir` attribute on `<html>` element
- [ ] Copy Config JSON copies valid JSON to clipboard
- [ ] Reset All shows confirmation and resets correctly
- [ ] Customizer handle visible on right edge when drawer is closed
- [ ] Drawer is full-width on mobile

---

## Design System Consistency Rules

These rules apply to all new components and pages built after this step. They are not changes to implement — they are constraints to enforce during development.

**Color:**
- Never use hardcoded hex values in component code
- All colors come from CSS variables: `--primary`, `--muted`, `--destructive`, `--card`, etc.
- Never import Tailwind color values directly (e.g., `bg-violet-600`) — use semantic tokens

**Spacing:**
- Use the 4px grid: all padding/margin values are multiples of 4 (`p-1` = 4px, `p-2` = 8px, `p-4` = 16px)
- Never use arbitrary values (e.g., `p-[13px]`) unless there is a documented reason

**Typography:**
- Use semantic size classes only: `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px)
- Never combine `font-bold` with `text-xs` — too small to be bold meaningfully

**Shadows:**
- `shadow-sm` — cards, inputs, dropdowns (subtle lift)
- `shadow-md` — modals, dialogs
- `shadow-lg` — sheets, overlays
- `shadow-xl` — nothing in UI (too heavy)

**Icons:**
- One icon library only — do not mix libraries
- All icons at a consistent size per context:
  - Inline with text: same size as line-height (`h-4 w-4` for body text)
  - Standalone action icons: `h-5 w-5`
  - Decorative / hero icons: `h-6 w-6` or larger
- All icon-only interactive elements must have a `Tooltip` with a descriptive label

---

*Feeds into: `STEP_06_PRODUCTION_CHECKLIST.md` (performance verification for custom fonts and dynamic CSS), `STEP_07_MARKETPLACE_LAUNCH.md` (Customizer is a demo selling point)*
