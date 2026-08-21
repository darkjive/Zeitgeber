/**
 * push — Web-Push-Anmeldung im Browser (optional, §reminders).
 *
 * Meldet das Gerät beim Push-Dienst des Browsers an und hinterlegt das Abo
 * (Endpunkt + Schlüssel) samt grobem Standort und Sprache auf dem Server, der
 * daraus zeitgenaue Erinnerungen zustellt – auch bei geschlossener App.
 *
 * Alles degradiert sauber: Ist der Server nicht konfiguriert oder der Browser
 * ohne Push-Unterstützung, gibt jede Funktion `false`/nichts zurück und die App
 * bleibt bei In-App-Hinweisen.
 */

const base = import.meta.env.BASE_URL;

export interface PushMeta {
  lat: number;
  lon: number;
  tz?: string;
  lang: 'de' | 'en';
  categories: string[];
  /** Kreis-ARS (12-stellig) für Zivilschutz-Warnungen — client-seitig berechnet (§38.1). */
  ars?: string;
}

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

async function fetchVapidKey(): Promise<string | null> {
  try {
    const res = await fetch(`${base}api/vapid`);
    if (!res.ok) return null;
    const json = (await res.json()) as { publicKey?: string };
    return typeof json.publicKey === 'string' ? json.publicKey : null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Anmelden und Abo auf dem Server ablegen. true = Hintergrund-Push aktiv. */
export async function subscribeToPush(meta: PushMeta): Promise<boolean> {
  if (!pushSupported()) return false;
  const key = await fetchVapidKey();
  if (!key) return false; // Server nicht konfiguriert → kein Push
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
    }
    const res = await fetch(`${base}api/subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), ...meta }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch(`${base}api/unsubscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {
      /* Server-Aufräumen ist best effort; das lokale Abo lösen wir ohnehin. */
    });
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}

export async function hasPushSubscription(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}
