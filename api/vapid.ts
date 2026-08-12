/**
 * GET /api/vapid — liefert den öffentlichen VAPID-Schlüssel für die
 * Push-Anmeldung im Browser. Öffentlich (der Schlüssel ist nicht geheim).
 * 503, solange der Push-Dienst nicht konfiguriert ist — der Client fällt dann
 * sauber auf In-App-Hinweise zurück.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(503).json({ error: 'push-not-configured' });
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({ publicKey: key });
}
