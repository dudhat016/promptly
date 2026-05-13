# Promptly — Deployment Guide

> Type: Operations — Production Deployment & Environment Setup
> Stack: Vite (frontend) + Vercel Serverless (API) + Firebase (database/auth/storage)

---

## Architecture Overview

```
GitHub repo
  ↓ push to main
Vercel (auto-deploy)
  ├── Static frontend (dist/)     → CDN edge
  └── /api/* functions            → Serverless (Node.js 20)
      ↕                                    ↕
Firebase project                   Hostinger FTP
  ├── Firestore (database)           └── Image storage
  ├── Firebase Auth                      (public static files)
  └── FCM (push notifications)
```

---

## Step 1 — Firebase Setup

### 1.1 Create project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project: `promptly-prod`
3. Disable Google Analytics (not needed — we use our own)

### 1.2 Enable services

- **Authentication** → Sign-in methods → Enable: Email/Password, Google
- **Firestore** → Create database → Start in **production mode** (we'll apply rules next)
- **Storage** → Create bucket → Start in production mode
- **Cloud Messaging** → Enabled by default

### 1.3 Deploy Firestore rules

```bash
firebase login
firebase use --add   # select promptly-prod
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 1.4 Generate service account

1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key → save JSON
3. Base64-encode it: `base64 -i service-account.json` (macOS/Linux)
4. Store as `FIREBASE_SERVICE_ACCOUNT` env var in Vercel

---

## Step 2 — Vercel Setup

### 2.1 Connect repo

1. [vercel.com/new](https://vercel.com/new) → Import GitHub repo
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

### 2.2 Configure rewrites

`vercel.json` (already in repo) handles API routing:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" }
  ]
}
```

### 2.3 Environment variables

Add all variables from `.env.example` in Vercel project settings → Environment Variables.

**Critical:** Set `NODE_ENV=production` — this enables security middleware and disables verbose error responses.

| Variable | Value source |
|---|---|
| `VITE_FIREBASE_*` | Firebase project settings → General |
| `FIREBASE_SERVICE_ACCOUNT` | Base64-encoded service account JSON (Step 1.4) |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `VITE_CASHFREE_APP_ID` | Cashfree Dashboard → Credentials |
| `CASHFREE_SECRET_KEY` | Cashfree Dashboard → Credentials |
| `VITE_APP_URL` | `https://your-domain.com` |

---

## Step 3 — Hostinger FTP Storage Setup

All image uploads are stored on Hostinger via FTP and served as public static files.

### 3.1 Create the upload directory

Log in to Hostinger File Manager and create this folder structure:

```
public_html/
└── promptly/
    └── public/
        ├── general/
        ├── prompts/
        ├── blog/
        ├── avatars/
        ├── categories/
        └── creative_suite/
```

Make the `promptly/public/` directory publicly accessible (default on Hostinger shared hosting).

### 3.2 Get FTP credentials

Hostinger hPanel → Hosting → FTP Accounts → note:
- **FTP Server** (e.g. `ftp.techworldproduct.com`)
- **Username** (e.g. `u123456789`)
- **Password**

### 3.3 Set env vars in Vercel

```
FTP_SERVER=ftp.techworldproduct.com
FTP_USERNAME=u123456789
FTP_PASSWORD=your_ftp_password
FTP_FOLDER=promptly/public/
FTP_ENDPOINT=https://techworldproduct.com/promptly/public/
```

### 3.4 Configure via Admin Panel (alternative)

Instead of env vars, you can configure FTP from the Admin Panel at runtime:
- Admin → Settings → Storage
- Fill in host, username, password, path, endpoint
- Saves to Firestore `configs/ftp` — takes priority over env vars
- Toggle "Enable Storage" to disable uploads without a redeploy

### 3.5 Verify upload works

```bash
# Test the FTP endpoint (admin auth required)
curl -X POST https://your-domain.com/api/test-ftp \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"host":"ftp.yourdomain.com","username":"u123","password":"pass"}'
# Expected: {"success":true}
```

---

## Step 4 — Cashfree Setup

### 3.1 Production credentials

1. [merchant.cashfree.com](https://merchant.cashfree.com) → API Credentials → Production
2. Copy App ID and Secret Key → add to Vercel env vars

### 3.2 Webhook configuration

1. Cashfree Dashboard → Webhooks → Add URL:
   `https://your-domain.com/api/payments/webhook`
2. Events to subscribe: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `SUBSCRIPTION_CANCELLED`
3. Copy webhook secret → set as `CASHFREE_WEBHOOK_SECRET` in Vercel

---

## Step 5 — Custom Domain

1. Vercel project → Settings → Domains → Add domain
2. Add DNS records as instructed by Vercel (usually CNAME or A record)
3. Wait for SSL certificate provisioning (~5 minutes)
4. Update `VITE_APP_URL` env var to the custom domain
5. Update Firebase Auth → Authorized domains → Add your domain

---

## Step 6 — Firebase Security Rules Checklist

Before going live, verify these rules are deployed:

```bash
firebase deploy --only firestore:rules,storage
```

Test each rule scenario manually using Firebase Emulator:

```bash
firebase emulators:start --only firestore,auth
```

Rules to verify:
- [ ] Free user cannot read `content` field of paid prompts
- [ ] User cannot set their own `role` to `admin`
- [ ] User cannot write to another user's `users/{uid}` document
- [ ] `subscriptions/{uid}` is read-only from client (webhook only writes)
- [ ] `configs/global` is read-only for non-admins

---

## Step 7 — Pre-Launch Verification

Run through the full [STEP_06_PRODUCTION_CHECKLIST.md](./roadmap/STEP_06_PRODUCTION_CHECKLIST.md) before going live.

Quick summary:
- [ ] All environment variables set in Vercel
- [ ] Firestore security rules deployed and tested
- [ ] Cashfree webhook endpoint verified
- [ ] Firebase Auth domains configured
- [ ] DNS propagated and SSL active
- [ ] Error pages tested (403, 404, 500, maintenance)
- [ ] Payment flow tested end-to-end (use Cashfree sandbox first)
- [ ] Email sending verified (support tickets, subscription confirmations)
- [ ] Admin login works at `/admin`
- [ ] Public-facing SEO metadata in place

---

## Monitoring & Operations

### Logs

- **Frontend errors**: Vercel Functions logs → Vercel Dashboard → Deployments → Logs
- **Firebase errors**: Firebase Console → Functions → Logs (if using Cloud Functions)
- **Client errors**: `src/lib/error-handler.ts` sends to console in dev; integrate Sentry in prod

### Adding Sentry (recommended for prod)

```bash
npm install @sentry/react
```

```ts
// src/main.tsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
})
```

Add `VITE_SENTRY_DSN` to Vercel env vars.

### Performance monitoring

- Vercel Analytics (built-in) — enable in Vercel project settings
- Lighthouse CI on every deploy — add `.github/workflows/lighthouse.yml`

---

## Rollback Procedure

Vercel keeps all deployments. To roll back:

1. Vercel Dashboard → Deployments
2. Click the last stable deployment → `...` menu → **Promote to Production**

Instant — no rebuild needed.

---

## Database Backup

Firestore exports:

```bash
# One-time export
gcloud firestore export gs://your-backup-bucket/$(date +%Y-%m-%d)

# Set up daily export via Cloud Scheduler (recommended for prod)
```

---

*Related: [ARCHITECTURE.md](./ARCHITECTURE.md) · [API_REFERENCE.md](./API_REFERENCE.md) · [STEP_06_PRODUCTION_CHECKLIST.md](./roadmap/STEP_06_PRODUCTION_CHECKLIST.md)*
