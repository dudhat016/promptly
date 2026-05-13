# Step 07 — ThemeForest Marketplace Launch
> Type: Operations — Marketplace Submission & Post-Launch
> Prerequisite: ALL items in `STEP_06_PRODUCTION_CHECKLIST.md` must be complete and verified.
> Reference: `THEMEFOREST_BUYER_INSIGHTS.md`, `Admin_template_buyer_insights_guide.MD`

---

## Overview

This step covers everything needed to submit Promptly to ThemeForest, get approved, and successfully launch to the marketplace. It is divided into three phases: pre-submission preparation, submission day, and post-launch growth.

---

## Phase 1 — Pre-Submission Preparation

### 7.1 Item Preview Images

ThemeForest item preview images are the #1 factor in click-through rate. Buyers judge on visuals before reading a single word.

**Required assets:**

| Asset | Size | Notes |
|---|---|---|
| Item thumbnail | 590×300px | Used in search results. Must be the best possible screenshot. |
| Main preview image | 590×300px | Shown on item page header. |
| Full preview screenshot (mobile) | 590×auto | Shows responsive design |
| Customizer preview | 590×auto | Shows the Theme Customizer open |
| Admin panel preview | 590×auto | Shows Admin dashboard |
| AI Studio preview | 590×auto | Unique selling point — must show the AI tools |
| Dark mode preview | 590×auto | Dark mode is a high-conversion feature for buyers |

**How to create:**
- Use the live demo URL with Vercel Preview
- Take screenshots at 1440px width for desktop shots
- Take at 375px for mobile shots
- Export as PNG, compress with [squoosh.app](https://squoosh.app)

---

### 7.2 Item Description Copy

The item description is the sales page. Use `THEMEFOREST_BUYER_INSIGHTS.md` and `MARKET_INSIGHTS_GUIDE.md` for buyer psychology.

**Structure:**

```
[Hero headline — unique value prop in one line]
[2-line subheading — what problem it solves]

## What is Promptly?
[3–4 sentences. SaaS template for building an AI prompt marketplace.
 Covers the use case. Ends with the core promise.]

## Key Features
[Bullet list — 15–20 features with icons or bold labels]
- 🎨 Full Theme Customizer (10 colors, 4 fonts, RTL support)
- 🤖 Built-in AI Creative Suite (6 modules, BYOK Gemini integration)
- 💳 Payment Ready (Cashfree, subscription billing)
- 🌍 Multi-language (EN, HI, AR, ES, FR) + RTL
- 📊 Admin Panel (users, prompts, subscriptions, analytics)
- 🔒 Firebase Auth + Firestore Security Rules
- etc.

## Pages Included
[Full list of all pages grouped by zone]

## Tech Stack
[React 19 · Tailwind v4 · Vite · Firebase · Express · TypeScript]

## Documentation
[Link to docs. Mention step-by-step setup guide.]

## Support
[Describe what's included: 6-month Envato support]

## Changelog
v1.0.0 — Initial release
```

---

### 7.3 Demo URL & Credentials

The demo must be live at a custom subdomain or Vercel URL before submission.

**Recommended URL:** `https://demo.promptly.co` (or Vercel subdomain)

**Demo credentials to include in item description:**

```
Admin: admin@promptly.com / admin123
Pro User: pro@promptly.com / demo123
Free User: free@promptly.com / demo123
```

**Demo protection:**
- Disable account deletion in demo environment (prevent demo destruction)
- Disable email sending in demo (avoid spam complaints)
- Reset demo data daily via a Vercel cron job or Cloud Scheduler

---

### 7.4 Documentation File (HTML)

ThemeForest requires a documentation file bundled with the item files.

**Structure for `documentation/index.html`:**

```
1. Introduction
   - What is Promptly?
   - What's included in the package

2. Requirements
   - Node.js 20+
   - Firebase account
   - Vercel account
   - Cashfree account

3. Installation
   Step 1 — Firebase setup (with screenshots)
   Step 2 — Clone & configure .env
   Step 3 — Deploy to Vercel
   Step 4 — Configure Cashfree webhook

4. Configuration
   - Environment variables reference
   - Admin panel walkthrough
   - Theme Customizer guide
   - AI Integration (BYOK Gemini key)

5. Customization
   - Adding new pages
   - Adding new components
   - Changing colors/fonts
   - Adding a new language

6. FAQ
   - How do I seed the database?
   - Can I use a different payment gateway?
   - How do I disable AI features?

7. Support
   - How to contact support
   - What's covered under Envato support
```

Generate as a clean HTML file (no frameworks). Buyers read this when stuck — make it clear and scannable.

---

### 7.5 Item Files Package

ThemeForest requires a ZIP containing:

```
promptly-v1.0.0.zip
├── source/              → The full project source (what we've built)
│   ├── src/
│   ├── api/
│   ├── public/
│   ├── package.json
│   ├── .env.example     → MUST include this, NOT .env
│   ├── firestore.rules
│   ├── vercel.json
│   └── README.md
└── documentation/
    └── index.html       → Documentation (Step 7.4)
```

**Before packaging:**
- [ ] Delete `node_modules/` from source
- [ ] Delete `.env` (not `.env.example`) from source
- [ ] Delete `service-account.json` from source
- [ ] Delete `firebase-b64.txt` from source
- [ ] Delete `/dist` folder from source
- [ ] Delete `/scratch` folder from source
- [ ] Delete `ts_errors.txt` from source
- [ ] Run `npm run build` one final time — must succeed with 0 TypeScript errors
- [ ] Run `npx tsc --noEmit` — must complete with 0 errors

**ZIP size check:** Target < 50MB. If larger, check for accidentally included large binary files.

---

## Phase 2 — Submission Day

### 7.6 ThemeForest Submission Form

**Category:** Scripts & Code → JavaScript → React

**Item details to fill:**

| Field | Value |
|---|---|
| Item name | Promptly — AI Prompt Marketplace SaaS Template |
| Item description | Prepared in Step 7.2 |
| Item tags | `react, saas, ai, prompt, marketplace, tailwind, firebase, typescript, admin, dashboard` |
| Compatible browsers | Chrome, Firefox, Safari, Edge |
| Compatible software | React 19, Node.js 20 |
| Demo URL | Live demo URL (Step 7.3) |
| Price | Suggested: $49–69 (based on ThemeForest market research) |

---

### 7.7 Review Process Timeline

ThemeForest review typically takes:
- **First submission:** 7–14 business days
- **Re-submission after soft reject:** 3–7 business days

**Common soft-reject reasons to fix proactively:**
1. Documentation is incomplete or unclear
2. Demo has broken pages or JS errors in console
3. Code quality: ESLint errors visible in browser console
4. Missing `robots.txt` or `sitemap.xml`
5. External API keys hardcoded (check with grep)
6. Accessibility: no focus styles on interactive elements
7. Slow performance on demo (Lighthouse score < 70)

**If you receive a soft reject:**
- Read the reviewer comments carefully
- Fix every item listed (not just some)
- Reply in the submission notes explaining each fix
- Re-upload within 7 days to maintain queue position

---

## Phase 3 — Post-Launch

### 7.8 First 30 Days Checklist

Getting the first 10 sales is critical for ranking momentum on ThemeForest.

**Week 1:**
- [ ] Share on Twitter/X: demo video + item link
- [ ] Post on Reddit: r/webdev, r/reactjs (share what you built, not just a sales link)
- [ ] Submit to ProductHunt
- [ ] Share in relevant Discord communities (React, Firebase, SaaS builders)

**Week 2–4:**
- [ ] Respond to all buyer comments on the item page within 24 hours
- [ ] Fix any bugs reported immediately and push an update
- [ ] Collect feedback for v1.1 roadmap

---

### 7.9 Update Release Process

Every update to the item must go through ThemeForest:

1. Bump version in `package.json` and `README.md`
2. Add changelog entry: `v1.1.0 — [date] — Fixed X, added Y`
3. Repackage ZIP (same structure as Step 7.5)
4. ThemeForest Dashboard → Item → Upload new file
5. Minor updates (bug fixes): fast-tracked, usually approved within 2–3 days
6. Major updates (new features): goes through full review (7–14 days)

---

### 7.10 Support Workflow

ThemeForest buyers get 6 months of included support. Set up a workflow before launch:

- **Support channel:** Use Envato's built-in comments for public issues (other buyers can see answers)
- **Private issues:** Use Envato support tickets for account-specific issues
- **Response SLA:** 24–48 hours on business days
- **Common issues to document in FAQ:** (add to documentation as they come up)

**Triage levels:**
- Bug in the template code → Fix and release update within 7 days
- Buyer's custom modification broke something → Point to docs, not covered under support
- Feature request → Log for future version, do not promise timeline

---

## Launch Day Checklist

- [ ] Live demo URL is up and fully functional
- [ ] All 7 preview images uploaded to ThemeForest
- [ ] Item description copy finalized and proofread
- [ ] Documentation HTML file complete and readable
- [ ] Item ZIP packaged with no secrets, no node_modules
- [ ] `npm run build` and `npx tsc --noEmit` both pass with 0 errors
- [ ] Submission form filled with correct category and tags
- [ ] Social media posts drafted and ready to publish on approval day
- [ ] Support workflow set up and monitored

---

*This is the final step. Promptly is ready for the world.*
