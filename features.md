
You are a senior SEO strategist and AI Answer Engine Optimization (AEO) expert.
Analyze the website "Promptly" — an AI prompt library and discovery platform —
and create a complete growth strategy covering:

---

## 1. TECHNICAL SEO (Google Indexing & Ranking)

- Implement structured data (JSON-LD) for:
  - WebSite schema with SearchAction (enables Google Sitelinks search box)
  - Article schema on every blog post
  - HowTo schema on prompt tutorial pages
  - FAQPage schema on key landing pages
  - BreadcrumbList schema on all inner pages
  - SoftwareApplication schema for the tool itself
  - CreativeWork schema for each prompt card

- Core Web Vitals optimization:
  - LCP under 2.5s (lazy load images, preload hero)
  - CLS under 0.1 (reserve space for dynamic content)
  - INP under 200ms (code split heavy components)

- Sitemap.xml with priority weights:
  - Homepage: 1.0
  - Category pages: 0.9
  - Individual prompt pages: 0.8
  - Blog posts: 0.8
  - Tag pages: 0.6

- robots.txt: allow all crawlers, block /admin/* /api/*
- Canonical tags on all pages to prevent duplicate content
- hreflang tags for multilingual (en, hi, es)
- Open Graph + Twitter Card meta on every page
- Prerender dynamic routes for Googlebot (SSR or prerendering)

---

## 2. CONTENT SEO (Organic Traffic)

Target these high-intent keyword clusters:

PRIMARY (commercial intent):
- "best AI prompts for [use case]"
- "ChatGPT prompts for [topic]"
- "Midjourney prompts for [topic]"
- "free AI prompt library"
- "copy AI prompts"

SECONDARY (informational intent → blog):
- "how to write AI prompts for [topic]"
- "AI prompt examples for [topic]"
- "[Festival] AI photo prompts" (Diwali, Raksha Bandhan, Christmas etc.)
- "best prompts for image generation 2026"

LONG-TAIL (low competition, high conversion):
- "ultra realistic Raksha Bandhan AI photo prompt"
- "Midjourney prompt for Indian wedding photography"
- "ChatGPT prompt to write a business proposal"

Content calendar:
- 3 blog posts/week targeting above keywords
- Each blog must have 3+ copyable prompt formula cards
- Seasonal content: festivals, events, trending AI tools
- "X Prompts for Y" list format posts (highest CTR)

---

## 3. AEO — Answer Engine Optimization (Appear in AI Tools)

Goal: When users ask ChatGPT, Perplexity, Gemini, or Claude about AI prompts,
Promptly.com should appear as a cited source.

Strategy:
- Structure every page with clear Q&A sections using FAQ schema
- Write content in the format AI models love to cite:
  - Direct factual answers in first paragraph
  - Numbered lists and step-by-step instructions
  - Author expertise signals (author bio, credentials, publish date)
  - Cite primary sources (link to Midjourney, OpenAI docs)

- Create "AI Prompt Hub" pages for each major tool:
  - /prompts/chatgpt/
  - /prompts/midjourney/
  - /prompts/stable-diffusion/
  - /prompts/gemini/
  Each should have 50+ curated prompts with copy buttons

- Submit to AI training datasets & indexes:
  - Common Crawl (ensure robots.txt allows it)
  - Submit sitemap to Bing Webmaster (Copilot uses Bing)
  - List on Product Hunt, G2, Capterra (AI cites these)
  - Get backlinks from AI newsletters (TLDR AI, The Rundown)

- Use conversational headings that match how people ask AI:
  "What is the best prompt for generating Raksha Bandhan photos?"
  "How do I write a Midjourney prompt for Indian traditional photography?"

---

## 5. LIMITS (Admin-Managed)

Limits & security:
- Rate limit by IP: 50 requests/minute
- Rate limit by user: based on plan tier
- Prompt watermarking for free tier downloads
- Captcha after 5 failed auth attempts
- Admin dashboard: manage user tiers, view usage analytics
- Abuse detection: flag accounts copying >500 prompts/hour

---

## 6. BACKLINK & DISTRIBUTION STRATEGY

- Submit to directories: AlternativeTo, Futurepedia, There's An AI For That
- Guest post on: HubSpot Blog, Neil Patel Blog, Search Engine Journal
- Create free tools that attract links:
  - "AI Prompt Generator" (generates prompts from keywords)
  - "Prompt Analyzer" (scores prompt quality)
- YouTube channel: "AI Prompt Tutorial" videos → link back to site
- Reddit presence: r/StableDiffusion, r/ChatGPT, r/midjourney
- Twitter/X: post one copyable prompt daily with site link

---

Deliverable: Full implementation roadmap with priority tiers (P0/P1/P2),
estimated traffic impact per initiative, and 90-day execution timeline.
