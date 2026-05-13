# Standardizing Public Pages Layout

All public-facing pages should use the `PageContainer` component with the `ignoreCustomizer` prop to ensure a consistent, non-customizable layout.

## Pages to Update

- [x] `ExplorePage.tsx`
- [ ] `PricingPage.tsx`
- [ ] `ContactPage.tsx`
- [ ] `FAQPage.tsx`
- [ ] `PromptDetailPage.tsx`
- [ ] `PublicProfilePage.tsx`
- [ ] `BlogPage.tsx`
- [ ] `BlogDetailPage.tsx`
- [ ] `AffiliateInfoPage.tsx`
- [ ] `ChangelogPage.tsx`
- [ ] `TermsPage.tsx`
- [ ] `PrivacyPage.tsx`
- [ ] `CookiePolicyPage.tsx`
- [ ] `DMCAPage.tsx`

## Migration Pattern

Replace:
```tsx
<div className="container mx-auto px-4 max-w-5xl">
```
Or:
```tsx
<PageContainer>
```
With:
```tsx
<PageContainer ignoreCustomizer>
```
