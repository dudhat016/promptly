# Promptly — API Reference

> Type: Reference — Express API Endpoints
> Base URL (production): `https://promptly.vercel.app/api`
> Base URL (development): `http://localhost:3001/api`

All protected endpoints require: `Authorization: Bearer <firebase-id-token>`

---

## File Upload

### `POST /api/upload-ftp`

Uploads an image file to Hostinger via FTP and returns the public URL.

**Auth required:** No (rate-limited by IP)

**Content-Type:** `multipart/form-data`

**Form fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Image file (PNG, JPG, WEBP, max 10MB) |
| `folder` | string | No | Sub-folder on Hostinger (e.g. `prompts`, `avatars`, `blog`). Defaults to `general`. |

**Response `200`:**
```json
{
  "success": true,
  "url": "https://techworldproduct.com/promptly/public/prompts/my_image.jpg",
  "name": "my_image.jpg"
}
```

**Response `400`:** No file in request
```json
{ "error": "No file uploaded" }
```

**Response `500`:** FTP connection failed or storage disabled
```json
{ "error": "FTP Storage is disabled in settings." }
```

**Notes:**
- File name is sanitized: lowercased, special characters replaced with `_`, double underscores collapsed.
- FTP config is read from Firestore `configs/ftp` first, then falls back to `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` env vars.
- To disable uploads temporarily: set `configs/ftp.enabled = false` in Firestore (no redeploy needed).

---

### `POST /api/test-ftp`

Tests FTP connectivity with provided credentials. Admin only.

**Auth required:** Yes (admin only)

**Request body:**
```json
{
  "host": "ftp.yourdomain.com",
  "username": "ftp_user",
  "password": "ftp_pass"
}
```

**Response `200`:**
```json
{ "success": true }
```

---

## Authentication

### `POST /api/auth/sync-profile`

Syncs the Firebase Auth user to Firestore on first login.

**Auth required:** Yes

**Request body:**
```json
{
  "displayName": "Jane Smith",
  "photoURL": "https://..."
}
```

**Response `200`:**
```json
{
  "uid": "abc123",
  "role": "free",
  "credits": 10,
  "onboardingComplete": false
}
```

---

### `POST /api/auth/verify-admin`

Checks if the requesting user has the `admin` role.

**Auth required:** Yes (admin only)

**Response `200`:**
```json
{ "isAdmin": true }
```

**Response `403`:**
```json
{ "error": "Insufficient permissions" }
```

---

## Payments

### `POST /api/payments/create-order`

Creates a Cashfree payment order for a subscription plan.

**Auth required:** Yes

**Request body:**
```json
{
  "plan": "pro",
  "interval": "monthly",
  "currency": "INR"
}
```

**Response `200`:**
```json
{
  "orderId": "order_xxx",
  "paymentSessionId": "session_xxx",
  "amount": 499,
  "currency": "INR"
}
```

---

### `POST /api/payments/webhook`

Cashfree payment webhook. Verifies HMAC signature, updates Firestore subscription on success.

**Auth required:** No (verified by HMAC)

**Headers:** `x-webhook-signature` — Cashfree HMAC-SHA256 signature

**Response `200`:** `{ "received": true }`

---

### `GET /api/payments/subscription-status`

Returns current subscription status for the authenticated user.

**Auth required:** Yes

**Response `200`:**
```json
{
  "plan": "pro",
  "status": "active",
  "interval": "monthly",
  "currentPeriodEnd": "2026-06-13T00:00:00Z"
}
```

---

### `POST /api/payments/cancel`

Cancels the active subscription at period end.

**Auth required:** Yes

**Response `200`:**
```json
{ "canceledAt": "2026-05-13T10:00:00Z", "endsAt": "2026-06-13T00:00:00Z" }
```

---

## Marketing

### `POST /api/marketing/send-campaign`

Sends an email campaign to a contact segment.

**Auth required:** Yes (admin only)

**Request body:**
```json
{
  "segmentId": "seg_xxx",
  "subject": "New features this week",
  "templateId": "weekly_update",
  "scheduledAt": null
}
```

**Response `200`:**
```json
{ "queued": 1243, "campaignId": "camp_xxx" }
```

---

### `POST /api/marketing/unsubscribe`

Marks a contact as unsubscribed.

**Auth required:** No (uses signed token in email link)

**Request body:**
```json
{ "token": "signed_unsubscribe_token" }
```

**Response `200`:**
```json
{ "unsubscribed": true }
```

---

### `POST /api/marketing/track-event`

Tracks a marketing conversion event (purchase, signup, etc.).

**Auth required:** No

**Request body:**
```json
{
  "event": "purchase",
  "userId": "abc123",
  "value": 499,
  "currency": "INR"
}
```

**Response `200`:** `{ "tracked": true }`

---

## Support

### `POST /api/support/create-ticket`

Creates a new support ticket.

**Auth required:** Yes

**Request body:**
```json
{
  "subject": "Cannot access my vault",
  "message": "I purchased pro but vault shows locked...",
  "priority": "high"
}
```

**Response `201`:**
```json
{ "ticketId": "ticket_xxx", "status": "open" }
```

---

### `POST /api/support/reply`

Adds a reply to an existing ticket (user or admin).

**Auth required:** Yes

**Request body:**
```json
{
  "ticketId": "ticket_xxx",
  "message": "We're looking into this now."
}
```

**Response `200`:**
```json
{ "messageId": "msg_xxx", "createdAt": "2026-05-13T10:00:00Z" }
```

---

### `PATCH /api/support/ticket/:ticketId/status`

Updates ticket status (admin only).

**Auth required:** Yes (admin only)

**Request body:**
```json
{ "status": "resolved" }
```

**Response `200`:**
```json
{ "ticketId": "ticket_xxx", "status": "resolved" }
```

---

## Location

### `GET /api/location/detect`

Detects user's country from IP for currency selection.

**Auth required:** No

**Response `200`:**
```json
{
  "country": "IN",
  "currency": "INR",
  "locale": "en-IN"
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

### Common HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request — invalid input |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient permissions |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Rate Limits

- Global: 100 requests per 15 minutes per IP
- Payment endpoints: 10 requests per minute per user
- Marketing send: 5 campaign sends per hour per admin

---

*Related: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)*
