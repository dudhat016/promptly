import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { initFirebase } from '../lib/firebase.js';
import { fail } from '../lib/apiResponse.js';

export interface ApiKeyRequest extends Request {
  apiUserId?: string;
  apiKeyId?: string;
  apiScopes?: string[];
  apiRateLimit?: number;
}

export async function apiKeyAuth(req: ApiKeyRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer sk_')) {
    res.status(401).json(fail('unauthorized', 'Missing or invalid API key. Pass: Authorization: Bearer sk_live_...'));
    return;
  }

  const rawKey = auth.slice(7);
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const firebase = await initFirebase();
  if (!firebase) {
    res.status(503).json(fail('service_unavailable', 'Service temporarily unavailable'));
    return;
  }

  const snap = await firebase.db
    .collection('api_keys')
    .where('keyHash', '==', keyHash)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (snap.empty) {
    res.status(401).json(fail('invalid_api_key', 'Invalid or revoked API key'));
    return;
  }

  const doc = snap.docs[0];
  const data = doc.data();

  // Non-blocking lastUsedAt update
  doc.ref.update({ lastUsedAt: new Date() }).catch(() => {});

  req.apiUserId  = data.userId;
  req.apiKeyId   = doc.id;
  req.apiScopes  = data.scopes ?? [];
  req.apiRateLimit = data.rateLimit ?? 1000;

  // Inform the caller of their rate limit window (resets on the hour)
  const resetEpoch = Math.ceil(Date.now() / 3_600_000) * 3_600;
  res.setHeader('X-RateLimit-Limit', String(req.apiRateLimit));
  res.setHeader('X-RateLimit-Reset', String(resetEpoch));

  next();
}
