# Staff Roles & Credit System

> Type: Reference — Access Control + Monetisation Engine
> Implemented: May 2026
> Related files: `src/hooks/useStaffRoles.ts`, `src/pages/admin/AdminRoles.tsx`, `src/pages/admin/AdminUserDetails.tsx`, `src/App.tsx`, `api/services/paymentService.ts`

---

## Part 1 — Staff Role RBAC

### Overview

Promptly has two distinct access control layers:

| Layer | What it controls | Stored in |
|---|---|---|
| **Subscription Permissions** | What paying users can do (copy, export, unlock, AI builder) | `configs/access_levels` |
| **Staff Role RBAC** | Which admin panel sections a staff member can access | `configs/staff_roles` |

This document covers the **Staff Role RBAC** layer.

---

### User Role Values

`users/{uid}.role` can be one of three values:

| Value | Meaning |
|---|---|
| `user` | Regular paying or free user — no admin access |
| `admin` | Full admin panel access — all sections |
| `staff` | Scoped admin access — only the sections defined in their assigned staff role |

When `role === 'staff'`, the field `users/{uid}.staffRole` holds the ID of the role definition (e.g. `content_creator`).

---

### Admin Sections

Every admin panel page maps to an `AdminSection` key. Staff roles are a set of these keys.

| Section key | Admin URL | Description |
|---|---|---|
| `dashboard` | `/admin` | Overview metrics |
| `users` | `/admin/users` | User management |
| `prompts` | `/admin/prompts` | Prompt CRUD |
| `categories` | `/admin/categories` | Category management |
| `templates` | `/admin/templates` | Template management |
| `blog` | `/admin/blog` | Blog post management |
| `seo` | `/admin/seo` | SEO audit tools |
| `media` | `/admin/media` | Media manager |
| `ai_models` | `/admin/models` | AI model configuration |
| `inquiries` | `/admin/inquiries` | Contact form submissions |
| `tickets` | `/admin/tickets` | Support tickets |
| `subscriptions` | `/admin/subscriptions` | Pricing plan management |
| `revenue` | `/admin/revenue` + `/admin/invoices` | Financials |
| `affiliates` | `/admin/referrals` | Affiliate list |
| `withdrawals` | `/admin/withdrawals` | Payout requests |
| `marketing` | `/admin/marketing` | CRM, campaigns, automations |
| `permissions` | `/admin/permissions` | Subscription permission groups |
| `roles` | `/admin/roles` | Staff role management (admin-only in practice) |
| `activity` | `/admin/activity` | Audit log |
| `settings` | `/admin/settings` | Site settings |
| `emails` | `/admin/emails` | Email logs and settings |

---

### Firestore: `configs/staff_roles`

```ts
{
  roles: StaffRoleDefinition[];
  lastUpdated: string; // ISO timestamp
}

interface StaffRoleDefinition {
  id: string;          // slug, e.g. "content_creator"
  name: string;        // display name, e.g. "Content Creator"
  description: string;
  color: string;       // hex color for the badge
  sections: AdminSection[]; // list of allowed section keys
  createdAt: string;
}
```

**Example — Content Creator role:**
```json
{
  "id": "content_creator",
  "name": "Content Creator",
  "description": "Handles prompts and blog writing",
  "color": "#6366f1",
  "sections": ["prompts", "categories", "blog", "templates", "media"],
  "createdAt": "2026-05-13T00:00:00.000Z"
}
```

---

### Data Flow

```
Admin visits /admin/roles
      ↓
Creates role "content_creator" with sections: [prompts, blog]
      ↓
Saves to configs/staff_roles
      ↓
Admin visits /admin/users → opens user profile
      ↓
Sets role = "staff", staffRole = "content_creator"
      ↓
Saved to users/{uid}: { role: "staff", staffRole: "content_creator" }
      ↓
Staff user logs in
      ↓
AdminRoute — allows entry (role === 'staff')
      ↓
AdminLayout — filterNavForRole() hides sections not in role.sections
      ↓
SectionRoute — if staff navigates directly to /admin/users
                checks canAccessSection("users") → false → redirects to /admin
```

---

### Code Locations

| File | Purpose |
|---|---|
| `src/hooks/useStaffRoles.ts` | Firestore listener on `configs/staff_roles`, `canAccessSection(section)` check |
| `src/pages/admin/AdminRoles.tsx` | Full CRUD UI for staff role definitions |
| `src/pages/admin/AdminUserDetails.tsx` | Role assignment panel in user profile |
| `src/pages/admin/AdminLayout.tsx` | `filterNavForRole()` — hides nav items the staff member cannot access |
| `src/App.tsx` | `AdminRoute` (allows staff), `SectionRoute` (per-route guard) |
| `src/types.ts` | `AdminSection`, `StaffRoleDefinition`, `StaffRolesConfig` types; `UserProfile.staffRole` |
| `src/components/layout/types.ts` | `NavItem.section?: AdminSection` |

---

### How to Create a New Staff Role

1. Navigate to **Admin → Staff Roles** (`/admin/roles`).
2. Click **New Role**.
3. Enter a name (the ID is auto-generated from the name).
4. Choose a color and tick the admin sections to grant.
5. Click **Create Role**.
6. Navigate to **Admin → Users**, open a user's profile.
7. In the **Staff Role** panel, click the role button.
8. The user's Firestore doc is immediately updated to `role: 'staff', staffRole: '<id>'`.

---

## Part 2 — Credit System

### Overview

Credits are the internal currency used by **free-tier users** to unlock and copy paid prompts. Pro/enterprise users bypass the credit system entirely.

---

### Credit Flow

```
New user registers
      ↓
credits = 50, monthlyLimit = 50 (or plan.monthlyCredits)
      ↓
User logs in each day
      ↓
Daily reward: credits += aiDefaults.freeCreditsDaily (default: 5)
Stored in: configs/global.aiDefaults.freeCreditsDaily
      ↓
User unlocks a paid prompt (free user only)
      ↓
credits -= 1
totalUsedCredits += 1
unlockedPrompts = arrayUnion(promptId)
Written to: credits_history/{id}
      ↓
User copies a prompt (free user only, requires canCopyPrompts permission)
      ↓
credits -= 1
totalUsedCredits += 1
      ↓
User subscribes to a plan
      ↓
credits = plan.monthlyCredits
monthlyLimit = plan.monthlyCredits
Pro users: no longer deducted (isPro check bypasses credit deduction)
```

---

### User Profile Credit Fields

| Field | Type | Description |
|---|---|---|
| `credits` | number | Current spendable balance |
| `monthlyLimit` | number | Max credits for the progress bar (set from plan) |
| `totalUsedCredits` | number | Lifetime total spent |
| `unlockedPrompts` | string[] | IDs of permanently unlocked prompts |
| `lastCreditsRewardAt` | Timestamp | When daily reward was last given |

---

### Plan Credit Field

`plans/{planId}.monthlyCredits: number`

Set by admin in **Admin → Plans → Edit Plan → Monthly Credits**.

| Plan tier | Recommended value |
|---|---|
| Free (starter) | 50 |
| Pro | 500 |
| Enterprise | 2500 |
| 0 | Means unlimited (Pro-equivalent bypass) |

When a user subscribes via Cashfree, PayPal, or the direct card fallback, the server/client reads `plan.monthlyCredits` and sets both `credits` and `monthlyLimit` to that value.

---

### Vault Limit

Free users can permanently unlock a limited number of prompts. The limit is set globally:

**`configs/global.vaultLimit`** (number, default: 10)

Set via **Admin → Settings → General → Vault Limit**.

Pro/admin users have unlimited vault slots.

---

### Daily Reward Configuration

**`configs/global.aiDefaults.freeCreditsDaily`** (number, default: 5)

Set via **Admin → Settings → General → AI Defaults → Free Credits Daily**.

The reward fires once per calendar day per user at login time (guarded by a `sessionStorage` flag to prevent duplicate rewards within the same session).

---

### Code Locations

| File | Purpose |
|---|---|
| `src/hooks/useAuth.tsx` | Daily reward logic; new user profile creation with `credits` + `monthlyLimit` |
| `src/pages/PromptDetailPage.tsx` | `handleUnlock()` — deducts credit, adds to `unlockedPrompts`, logs to `credits_history` |
| `src/pages/PromptDetailPage.tsx` | `handleCopy()` — deducts credit for free users |
| `src/pages/CheckoutPage.tsx` | Sets `credits = plan.monthlyCredits` on successful subscription (client fallback path) |
| `api/services/paymentService.ts` | Sets `credits = plan.monthlyCredits` on Cashfree/PayPal verification |
| `src/pages/admin/AdminSubscriptionForm.tsx` | `monthlyCredits` input field on plan edit form |
| `src/pages/admin/AdminUserDetails.tsx` | Manual credit adjustment panel (admin grant/deduct) |
| `src/pages/dashboard/CreditHistoryPage.tsx` | User-facing credit history from `credits_history` collection |

---

### `credits_history` Collection

Every credit deduction writes a log entry:

```ts
{
  userId: string;
  type: 'unlock' | 'copy' | 'admin_grant' | 'admin_deduct';
  promptId?: string;
  promptTitle?: string;
  amount: number;           // positive = earned, negative = spent
  reason?: string;          // for admin adjustments
  balanceAfter?: number;    // for admin adjustments
  createdAt: Timestamp;
}
```

---

### Admin Credit Management

Admins can manually adjust a user's credits from the user profile:

**Admin → Users → [User] → Adjust Credits**

- Enter a positive amount (grant) or negative amount (deduct)
- Add an optional reason note
- Creates a `credits_history` log entry of type `admin_grant` or `admin_deduct`
- Logs to the audit trail

---

## Part 3 — How the Two Systems Interact

Staff members assigned roles like `content_creator` are **not paid subscribers**. They have:
- `role: 'staff'`
- `subscriptionStatus: 'free'` (typically)
- No credit deduction when accessing the admin panel (they don't use prompts commercially)

If a staff member also uses the public-facing part of the platform (e.g. to preview prompts), they consume credits normally as a free user. To avoid this, grant them a Pro subscription in their user profile.
