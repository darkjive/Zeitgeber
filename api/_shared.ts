/**
 * Gemeinsame Server-Bausteine für den Web-Push-Dienst (optional, §reminders).
 *
 * Bewusst datensparsam: gespeichert wird nur, was zum Zustellen nötig ist —
 * der Push-Endpunkt, die Verschlüsselungs-Schlüssel des Browsers, grobe
 * Koordinaten, Zeitzone, Sprache und die gewählten Kategorien. Keine Konten,
 * keine Namen, kein Verlauf. Jedes Abo lässt sich jederzeit wieder löschen.
 */

import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';
import webpush from 'web-push';
import type { ReminderCategory } from '../src/core/reminders.js';

// Vercels Marketplace-Upstash-Integration setzt KV_REST_API_URL/TOKEN
// (die vereinheitlichte "Vercel KV"-Benennung) statt der von Redis.fromEnv()
// erwarteten UPSTASH_REDIS_REST_URL/TOKEN — beide Namen abdecken.
export const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  lat: number;
  lon: number;
  tz?: string;
  lang: 'de' | 'en';
  categories: ReminderCategory[];
  ars?: string;
  createdAt: number;
}

export const SUBS_SET = 'subs';
export const subKey = (hash: string): string => `sub:${hash}`;
export const sentKey = (hash: string, eventId: string): string => `sent:${hash}:${eventId}`;

/** Kurzer, stabiler Schlüssel aus dem (langen) Push-Endpunkt. */
export const hashEndpoint = (endpoint: string): string =>
  crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 24);

let vapidReady = false;

/** VAPID aus den Umgebungsvariablen setzen; false, wenn nicht konfiguriert. */
export function ensureVapid(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@zeitgeber.app', pub, priv);
    vapidReady = true;
  }
  return true;
}

export { webpush };
