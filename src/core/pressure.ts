/**
 * pressure — Luftdruck-Trend als äußerer Zyklus (Spec §26, §28).
 *
 * Der umgangssprachlich als „Wetterfühligkeit" beschriebene Faktor ist die
 * Druck*änderung*, nicht der Absolutwert. Drei Stufen genügen für eine
 * qualitative Aussage; die Schwelle von 1 hPa ist grob und bewusst so gewählt,
 * denn eine Vorhersage ist hier nicht beabsichtigt. Rein beschreibend, keine
 * Gesundheitsaussage (§5, §26.6).
 */

export type PressureTrend = 'rising' | 'falling' | 'stable';

export interface PressurePoint {
  time: Date;
  hpa: number;
}

export interface PressureChange {
  trend: PressureTrend;
  /** Änderung über das Vergleichsfenster in hPa, auf 0,1 gerundet. */
  deltaHpa: number;
}

/** Vergleichsfenster: der Druck vor rund drei Stunden. */
const WINDOW_MS = 3 * 3_600_000;
/** Unter dieser Schwelle ist der Unterschied für eine Aussage bedeutungslos. */
const THRESHOLD_HPA = 1;

function nearest(points: PressurePoint[], targetMs: number): PressurePoint | null {
  let best: PressurePoint | null = null;
  let bestDist = Infinity;
  for (const p of points) {
    const dist = Math.abs(p.time.getTime() - targetMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

/**
 * Druckänderung der letzten ~3 h. Null, wenn die Reihe die beiden Stützstellen
 * nicht hergibt — der Aufrufer blendet die Zeile dann aus, statt einen
 * Fehlertext zu zeigen (§10).
 *
 * Liegt der Zeitpunkt nah am Reihenanfang, rückt die Vergleichsstelle näher
 * heran; die Aussage wird dadurch schwächer, aber nie falsch.
 */
export function pressureTrend(points: PressurePoint[], now: Date): PressureChange | null {
  if (points.length < 2) return null;
  const nowPoint = nearest(points, now.getTime());
  const pastPoint = nearest(points, now.getTime() - WINDOW_MS);
  if (!nowPoint || !pastPoint) return null;
  if (nowPoint.time.getTime() === pastPoint.time.getTime()) return null;
  const deltaHpa = Math.round((nowPoint.hpa - pastPoint.hpa) * 10) / 10;
  const trend: PressureTrend =
    deltaHpa > THRESHOLD_HPA ? 'rising' : deltaHpa < -THRESHOLD_HPA ? 'falling' : 'stable';
  return { trend, deltaHpa };
}
