/**
 * POST /api/subscribe — speichert (oder aktualisiert) ein Push-Abo.
 * Body: { subscription, lat, lon, tz?, lang, categories? }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hashEndpoint, redis, subKey, SUBS_SET, type StoredSubscription } from './_shared.js';
import type { ReminderCategory } from '../src/core/reminders.js';

const CATS: ReminderCategory[] = ['comfort', 'outdoor', 'civil-warning'];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    res.status(400).json({ error: 'bad-subscription' });
    return;
  }
  if (typeof body.lat !== 'number' || typeof body.lon !== 'number') {
    res.status(400).json({ error: 'bad-location' });
    return;
  }

  const categories = Array.isArray(body.categories)
    ? (body.categories.filter((c: unknown): c is ReminderCategory => CATS.includes(c as ReminderCategory)))
    : [];

  const record: StoredSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    lat: body.lat,
    lon: body.lon,
    tz: typeof body.tz === 'string' ? body.tz : undefined,
    lang: body.lang === 'en' ? 'en' : 'de',
    categories: categories.length ? categories : ['comfort'],
    // ars landet in cron.ts ungeprüft in einer server-seitigen Fetch-URL —
    // nur exakt 12 Ziffern zulassen, sonst könnte ein beliebiger String
    // (z. B. mit "../") in die ausgehende Request-URL gelangen.
    ars: typeof body.ars === 'string' && /^\d{12}$/.test(body.ars) ? body.ars : undefined,
    createdAt: Date.now(),
  };

  const hash = hashEndpoint(sub.endpoint);
  await redis.set(subKey(hash), record);
  await redis.sadd(SUBS_SET, hash);
  res.status(200).json({ ok: true });
}
