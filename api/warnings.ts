/**
 * GET /api/warnings?ars=<12-stellig> — Proxy für die BBK-Dashboard-API
 * (warnung.bund.de) für den Client (Spec §5, §38.1).
 *
 * warnung.bund.de sendet keinen `Access-Control-Allow-Origin`-Header, ein
 * direkter Browser-Fetch scheitert daher immer an CORS. Dieser Endpunkt holt
 * die Daten server-seitig (wie schon api/cron.ts für die Push-Zustellung)
 * und reicht sie unverändert durch.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const ars = req.query.ars;
  if (typeof ars !== 'string' || !/^\d{12}$/.test(ars)) {
    res.status(400).json({ error: 'bad-ars' });
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const upstream = await fetch(`https://warnung.bund.de/api31/dashboard/${ars}.json`, { signal: ctrl.signal });
    if (!upstream.ok) {
      res.status(upstream.status).json([]);
      return;
    }
    const data = await upstream.json();
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.status(200).json(data);
  } catch {
    res.status(502).json([]);
  } finally {
    clearTimeout(timer);
  }
}
