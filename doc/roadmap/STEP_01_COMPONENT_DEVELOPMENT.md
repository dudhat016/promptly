# Step 01 — UI Component Development
> Type: Development — Component Library
> Prerequisite: Read `UI_UPDATE_PLAN.md` for current component inventory.
> Rule: Build in priority order. Do not skip ahead. Each component must replace its hardcoded equivalent before moving to the next.

---

## How to Use This File

Each component entry has:
- **What it is** — one-line purpose
- **Where it's needed** — exact pages/files that use a hardcoded version today
- **What to build** — variants, props, and behaviors required
- **Acceptance criteria** — what "done" means before moving on

---

## Phase 1 — Critical Primitives (Build These First)

These 7 components eliminate the most hardcoded duplication in the codebase. They have the highest ROI because they are used in 3+ places today with inconsistent implementations.

---

### 1.1 `Alert` — `src/components/feedback/Alert.tsx`

**What it is:** Inline status message (success, warning, error, info) for forms, API responses, and settings confirmations.

**Where it's needed today (hardcoded):**
- `AdminSettings.tsx` — save confirmation banners
- `BillingSettings.tsx` — subscription status notices
- `AdminMarketing.tsx` — campaign send status
- Every form with server-side validation messages

**What to build:**
- Variants: `success` | `warning` | `error` | `info`
- Modes: `solid` (colored bg) | `soft` (muted bg + colored text) | `outline` (border only) | `left-accent` (colored left border)
- Props: `title` (bold heading), `description` (body text), `icon` (optional custom icon), `dismissible` (shows × button)
- Behavior: `onDismiss` callback fires when × is clicked; component unmounts with a fade-out transition
- Accessibility: `role="alert"` on error/warning, `role="status"` on success/info
- Default icons per variant: CheckCircle (success), AlertTriangle (warning), XCircle (error), Info (info)

**Acceptance criteria:**
- [ ] All 4 variants render correctly in light and dark mode
- [ ] Dismissible × removes the alert with animation
- [ ] All hardcoded alert banners in admin pages replaced with this component
- [ ] `role` attribute correct per variant
- [ ] Works in RTL (icon appears on correct side)

---

### 1.2 `Spinner` — `src/components/feedback/Spinner.tsx`

**What it is:** Reusable loading indicator, replaces all manual `animate-spin border-t-white` divs.

**Where it's needed today (hardcoded):**
- `SupportPage.tsx` — send reply and create ticket buttons
- `CheckoutPage.tsx` — Cashfree payment loading state
- `AffiliatePage.tsx` — withdrawal processing
- `DashboardBuilder.tsx` — prompt generation (manual border spinner)

**What to build:**
- Sizes: `xs` (12px) | `sm` (16px) | `md` (20px) | `lg` (28px) | `xl` (40px)
- Colors: `primary` | `white` | `muted` | `success` | `danger`
- Modes: `inline` (sits beside text, same line height) | `centered` (block, flex center) | `overlay` (absolute fill of parent container)
- Props: `size`, `color`, `mode`, `label` (screen-reader text via `sr-only`)
- The spinner SVG should use a CSS animation, not a Tailwind `animate-spin` class, for better performance

**Acceptance criteria:**
- [ ] All 5 sizes render without layout shift
- [ ] Overlay mode fills parent without affecting DOM flow
- [ ] `label` prop renders as `sr-only` text for screen readers
- [ ] All hardcoded spinners in the 4 files listed above replaced
- [ ] Works in dark mode (white color visible on dark bg)

---

### 1.3 `Progress` — `src/components/feedback/Progress.tsx`

**What it is:** Visual progress indicator in two shapes — horizontal bar and circular ring.

**Where it's needed today (hardcoded):**
- `AffiliatePage.tsx` — milestone tracker (hardcoded bar)
- `UserLayout.tsx` — credit usage bar in header/sidebar
- `DashboardPage.tsx` — 3 inline mini progress bars (credits, vault, builder)
- `DashboardBuilder.tsx` — generation completion indicator

**What to build:**

**Bar variant:**
- Props: `value` (0–100), `max` (default 100), `color` (primary/success/warning/danger/muted), `size` (sm: 4px / md: 8px / lg: 12px), `striped` (diagonal stripe pattern), `animated` (animated stripe motion), `label` (text shown above or inside bar), `showValue` (boolean, shows "67%" text)
- Animation: smooth fill transition on value change (not instant jump)

**Circular variant:**
- Props: `value` (0–100), `size` (sm: 40px / md: 60px / lg: 80px / xl: 100px), `strokeWidth`, `color`, `showValue` (renders percentage in center), `label` (below ring)
- Implementation: SVG circle with `stroke-dasharray` / `stroke-dashoffset` approach

**Acceptance criteria:**
- [ ] Bar and circular variants both work
- [ ] Value animates smoothly from previous to new value
- [ ] All 4 hardcoded progress elements replaced
- [ ] Accessible: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Respects RTL (bar fills left-to-right in LTR, right-to-left in RTL)

---

### 1.4 `Tabs` — `src/components/navigation/Tabs.tsx`

**What it is:** Tab navigation component — the most-reimplemented pattern in the codebase.

**Where it's needed today (hardcoded):**
- `AdminUserDetails.tsx` — Overview / Security / Credits tabs
- `AdminMarketing.tsx` — Contacts / Tags / Segments / Automations tabs
- `AccountSettings.tsx` — Profile / Security / Notifications tabs
- `DashboardPage.tsx` — Library / Favorites / Builder switcher

**What to build:**
- Variants: `line` (underline active tab) | `pill` (filled rounded bg on active) | `card` (boxed, each tab a card-like button) | `soft` (soft color bg on active)
- Mode: `controlled` (external `value` + `onChange`) | `uncontrolled` (internal state + optional `defaultValue`)
- Props: `items` array of `{ key, label, icon?, badge?, disabled? }` | `value` | `onChange` | `variant` | `fullWidth` (tabs stretch to fill container)
- Keyboard: `ArrowLeft` / `ArrowRight` to navigate between tabs, `Home` / `End` for first/last
- The tab panel content is rendered via children — `Tabs` controls only the navigation; content area is a slot

**Acceptance criteria:**
- [ ] All 4 variants render correctly in light and dark mode
- [ ] Keyboard navigation works (left/right arrows, home/end)
- [ ] `disabled` tab is not focusable, visually dimmed
- [ ] Badge count shows next to tab label
- [ ] All 4 hardcoded tab implementations replaced
- [ ] Accessible: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`

---

### 1.5 `Tooltip` — `src/components/overlays/Tooltip.tsx`

**What it is:** Hover/focus floating label for icon-only buttons and contextual hints. Currently absent — all icon-only buttons have no accessible label.

**Where it's needed:**
- Every icon-only action button in admin sidebar, table rows, and DataTable toolbar
- DataTable column header sort indicator labels
- Credit balance display in header (explain what credits are)
- Customizer option labels on hover

**What to build:**
- Props: `content` (string or ReactNode), `placement` (top | bottom | left | right | auto), `delay` (ms before show, default 300ms), `maxWidth` (px), `disabled`
- Trigger: shows on hover AND on focus (keyboard accessible)
- Rendering: portal into `document.body` to escape overflow:hidden parents
- Arrow: small triangle pointer toward the trigger element
- Themes: `dark` (default — dark bg, white text) | `light` (white bg, dark text, border) | `primary` (brand color bg)
- Dismissal: hides on mouseout, blur, Escape key, or scroll

**Acceptance criteria:**
- [ ] Tooltip positions correctly in all 4 placements
- [ ] Shows on focus (keyboard users see it)
- [ ] Does not overflow viewport (auto-flips placement when near edge)
- [ ] Portal rendering does not cause z-index conflicts
- [ ] Works in RTL (left/right placements swap)
- [ ] Accessible: `role="tooltip"`, trigger has `aria-describedby`

---

### 1.6 Button System Expansion — `src/components/primitives/Button.tsx`

**What it is:** Add 3 missing variants to the existing Button component, plus a new ButtonGroup wrapper.

**Existing variants:** default, destructive, outline, secondary, ghost, icon

**What to add:**

**`soft` variant:**
- Style: muted background + colored text, no border
- Usage: secondary CTAs, table row actions where outline feels too heavy
- Example: `bg-primary/10 text-primary hover:bg-primary/20`

**`gradient` variant:**
- Style: `linear-gradient(135deg, var(--primary-dark), var(--primary))` background, white text
- Usage: primary hero CTAs, landing page, upgrade prompts
- Currently inline on 8+ pages — consolidate here

**`link` variant:**
- Style: no bg, no border, text-colored, underline on hover
- Usage: inline text links, navigation links that look like text
- Must support all sizes (affects only font-size and padding)

**`ButtonGroup` — new file `src/components/primitives/ButtonGroup.tsx`:**
- Props: `orientation` (horizontal | vertical), `size`, `variant` (applies to all children)
- Merges adjacent borders between buttons (removes double borders)
- Handles border-radius: first child gets left-rounded, last child gets right-rounded, middle children have no rounding
- Usage: segmented controls, split buttons, toolbar button clusters

**Acceptance criteria:**
- [ ] `soft`, `gradient`, `link` variants work in all sizes
- [ ] `gradient` variant has correct hover state (slightly darker)
- [ ] All inline gradient buttons across pages replaced with `variant="gradient"`
- [ ] ButtonGroup merges borders correctly
- [ ] All variants work in dark mode

---

### 1.7 Card Sub-components — `src/components/primitives/Card.tsx`

**What it is:** Add composable sub-components to the existing Card primitive.

**What to add:**

**`Card.Header`:**
- Sticky at top of card when card has fixed height
- Props: `title` (string), `subtitle` (string), `action` (ReactNode slot for buttons/badges)
- Has bottom border and consistent padding

**`Card.Body`:**
- Fills remaining height with `flex-1`
- Optionally scrollable (`overflow-y: auto`) when card has fixed height
- Consistent padding that matches `Card.Header` padding

**`Card.Footer`:**
- Sticky at bottom
- Top border, consistent padding
- Right-aligned by default (for action buttons)

**New card variants:**
- `raised` — stronger shadow: `shadow-lg shadow-black/8`
- `flat` — no shadow, very subtle background: `bg-muted/20 border-transparent`

**Acceptance criteria:**
- [ ] `Card.Header` + `Card.Body` + `Card.Footer` compose correctly inside a fixed-height Card
- [ ] Body scrolls independently when content overflows
- [ ] `raised` and `flat` variants visually distinct from existing variants
- [ ] Sub-components work in all existing Card usage sites

---

## Phase 2 — Component Library Depth

Build after Phase 1 is complete and all replacements are done.

---

### 2.1 `Accordion` — `src/components/navigation/Accordion.tsx`

**What it is:** Collapsible content sections, used for FAQ, settings groups, filter panels.

**Where it's needed:**
- `FAQPage.tsx` (to be built in Page Development)
- `AdminSettings.tsx` sub-sections
- `ExplorePage.tsx` filter sidebar groups

**What to build:**
- Mode: `single` (only one item open at a time) | `multiple` (any number open simultaneously)
- Props per item: `title`, `description` (optional subtitle), `icon` (optional left icon), `disabled`, `defaultOpen`
- Animation: smooth height expand/collapse using CSS max-height transition or Framer Motion layout animation
- Trigger icon: chevron that rotates 180° when open
- Variants: `default` (bordered items) | `flush` (no border, just divider lines) | `filled` (filled bg on header)

**Acceptance criteria:**
- [ ] Single and multiple modes work correctly
- [ ] Height animation is smooth (no layout shift)
- [ ] Chevron icon rotates correctly
- [ ] Keyboard: Enter/Space to toggle, arrow keys to navigate between triggers
- [ ] Works in RTL (chevron on correct side, content padding correct)

---

### 2.2 `Chip` — `src/components/primitives/Chip.tsx`

**What it is:** Interactive tag/filter element — distinct from Badge because it is interactive and removable.

**Where it's needed:**
- `TagInput.tsx` — replace raw div chips
- `ExplorePage.tsx` — active category filter display
- `AdminMarketing.tsx` — tag display in contact lists
- Search filter displays

**What to build:**
- Variants: `filled` | `outline` | `soft`
- Colors: inherits from primary/secondary/success/warning/danger/muted
- Props: `label`, `icon` (left), `avatar` (left, for user chips), `onRemove` (shows × if provided), `onClick` (makes chip clickable with active state), `disabled`, `size` (sm/md/lg)
- Active state: visually distinct when `selected` prop is true

**Acceptance criteria:**
- [ ] × button fires `onRemove` without triggering `onClick`
- [ ] Clickable Chip toggles active state visually
- [ ] `disabled` chip has no pointer events
- [ ] Replaces raw div chips in `TagInput.tsx`

---

### 2.3 `Timeline` — `src/components/data/Timeline.tsx`

**What it is:** Vertical chronological event list — replaces DataTable rows for activity/history views.

**Where it's needed:**
- `AdminActivityLog.tsx` — currently uses DataTable (wrong component for temporal events)
- `CreditHistoryPage.tsx` — alternate view option
- Future notification feed

**What to build:**
- Props per item: `icon` (ReactNode), `iconColor` (maps to color variant), `title`, `description`, `timestamp` (formatted string or Date), `badge` (optional status badge)
- Layout: connector line between items, icon in a circle on the left, content on the right
- Density: `compact` (tighter spacing) | `comfortable` (default spacing)
- Loading state: shows Skeleton items when `loading` prop is true

**Acceptance criteria:**
- [ ] Connector line visually connects all items
- [ ] Last item does not have a connector line extending below it
- [ ] Skeleton loading state renders correct number of placeholder items
- [ ] Works in RTL (icon on right, content on left)

---

### 2.4 `Pagination` (Standalone) — `src/components/data/Pagination.tsx`

**What it is:** A pagination control that can be used outside of DataTable — for the Explore page prompt grid, blog list, and any future paginated list.

**Where it's needed:**
- `ExplorePage.tsx` — prompt grid pagination
- `AdminBlog.tsx` — blog post list pagination
- Any future admin list that is not DataTable-based

**What to build:**
- Props: `page` (current), `totalPages`, `onChange` (callback with new page number), `pageSize` (items per page), `totalItems` (for "Showing 1–20 of 145" label), `siblingCount` (how many page numbers to show around current, default 1), `showFirstLast` (first/last page jump buttons), `showPageSizeSelector` (dropdown to change page size)
- Ellipsis: renders `...` when there are skipped page numbers
- Design: matches DataTable's internal pagination UI exactly

**Acceptance criteria:**
- [ ] Ellipsis renders correctly at start, end, and both when needed
- [ ] `onChange` fires with correct page number
- [ ] "Showing X–Y of Z items" label is accurate
- [ ] Page size selector fires `onPageSizeChange` callback
- [ ] Works in RTL (prev/next arrows swap)

---

### 2.5 `Rating` — `src/components/primitives/Rating.tsx`

**What it is:** Star rating display and input — replaces `likesCount` number display on prompt cards.

**Where it's needed:**
- `PromptCard.tsx` — display average rating
- `PromptDetailPage.tsx` — display + interactive rating input
- `LandingPage.tsx` — testimonial stars

**What to build:**
- Modes: `readonly` (display only, supports half-stars) | `interactive` (click to rate, shows hover preview)
- Props: `value` (0–5, supports decimals for readonly), `onChange` (interactive mode), `size` (sm/md/lg), `color` (default: amber), `count` (total stars, default 5)
- Half-star: in readonly mode, 3.5 shows 3 full + 1 half star using SVG clip
- Hover: in interactive mode, hovering shows preview of what the rating will be before clicking
- Screen reader: announces "3 out of 5 stars" via `aria-label`

**Acceptance criteria:**
- [ ] Half-star renders correctly at 0.5 increments
- [ ] Interactive hover preview shows correct star count
- [ ] `onChange` fires with integer value on click
- [ ] Screen reader text is accurate
- [ ] Size variants scale without breaking alignment

---

### 2.6 `Popover` — `src/components/overlays/Popover.tsx`

**What it is:** A floating panel anchored to a trigger element, richer than Tooltip (can contain interactive content).

**Where it's needed:**
- `DataTable.tsx` — column visibility toggle panel
- `AdminMarketing.tsx` — campaign send options
- Date range filter dropdowns

**What to build:**
- Props: `trigger` (ReactNode), `content` (ReactNode — can contain forms, lists, buttons), `placement` (top/bottom/left/right/auto), `triggerMode` (click | hover), `arrow` (boolean), `onOpenChange` (callback)
- Dismissal: click outside, Escape key, or programmatic `open` prop
- Portal: renders into body, above all other content
- Width: auto by default, constrained by `maxWidth` prop
- Close on scroll: optional via `closeOnScroll` prop

**Acceptance criteria:**
- [ ] Click-triggered popover stays open when clicking inside it
- [ ] Closes on outside click and Escape
- [ ] Auto-placement flips when near viewport edge
- [ ] Interactive content inside (inputs, buttons) works normally
- [ ] Accessible: `aria-haspopup`, `aria-expanded` on trigger

---

## Phase 3 — Polish and Advanced Components

Build after Phase 2. These are competitive differentiators, not blockers.

---

### 3.1 `Stepper` — `src/components/forms/Stepper.tsx`
Multi-step form progress indicator for onboarding wizard and checkout flows.
- Variants: `horizontal` (steps across top) | `vertical` (steps down left side)
- States per step: `complete` | `current` | `upcoming` | `error`
- Props: `steps` array of `{ label, description?, icon? }`, `currentStep`, `onChange`

---

### 3.2 `NumberInput` — `src/components/forms/NumberInput.tsx`
Input with +/- increment buttons, for credit amounts, quantities, retry counts.
- Props: `value`, `onChange`, `min`, `max`, `step`, `disabled`
- Buttons: hold to repeat increment (with accelerating speed after 500ms hold)

---

### 3.3 `DatePicker` — `src/components/forms/DatePicker.tsx`
Calendar-based date selection.
- Modes: `single` | `month-only` | `range`
- Props: `value`, `onChange`, `min`, `max`, `disabled` (array of specific dates or a function)
- Use `date-fns` for date math — do not introduce a new date library

---

### 3.4 Select Enhancements — `src/components/primitives/Select.tsx`
Add to existing Select:
- `searchable` prop: shows a text input inside the dropdown to filter options
- `multi` prop: allows multiple selections, shows selected as Chips inside the trigger
- `creatable` prop: allows typing a new value not in the options list

---

### 3.5 Textarea Enhancements — `src/components/primitives/Textarea.tsx`
Add to existing Textarea:
- `autoResize` prop: textarea grows with content, up to `maxRows`
- `charCount` prop: shows "123 / 500" character counter below the field
- `maxLength` wired to char counter display

---

## Component Build Checklist (Per Component)

Before marking any component as complete, verify all of these:

- [ ] Renders correctly in light mode
- [ ] Renders correctly in dark mode
- [ ] Renders correctly in RTL mode (`dir="rtl"`)
- [ ] All interactive states work: hover, focus, active, disabled
- [ ] Keyboard navigable (where applicable)
- [ ] ARIA attributes correct
- [ ] No TypeScript errors (`strict: true`)
- [ ] Props are fully typed with JSDoc on each prop
- [ ] Used in at least one real page (not just a component showcase)
- [ ] All hardcoded equivalents in the codebase replaced

---

*Feeds into: `STEP_02_PAGE_DEVELOPMENT.md` (pages that use these components), `STEP_06_PRODUCTION_CHECKLIST.md` (accessibility verification)*
