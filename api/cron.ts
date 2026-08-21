/**
 * GET /api/cron — der serverseitige Auslöser des dynamischen Weckers.
 *
 * Wird periodisch angestoßen (Vercel Cron auf Pro, sonst ein externer Pinger,
 * siehe docs/PUSH_SETUP.md). Für jedes gespeicherte Abo werden die anstehenden
 * Erinnerungen mit **exakt derselben Kern-Logik wie im Client** berechnet
 * (src/core/reminders) und fällige Ereignisse als Web Push zugestellt.
 *
 * Schutz: Ist CRON_SECRET gesetzt, muss es als `Authorization: Bearer …`
 * (so schickt es Vercel Cron automatisch) oder als `?key=…` mitkommen.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureVapid, hashEndpoint, redis, sentKey, subKey, SUBS_SET, webpush, type StoredSubscription } from './_shared.js';
import { collectReminders } from '../src/core/reminders.js';
import { normalizeWarnings, type CivilWarning } from '../src/core/civil-warnings.js';
import { createTranslator } from '../src/i18n/index.js';

// Fällig, wenn die Benachrichtigungszeit in den letzten 20 Minuten liegt —
// deckt Auslöse-Intervalle bis 20 min und leichte Verzögerungen ab.
const WINDOW_MS = 20 * 60_000;
const SENT_TTL_S = 90_000; // ~25 h: dieselbe Erinnerung kommt nur einmal am Tag.

function authorized(req: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // ohne Secret offen — nur für lokale Tests, Doku rät zum Secret
  const header = req.headers.authorization;
  const key = req.query.key;
  return header === `Bearer ${secret}` || key === secret;
}

async function fetchWarningsForArs(ars: string): Promise<CivilWarning[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://warnung.bund.de/api31/dashboard/${ars}.json`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return normalizeWarnings(data);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Cache wird pro handler()-Aufruf frisch angelegt (siehe unten) — nicht
// modulweit, sonst würde er auf einem warmen Vercel-Container über mehrere
// Cron-Durchläufe hinweg bestehen bleiben und veraltete/leere Ergebnisse
// einfrieren.
function warningsForArs(ars: string, cache: Map<string, Promise<CivilWarning[]>>): Promise<CivilWarning[]> {
  let p = cache.get(ars);
  if (!p) {
    p = fetchWarningsForArs(ars);
    cache.set(ars, p);
  }
  return p;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!authorized(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  if (!ensureVapid()) {
    res.status(503).json({ error: 'push-not-configured' });
    return;
  }

  const now = new Date();
  const hashes = ((await redis.smembers(SUBS_SET)) as string[]) ?? [];
  let checked = 0;
  let sent = 0;
  let pruned = 0;
  // Pro Invocation frisch — entdoppelt nur innerhalb dieses Durchlaufs
  // (mehrere Abos mit demselben ars teilen sich einen Fetch), lebt aber
  // nicht über den Durchlauf hinaus.
  const warningsCache = new Map<string, Promise<CivilWarning[]>>();

  // Alle Subs einmal vorab laden — daraus lässt sich sowohl die Menge der
  // benötigten ars-Werte bilden (für den parallelen Prefetch unten) als auch
  // die Hauptschleife speisen, ohne jeden Sub zweimal aus Redis zu holen.
  const loaded: { hash: string; sub: StoredSubscription | null }[] = [];
  for (const hash of hashes) {
    loaded.push({ hash, sub: (await redis.get(subKey(hash))) as StoredSubscription | null });
  }

  const uniqueArs = new Set<string>();
  for (const { sub } of loaded) {
    if (sub?.categories.includes('civil-warning') && sub.ars) uniqueArs.add(sub.ars);
  }
  // Alle BBK-Fetches parallel anstossen, BEVOR die serielle Abo-Schleife
  // beginnt — sonst summieren sich die 8s-Timeouts bei vielen verschiedenen
  // ars-Werten zu einer Laufzeit, die ein Vercel-Function-Timeout reissen
  // könnte. Die spätere warningsForArs()-Aufrufe unten treffen dann nur noch
  // auf ein bereits erfülltes (oder unterwegs erfülltes) Promise im Cache.
  await Promise.all([...uniqueArs].map((ars) => warningsForArs(ars, warningsCache)));

  for (const { hash, sub } of loaded) {
    if (!sub) {
      await redis.srem(SUBS_SET, hash);
      continue;
    }
    // Ein Fehler bei einem einzelnen Abo (kaputte Redis-Daten, Fetch-Fehler,
    // was auch immer) darf die Verarbeitung der übrigen Abos nicht abbrechen.
    try {
      checked++;
      const loc = { latitude: sub.lat, longitude: sub.lon };
      const t = createTranslator(sub.lang);
      const events = collectReminders(now, loc, sub.categories);

      for (const e of events) {
        const notifyAt = new Date(e.at).getTime() - e.leadMin * 60_000;
        if (now.getTime() < notifyAt || now.getTime() >= notifyAt + WINDOW_MS) continue;

        // Entdopplung: nur der erste Treffer je Abo & Ereignis stellt zu.
        const first = await redis.set(sentKey(hash, e.id), 1, { nx: true, ex: SENT_TTL_S });
        if (!first) continue;

        const payload = JSON.stringify({ title: t('remind.appTitle'), body: t(e.msgKey), tag: e.id, url: '/' });
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
          sent++;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            // Abo ist tot (abbestellt/abgelaufen) → aufräumen.
            await redis.del(subKey(hash));
            await redis.srem(SUBS_SET, hash);
            pruned++;
          }
        }
      }

      if (sub.categories.includes('civil-warning') && sub.ars) {
        const warnings = await warningsForArs(sub.ars, warningsCache);
        for (const w of warnings) {
          const eventId = `${w.id}:${w.version}`;
          const first = await redis.set(sentKey(hash, eventId), 1, { nx: true, ex: SENT_TTL_S });
          if (!first) continue;
          const title = w.i18nTitle[sub.lang] ?? w.i18nTitle.de ?? w.id;
          const payload = JSON.stringify({ title: t('remind.appTitle'), body: title, tag: eventId, url: '/' });
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
            sent++;
          } catch (err) {
            const code = (err as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) {
              await redis.del(subKey(hash));
              await redis.srem(SUBS_SET, hash);
              pruned++;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`cron: Abo ${hash} übersprungen wegen Fehler`, err);
    }
  }

  res.status(200).json({ ok: true, now: now.toISOString(), checked, sent, pruned });
}
