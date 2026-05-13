# Step 08 — Affiliate Program Flow
> Type: Feature — Affiliate & Commission System
> Prerequisite: Payment flow working (Cashfree + PayPal). `configs/marketing` and `configs/payment` documents exist in Firestore.
> Reference: `src/pages/AffiliatePage.tsx`, `src/pages/AffiliateInfoPage.tsx`, `api/lib/payouts.ts`

---

## Complete Affiliate Flow

```
Visitor lands on any page with ?ref=CODEXYZ
        ↓
ReferralCapture (App.tsx) saves ref to localStorage
        ↓
Visitor registers / logs in
        ↓
useAuth creates user profile with referredBy: 'CODEXYZ'
        ↓
User visits /pricing → clicks Subscribe
        ↓
PricingPage passes &ref=CODEXYZ to /checkout URL
        ↓
CheckoutPage reads refCode: profile.referredBy || ?ref param || localStorage
        ↓
User pays (Cashfree / PayPal / Direct card)
        ↓
  [Cashfree / PayPal]           [Direct card fallback]
  api/services/paymentService   CheckoutPage.tsx
  verifyCashfreePayment()       handleCheckout()
  verifyPaypalPayment()
        ↓                               ↓
  awardAffiliateCommission()     inline commission calc
  (api/lib/payouts.ts)
        ↓
Commission credited to affiliate's affiliateEarnings
Logged to referral_commissions collection
        ↓
Affiliate visits /dashboard/affiliate
        ↓
Sees earnings + referral list + Withdraw button
        ↓
Requests payout (writes to payouts collection)
        ↓
Admin reviews at /admin/withdrawals → Approve / Reject
```

---

## Commission Calculation

Fee deductions are applied before calculating the affiliate's share:

```
Gross sale amount:      $15.00
Payment gateway fee:  −  $0.30   (2% of gross — Cashfree default)
Net distributable:      $14.70
Gross commission:        $3.68   (25% of net — referralCommission rate)
Platform fee:          −  $0.00   (0% default — platform keeps nothing)
Affiliate receives:      $3.68
```

**Formula:**
```
paymentFee    = grossSale × paymentFeePercent / 100
netAmount     = grossSale − paymentFee
grossComm     = netAmount × referralCommission / 100
platformFee   = grossComm × platformFeePercent / 100
netCommission = grossComm − platformFee
```

### Configuring fee rates

Admin Panel → Settings → Payment → **Affiliate Fee Settings**

| Field | Default | Description |
|---|---|---|
| Payment Gateway Fee | 2% | Cashfree's processing fee. Use 3.49% for PayPal, 2.9% for Stripe |
| Platform Fee | 0% | Percentage of gross commission the platform keeps |

Changes save to both `configs/payment.fees` and `configs/marketing` (where `awardAffiliateCommission` reads them).

---

## Data Model

### `users/{uid}` — affiliate fields

| Field | Type | Description |
|---|---|---|
| `referralCode` | string | Unique code like `JOHN123` — user's affiliate identifier |
| `referredBy` | string | Referral code of the affiliate who referred this user |
| `affiliateEarnings` | number | Pending unpaid balance (zeroed after payout) |
| `referralsCount` | number | Total users referred (incremented on new referral) |
| `payoutMethods` | object | `{ upiId, paypalEmail, bankDetails }` |

### `referral_commissions/{id}` — server-side log (Cashfree/PayPal)

| Field | Description |
|---|---|
| `referrerId` | Affiliate's Firestore UID |
| `buyerId` | Buyer's Firestore UID |
| `orderId` | Payment gateway order ID |
| `grossSaleAmount` | Full sale amount |
| `paymentFee` | Gateway fee deducted |
| `platformFee` | Platform cut deducted |
| `grossCommission` | Commission before platform fee |
| `netCommission` | Final amount awarded to affiliate |
| `commissionRate` | Commission % used (from config) |
| `paymentFeeRate` | Payment fee % used |
| `platformFeeRate` | Platform fee % used |
| `currency` | ISO currency code |
| `status` | `awarded` |
| `createdAt` | Timestamp |

### `referrals/{id}` — client-side log (direct card fallback)

Same fields as `referral_commissions` plus:
- `planId` — plan the buyer subscribed to
- `buyerEmail` — buyer's email

### `payouts/{id}` — withdrawal requests

| Field | Description |
|---|---|
| `userId` | Requesting affiliate UID |
| `userEmail` | For admin identification |
| `amount` | Full balance at time of request |
| `status` | `pending` → `completed` or `rejected` |
| `payoutMethod` | `{ upiId, paypalEmail }` |
| `riskScore` | Fraud guard score (0–100) |
| `riskLevel` | `low_risk` / `medium_risk` / `high_risk` |
| `requestedAt` | When user submitted |
| `processedAt` | When admin actioned |

### `configs/marketing` — affiliate program settings

| Field | Default | Description |
|---|---|---|
| `referralCommission` | 25 | Commission % to affiliate |
| `minWithdrawalAmount` | 50 | Minimum balance before payout allowed |
| `paymentFeePercent` | 2 | Gateway fee deducted before commission |
| `platformFeePercent` | 0 | Platform cut from gross commission |
| `fraudScoreThreshold` | 70 | Score above which payout is flagged |

---

## Fraud Guard

When an affiliate requests a payout, a fraud score is calculated before writing to Firestore:

| Rule | Score Added |
|---|---|
| Account age < 7 days | +40 |
| Account age < 2 days | +30 (additional) |
| >20 referrals in <5 days | +50 |
| Missing photo or display name | +10 |

- Score ≥ `fraudScoreThreshold` (default 70): payout saved with `status: 'flagged'`
- Score < threshold: payout saved with `status: 'pending'`

Admin sees all statuses in `/admin/withdrawals`. Flagged payouts need manual review.

---

## Admin Controls

### Affiliate commission rate
Admin Panel → Affiliates → Commission Rate badge → Edit button

Updates `configs/marketing.referralCommission` in Firestore. Takes effect immediately for all future commission calculations.

### Payout processing
Admin Panel → Withdrawals → Approve / Reject buttons

- **Approve**: sets `status: 'completed'`, logs to audit trail
- **Reject**: sets `status: 'rejected'`, user notified

Approving does NOT automatically transfer funds — admin must send funds via PayPal/UPI manually, then mark as approved.

### Fee settings
Admin Panel → Settings → Payment → Affiliate Fee Settings section

Sets `paymentFeePercent` and `platformFeePercent` in both `configs/payment.fees` and `configs/marketing`.

---

## Affiliate Program — Public Pages

| Route | Component | Purpose |
|---|---|---|
| `/affiliate` | `AffiliateInfoPage` | Public landing page explaining the program |
| `/dashboard/affiliate` | `AffiliatePage` | Authenticated user's affiliate dashboard |

The public page (`/affiliate`) is linked from the Footer and can be used as the main conversion page for potential affiliates.

---

## Affiliate Link Format

```
https://yourdomain.com/pricing?ref=JOHN123
https://yourdomain.com/register?ref=JOHN123
https://yourdomain.com/?ref=JOHN123
```

Any page works — `ReferralCapture` in App.tsx catches `?ref=` on any route and saves to localStorage. The code persists until the user registers or completes a checkout.

---

## Outstanding Items

- [ ] After payout approval, send email notification to affiliate
- [ ] Show commission breakdown per referral in AffiliatePage (grossSale, paymentFee, netCommission)
- [ ] Add `referralsCount` auto-increment when a new user registers with `referredBy`
- [ ] Support for tiered commission (e.g., 25% for first 10 referrals → 30% after)
- [ ] Recurring commission on subscription renewals (currently only first payment)

---

*This step feeds into: `STEP_06_PRODUCTION_CHECKLIST.md` (verify commission credits end-to-end in sandbox before launch)*
