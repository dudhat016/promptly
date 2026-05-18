import { Router } from 'express';
import admin from 'firebase-admin';
import { initFirebase } from '../../lib/firebase.js';
import { ok, fail } from '../../lib/apiResponse.js';
import type { ApiKeyRequest } from '../../middleware/apiKeyAuth.js';

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function sanitizePrompt(
  id: string,
  d: FirebaseFirestore.DocumentData,
  content: FirebaseFirestore.DocumentData | null = null,
) {
  return {
    id,
    title:       d.title       ?? null,
    description: d.description ?? null,
    category:    d.categoryId  ?? null,
    model:       d.model       ?? null,
    tags:        d.tags        ?? [],
    isPaid:      d.isPaid      ?? false,
    price:       d.price       ?? 0,
    credits:     d.credits     ?? 0,
    rating:      d.avgRating   ?? null,
    reviewCount: d.reviewCount ?? 0,
    viewsCount:  d.viewsCount  ?? 0,
    createdAt:   d.createdAt?.toDate?.()?.toISOString() ?? null,
    ...(content ? { content } : {}),
  };
}

async function getUserContext(firebase: Awaited<ReturnType<typeof initFirebase>>, userId: string) {
  const snap = await firebase!.db.collection('users').doc(userId).get();
  const d = snap.data() ?? {};
  return {
    isPro:          d.subscriptionStatus === 'pro',
    credits:        d.credits        ?? 0,
    monthlyLimit:   d.monthlyLimit   ?? 0,
    unlockedPrompts: (d.unlockedPrompts ?? []) as string[],
  };
}

async function getPrivateContent(firebase: Awaited<ReturnType<typeof initFirebase>>, promptId: string) {
  const snap = await firebase!.db
    .collection('prompts').doc(promptId)
    .collection('private').doc('content')
    .get();
  return snap.exists ? snap.data() ?? null : null;
}

// ── GET /api/v1/prompts ────────────────────────────────────────────────────

router.get('/prompts', async (req: ApiKeyRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json(fail('service_unavailable', 'Service unavailable'));

    const limitNum = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const { category, model, cursor } = req.query;
    const isPaidFilter = req.query.isPaid as string | undefined;

    let query = firebase.db
      .collection('prompts')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(limitNum + 1); // +1 to detect next page

    if (category)            query = query.where('categoryId', '==', category) as any;
    if (model)               query = query.where('model', '==', model) as any;
    if (isPaidFilter !== undefined) query = query.where('isPaid', '==', isPaidFilter === 'true') as any;

    if (cursor) {
      const cursorDoc = await firebase.db.collection('prompts').doc(cursor as string).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc) as any;
    }

    const [snap, user] = await Promise.all([
      query.get(),
      getUserContext(firebase, req.apiUserId!),
    ]);

    const hasMore = snap.docs.length > limitNum;
    const docs    = hasMore ? snap.docs.slice(0, limitNum) : snap.docs;

    const prompts = docs.map(d => {
      const isUnlocked = user.isPro || user.unlockedPrompts.includes(d.id);
      // Content is in a private subcollection — not fetched on list for performance
      // Use GET /api/v1/prompts/:id to retrieve content after unlocking
      return { ...sanitizePrompt(d.id, d.data()), unlocked: isUnlocked };
    });

    return res.json(ok(prompts, {
      count:      prompts.length,
      nextCursor: hasMore ? docs[docs.length - 1].id : null,
    }));
  } catch (err: any) {
    return res.status(500).json(fail('internal_error', err.message));
  }
});

// ── GET /api/v1/prompts/:id ───────────────────────────────────────────────

router.get('/prompts/:id', async (req: ApiKeyRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json(fail('service_unavailable', 'Service unavailable'));

    const [promptSnap, user] = await Promise.all([
      firebase.db.collection('prompts').doc(req.params.id).get(),
      getUserContext(firebase, req.apiUserId!),
    ]);

    if (!promptSnap.exists) return res.status(404).json(fail('prompt_not_found', 'Prompt not found', 'id'));
    const d = promptSnap.data()!;
    if (d.status !== 'approved') return res.status(404).json(fail('prompt_not_found', 'Prompt not found', 'id'));

    const isUnlocked = user.isPro || !d.isPaid || user.unlockedPrompts.includes(req.params.id);
    const content    = isUnlocked ? await getPrivateContent(firebase, req.params.id) : null;

    return res.json(ok({ ...sanitizePrompt(req.params.id, d, content), unlocked: isUnlocked }));
  } catch (err: any) {
    return res.status(500).json(fail('internal_error', err.message));
  }
});

// ── POST /api/v1/prompts/:id/unlock ──────────────────────────────────────

router.post('/prompts/:id/unlock', async (req: ApiKeyRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json(fail('service_unavailable', 'Service unavailable'));

    const promptSnap = await firebase.db.collection('prompts').doc(req.params.id).get();
    if (!promptSnap.exists) return res.status(404).json(fail('prompt_not_found', 'Prompt not found', 'id'));

    const d    = promptSnap.data()!;
    const user = await getUserContext(firebase, req.apiUserId!);

    if (!d.isPaid) {
      return res.json(ok({ unlocked: true, creditsSpent: 0 }));
    }
    if (user.isPro || user.unlockedPrompts.includes(req.params.id)) {
      return res.json(ok({ unlocked: true, creditsSpent: 0, alreadyUnlocked: true }));
    }

    const cost = d.credits ?? 1;
    if (user.credits < cost) {
      return res.status(402).json(
        fail('insufficient_credits', `Need ${cost} credits, you have ${user.credits}`, 'credits')
      );
    }

    await firebase.db.collection('users').doc(req.apiUserId!).update({
      credits:         admin.firestore.FieldValue.increment(-cost),
      unlockedPrompts: admin.firestore.FieldValue.arrayUnion(req.params.id),
      updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json(ok({ unlocked: true, creditsSpent: cost, remainingCredits: user.credits - cost }));
  } catch (err: any) {
    return res.status(500).json(fail('internal_error', err.message));
  }
});

// ── GET /api/v1/me ────────────────────────────────────────────────────────

router.get('/me', async (req: ApiKeyRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json(fail('service_unavailable', 'Service unavailable'));

    const snap = await firebase.db.collection('users').doc(req.apiUserId!).get();
    if (!snap.exists) return res.status(404).json(fail('user_not_found', 'User not found'));

    const d = snap.data()!;
    return res.json(ok({
      id:              snap.id,
      email:           d.email           ?? null,
      displayName:     d.displayName     ?? null,
      plan:            d.subscriptionStatus ?? 'free',
      activePlanId:    d.activePlanId    ?? null,
      billingCycle:    d.billingCycle    ?? null,
      currentPeriodEnd: d.currentPeriodEnd?.toDate?.()?.toISOString() ?? null,
      createdAt:       d.createdAt?.toDate?.()?.toISOString() ?? null,
    }));
  } catch (err: any) {
    return res.status(500).json(fail('internal_error', err.message));
  }
});

// ── GET /api/v1/me/credits ────────────────────────────────────────────────

router.get('/me/credits', async (req: ApiKeyRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json(fail('service_unavailable', 'Service unavailable'));

    const [userSnap, historySnap] = await Promise.all([
      firebase.db.collection('users').doc(req.apiUserId!).get(),
      firebase.db.collection('credits_history')
        .where('userId', '==', req.apiUserId!)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get(),
    ]);

    if (!userSnap.exists) return res.status(404).json(fail('user_not_found', 'User not found'));

    const d = userSnap.data()!;
    const history = historySnap.docs.map(doc => {
      const h = doc.data();
      return {
        id:          doc.id,
        type:        h.type        ?? null,
        amount:      h.amount      ?? null,
        description: h.description ?? null,
        createdAt:   h.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return res.json(ok({
      balance:      d.credits      ?? 0,
      monthlyLimit: d.monthlyLimit ?? 0,
      history,
    }));
  } catch (err: any) {
    return res.status(500).json(fail('internal_error', err.message));
  }
});

export default router;
