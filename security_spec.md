# Rules for Promptly SaaS

## 1. Master Gate (Relational Sync)
- Everyone can read categories.
- Everyone can read free prompts.
- Only 'pro' users can read paid prompts OR public preview if we allowed it, but here we'll lock full content for paid prompts.
- Users can manage their own favorites.

## 2. Dirty Dozen Payloads (Security TDD)
1. Setting role to 'admin' as a normal user.
2. Updating someone else's prompt.
3. Reading content of a paid prompt as a 'free' user.
4. Setting subscriptionStatus to 'pro' without Stripe verification (handled by rules checking specific paths).
5. Creating a prompt with a fake creatorId.
6. Injecting a 1MB string into a prompt title.
7. Deleting a category as a non-admin.
8. Listing all user profiles (PII leak).
9. Updating 'createdAt' on a prompt.
10. Creating a favorite for another user's ID.
11. Updating 'likesCount' manually (should be atomic/calculated, but we'll restrict to simple likes for now).
12. Creating a user profile as another UID.

## 3. Implementation Plan
- Helper to check if user is admin.
- Helper to check if user is pro.
- Strict validation for Prompts.
- Isolation for user private data.
