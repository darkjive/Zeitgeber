/**
 * GET /api/aircraft?lamin=&lomin=&lamax=&lomax= — Proxy für die OpenSky-
 * Network-States-API (Spec §20).
 *
 * OpenSky sendet `Access-Control-Allow-Origin` nur für die eigene Origin, ein
 * Browser-Fetch von jeder anderen Origin scheitert daher immer an CORS.
 * Dieser Endpunkt holt die Daten server-seitig und reicht sie unverändert
 * durch — analog zu api/warnings.ts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENSKY = 'https://opensky-network.org/api/states/all';

function bbox(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'string') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const lamin = bbox(req.query.lamin, -90, 90);
  const lomin = bbox(req.query.lomin, -180, 180);
  const lamax = bbox(req.query.lamax, -90, 90);
  const lomax = bbox(req.query.lomax, -180, 180);
  if (lamin === null || lomin === null || lamax === null || lomax === null) {
    res.status(400).json({ error: 'bad-bbox' });
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const upstream = await fetch(`${OPENSKY}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`, {
      signal: ctrl.signal,
    });
    if (!upstream.ok) {
      res.status(upstream.status).json({ states: [] });
      return;
    }
    const data = await upstream.json();
    res.setHeader('Cache-Control', 'public, max-age=10');
    res.status(200).json(data);
  } catch {
    res.status(502).json({ states: [] });
  } finally {
    clearTimeout(timer);
  }
}
