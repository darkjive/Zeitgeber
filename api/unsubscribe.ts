/**
 * POST /api/unsubscribe — löscht ein Push-Abo. Body: { endpoint }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hashEndpoint, redis, subKey, SUBS_SET } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const endpoint = body?.endpoint;
  if (typeof endpoint !== 'string') {
    res.status(400).json({ error: 'bad-endpoint' });
    return;
  }
  const hash = hashEndpoint(endpoint);
  await redis.del(subKey(hash));
  await redis.srem(SUBS_SET, hash);
  res.status(200).json({ ok: true });
}
