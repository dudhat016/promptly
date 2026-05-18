import { Router, json } from 'express';
import { randomBytes, createHash } from 'crypto';
import admin from 'firebase-admin';
import { initFirebase } from '../lib/firebase.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const VALID_SCOPES = ['prompts:read', 'credits:read', 'credits:write', 'profile:read'] as const;
const DEFAULT_SCOPES = [...VALID_SCOPES];

function generateKey(): { raw: string; hash: string; prefix: string } {
  const raw    = `sk_live_${randomBytes(20).toString('hex')}`;
  const hash   = createHash('sha256').update(raw).digest('hex');
  const prefix = `${raw.slice(0, 16)}...`;
  return { raw, hash, prefix };
}

// ── GET /api/developer/keys ───────────────────────────────────────────────
// List all API keys for the authenticated user (never returns the raw key)

router.get('/keys', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json({ error: 'Service unavailable' });

    const snap = await firebase.db
      .collection('api_keys')
      .where('userId', '==', req.user!.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const keys = snap.docs.map(d => {
      const data = d.data();
      return {
        id:          d.id,
        name:        data.name,
        prefix:      data.prefix,
        scopes:      data.scopes,
        rateLimit:   data.rateLimit,
        active:      data.active,
        lastUsedAt:  data.lastUsedAt?.toDate?.()?.toISOString() ?? null,
        createdAt:   data.createdAt?.toDate?.()?.toISOString()  ?? null,
      };
    });

    return res.json({ keys });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/developer/keys ──────────────────────────────────────────────
// Generate a new API key. Returns the raw key ONCE — not stored, never shown again.

router.post('/keys', authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json({ error: 'Service unavailable' });

    // Cap at 5 active keys per user
    const existing = await firebase.db
      .collection('api_keys')
      .where('userId', '==', req.user!.uid)
      .where('active', '==', true)
      .get();

    if (existing.size >= 5) {
      return res.status(400).json({ error: 'Maximum of 5 active API keys allowed. Revoke one before creating another.' });
    }

    const name: string   = (req.body.name as string)?.slice(0, 64) || 'My API Key';
    const scopes: string[] = Array.isArray(req.body.scopes)
      ? req.body.scopes.filter((s: string) => VALID_SCOPES.includes(s as any))
      : DEFAULT_SCOPES;

    if (scopes.length === 0) {
      return res.status(400).json({ error: `Invalid scopes. Valid values: ${VALID_SCOPES.join(', ')}` });
    }

    const { raw, hash, prefix } = generateKey();

    const docRef = await firebase.db.collection('api_keys').add({
      userId:    req.user!.uid,
      name,
      keyHash:   hash,
      prefix,
      scopes,
      rateLimit: 1000,
      active:    true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
    });

    // Return raw key only this once
    return res.status(201).json({
      id:        docRef.id,
      key:       raw,      // shown once — copy and store it securely
      prefix,
      name,
      scopes,
      rateLimit: 1000,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/developer/keys/:id ───────────────────────────────────────
// Revoke a key (sets active: false, never deletes the record)

router.delete('/keys/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(503).json({ error: 'Service unavailable' });

    const docRef = firebase.db.collection('api_keys').doc(req.params.id);
    const snap   = await docRef.get();

    if (!snap.exists) return res.status(404).json({ error: 'API key not found' });
    if (snap.data()!.userId !== req.user!.uid) return res.status(403).json({ error: 'Forbidden' });

    await docRef.update({ active: false, revokedAt: admin.firestore.FieldValue.serverTimestamp() });

    return res.json({ revoked: true, id: req.params.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
