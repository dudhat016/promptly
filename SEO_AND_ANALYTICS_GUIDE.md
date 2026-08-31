# SEO, Google Analytics & Search Console Integration Guide

This guide details how to connect your website (**Promptly**) with **Google Analytics (GA4)**, **Google Search Console**, and the **Sitemap (`sitemap.xml`)**.

---

## 1. 📊 Google Analytics (GA4) Setup

Google Analytics tracks visitor metrics, traffic sources, user retention, and page performance.

### Step 1: Create a GA4 Measurement ID
1. Navigate to [Google Analytics](https://analytics.google.com/).
2. Click **Admin** ⚙️ → **Create Property** → Enter your website name (`Promptly`).
3. Under **Data Streams**, select **Web** and enter your live domain (e.g., `https://aipromptcopypaste.in`).
4. Copy your **Measurement ID** (Format: `G-XXXXXXXXXX`).

### Step 2: Configure in Project
You can configure your Measurement ID in two ways:
* **Option 1 (Admin Dashboard)**: Go to **Admin Panel → Settings → Analytics** and enter your `G-XXXXXXXXXX` ID.
* **Option 2 (Environment Variable)**: Add your Measurement ID to `.env`:
  ```env
  VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
  ```

---

## 2. 🔍 Google Search Console Verification

Google Search Console manages indexing status, search visibility, organic keywords, and crawl diagnostics.

### Step 1: Add Site Property
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Click **Add Property** and select **URL Prefix**.
3. Enter your domain: `https://aipromptcopypaste.in`.

### Step 2: Verify Site Ownership
Choose one of the following verification methods:

* **Method A: Meta Verification Tag (Recommended)**
  Copy the HTML tag provided by Google and paste it into the `<head>` of [`index.html`](file:///c:/Dudhat/github/promptly/index.html):
  ```html
  <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE" />
  ```

* **Method B: HTML File Upload**
  1. Download the HTML verification file provided by Google (e.g., `google123456789.html`).
  2. Place the file inside the `public/` directory: [`public/google123456789.html`](file:///c:/Dudhat/github/promptly/public/).
  3. Verify it resolves at `https://aipromptcopypaste.in/google123456789.html`.

3. Click **Verify** in Search Console.

---

## 3. 🗺️ Sitemap (`sitemap.xml`) Submission

A sitemap allows Google and Bing crawlers to automatically index your prompt marketplace pages, category routes, and blog articles.

### Step 1: Verify Live Sitemap
Your server includes a built-in XML sitemap generator at `/sitemap.xml`:
* URL: `https://aipromptcopypaste.in/sitemap.xml`

### Step 2: Submit to Search Console
1. Open [Google Search Console](https://search.google.com/search-console).
2. Click **Sitemaps** in the left sidebar menu.
3. Under **Add a new sitemap**, type:
   ```text
   sitemap.xml
   ```
4. Click **Submit**.

---

## 📋 Integration Checklist

- [ ] GA4 Measurement ID (`G-XXXXXXXXXX`) configured in Admin Panel or `.env`.
- [ ] Google Search Console site ownership verified via `<meta name="google-site-verification">`.
- [ ] `https://aipromptcopypaste.in/sitemap.xml` submitted to Search Console.
- [ ] XML Sitemap returning HTTP status 200 OK.
