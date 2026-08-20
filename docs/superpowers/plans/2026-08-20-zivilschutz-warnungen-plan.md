# Zivilschutz-Warnungen (BBK/NINA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aktive amtliche Zivilschutz-Warnungen (BBK/NINA) für den Landkreis
des Nutzers anzeigen (Topbar-Badge + Panel + Menü-Modul) und optional per
Push zustellen, über das bestehende Erinnerungen-Opt-in.

**Architecture:** Neue reine Kreis-Zuordnung (`core/civil-warnings.ts`) auf
Basis des bereits vorhandenen `data/kreise.ts`, analog zu `nearestCity()` in
`core/location.ts`. Foreground-Anzeige über einen Fetch gegen die
schlüssellose BBK-Dashboard-API (analog `features/weather.ts`). Push läuft
über das bestehende Web-Push-System (`api/cron.ts`), bekommt aber einen
eigenen Zweig statt durch die generische `collectReminders()`-Pipeline zu
laufen, weil Zivilschutz-Warnungen — anders als die bestehenden
Komfort-/Outdoor-Erinnerungen — einen echten Netzwerk-Call brauchen.

**Tech Stack:** TypeScript, Vite, Vitest (`environment: 'node'`), Vercel
Functions (`api/`), Upstash Redis, web-push.

**Spec:** `docs/superpowers/specs/2026-08-20-zivilschutz-warnungen-design.md`

## Global Constraints

- **Sprache:** Code, Kommentare, Commit-Messages und Doku auf Deutsch.
  Kommentare erklären das WARUM, nicht das WAS.
- **§5.2 (Regulatorik):** Keine Handlungsanweisungen in Befehlsform, keine
  Krankheits-/Gefahren-Dramatisierung. Der Disclaimer-Text ist Pflicht und
  exakt wie im Design-Doc formuliert (siehe Task 2).
- **§10 (nie leere/Fehler-Ansicht):** Kein Netz/Timeout → leere Liste bzw.
  ausgeblendetes Badge, nie ein Fehlertext.
- **§38.1 (rein lokal, kein zusätzliches Backend):** Kein Kreise-Datensatz
  auf dem Server — der ARS wird ausschliesslich client-seitig berechnet und
  nur als Zeichenkette ans bestehende Push-Backend mitgeschickt.
- **Testumgebung:** `vitest run`, `environment: 'node'` (siehe
  `vite.config.ts`). Nur `src/core/*.test.ts` läuft automatisiert;
  `src/features/*.ts` und `api/*.ts` haben laut Repo-Konvention keine
  automatisierten Tests (nur Typecheck + manueller Check).
- **API-Format (live gegen `warnung.bund.de` verifiziert, 2026-08-20):**
  `GET https://warnung.bund.de/api31/dashboard/{ars}.json`, kein Schlüssel.
  `{ars}` ist der 12-stellige ARS (5-stelliger Kreis-AGS + 7 Nullen) —
  `.../064120000000.json` → HTTP 200 `[]`/Array; `.../06412.json` → HTTP
  400. Antwortobjekte: `{ id, version, startDate, severity: 'Minor'|
  'Moderate'|'Severe'|'Extreme', urgency, type: 'Alert'|'Update'|'Cancel',
  i18nTitle: { de, en, ... } }`.
- **Commits:** Der Nutzer committet ausschliesslich selbst. Jeder Task
  nennt die vorgeschlagene Nachricht (Conventional Commits, deutscher
  Betreff) — nur ausführen, wenn der Nutzer es ausdrücklich verlangt.
- **Verifikation je Task:** `npm run typecheck` muss sauber sein, bevor ein
  Task als fertig gilt; core-Tasks zusätzlich `npm run test`.

## File Structure

| Datei | Verantwortung | Task |
|---|---|---|
| `src/core/civil-warnings.ts` | Kreis-Zuordnung, ARS-Formatierung, Warnungs-Typen, Severity-Farben — reine Funktionen | 1 |
| `src/core/civil-warnings.test.ts` | Tests zu obigem | 1 |
| `src/features/civil-warnings.ts` | Netzwerk-Abruf + Badge-/Panel-UI-Bausteine | 2 |
| `src/main.ts` | Badge-Markup, Panel-Anbindung, Menü-Eintrag, Refresh-Verdrahtung | 2 |
| `src/i18n/index.ts` | neue `warn.*`-Schlüssel DE/EN | 2 |
| `src/icons.ts` | neues Icon `triangle-alert` | 2 |
| `src/styles.css` | Badge- und Panel-Listen-Styles | 2 |
| `src/core/reminders.ts` | `ReminderCategory` um `'civil-warning'` erweitert (No-op-Quelle) | 3 |
| `src/features/reminders.ts` | Kategorie + ARS ins Abo aufnehmen | 3 |
| `src/features/push.ts` | `PushMeta.ars` | 3 |
| `api/_shared.ts` | `StoredSubscription.ars` | 3 |
| `api/subscribe.ts` | Kategorie zulassen, `ars` speichern | 3 |
| `api/cron.ts` | eigener Zweig: Warnungen abrufen (gecacht pro ARS), zustellen | 3 |

**Reihenfolge:** Task 1 → 2 → 3. Task 1 ist Grundlage für 2 und 3; Task 2
und 3 sind danach unabhängig voneinander, aber 2 zuerst empfohlen (sichtbares
Ergebnis zuerst).

---

### Task 1: Kreis-Zuordnung, ARS-Formatierung, Severity-Farben (core, TDD)

**Files:**
- Create: `src/core/civil-warnings.ts`
- Test: `src/core/civil-warnings.test.ts`

**Interfaces:**
- Consumes: `KREISE_PACKED` aus `src/data/kreise.ts` (Format
  `"AGS|Name|Breite|Länge"` je Zeile, bereits vorhanden), `distanceKm()` und
  `GeoLocation` aus `src/core/location.ts` bzw. `src/core/astro-engine.ts`.
- Produces:
  ```ts
  export interface Kreis { ags: string; name: string; latitude: number; longitude: number; }
  export interface NearestKreis extends Kreis { distanceKm: number; }
  export function nearestKreis(loc: GeoLocation): NearestKreis | null;
  export function arsFromAgs(ags: string): string;
  export type Severity = 'Minor' | 'Moderate' | 'Severe' | 'Extreme';
  export interface CivilWarning {
    id: string;
    version: number;
    startDate: string;
    severity: Severity;
    urgency: string;
    type: 'Alert' | 'Update' | 'Cancel';
    i18nTitle: Record<string, string>;
  }
  export function severityColor(severity: Severity): string;
  ```
  Task 2 und 3 nutzen genau diese Namen/Typen.

- [ ] **Step 1: Failing Tests schreiben**

Neue Datei `src/core/civil-warnings.test.ts`:

```ts
/**
 * Validierung der Kreis-Zuordnung und Severity-Einordnung für Zivilschutz-
 * Warnungen (Spec §10, §38.1). Rein lokal, kein Netzwerk hier.
 */

import { describe, expect, test } from 'vitest';
import { arsFromAgs, nearestKreis, severityColor } from './civil-warnings';

const FRANKFURT = { latitude: 50.119, longitude: 8.645 };
const NORDATLANTIK = { latitude: 45.0, longitude: -30.0 };

describe('nearestKreis', () => {
  test('findet Frankfurt am Main für Frankfurter Koordinaten', () => {
    const hit = nearestKreis(FRANKFURT);
    expect(hit?.name).toBe('Frankfurt am Main');
    expect(hit?.ags).toBe('06412');
    expect(hit!.distanceKm).toBeLessThan(5);
  });

  test('liefert null weit ausserhalb Deutschlands', () => {
    expect(nearestKreis(NORDATLANTIK)).toBeNull();
  });
});

describe('arsFromAgs', () => {
  test('füllt den 5-stelligen Kreis-AGS auf die von der BBK-API geforderte 12-stellige ARS auf', () => {
    // Live gegen warnung.bund.de geprüft (2026-08-20): .../064120000000.json
    // antwortet HTTP 200, .../06412.json mit HTTP 400.
    expect(arsFromAgs('06412')).toBe('064120000000');
  });
});

describe('severityColor', () => {
  test('liefert für jede Stufe eine eigene Farbe', () => {
    const colors = new Set((['Minor', 'Moderate', 'Severe', 'Extreme'] as const).map(severityColor));
    expect(colors.size).toBe(4);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run src/core/civil-warnings.test.ts`
Expected: FAIL — „Failed to resolve import './civil-warnings'".

- [ ] **Step 3: Implementieren**

Neue Datei `src/core/civil-warnings.ts`:

```ts
/**
 * civil-warnings — Kreis-Zuordnung, ARS-Formatierung und Datentypen für
 * amtliche Zivilschutz-Warnungen (Spec §10, §38.1). Reine Funktionen, kein
 * Netzwerk hier — der Abruf liegt in features/civil-warnings.ts.
 */

import type { GeoLocation } from './astro-engine';
import { distanceKm } from './location';
import { KREISE_PACKED } from '../data/kreise';

export interface Kreis {
  ags: string;
  name: string;
  latitude: number;
  longitude: number;
}

let kreise: Kreis[] | null = null;

/** Die gepackte Liste wird erst beim ersten Bedarf zerlegt (402 Zeilen). */
function allKreise(): Kreis[] {
  if (kreise) return kreise;
  kreise = KREISE_PACKED.split('\n').map((line) => {
    const [ags, name, lat, lon] = line.split('|');
    return { ags, name, latitude: +lat, longitude: +lon };
  });
  return kreise;
}

export interface NearestKreis extends Kreis {
  distanceKm: number;
}

/**
 * Kreise decken ganz Deutschland lückenlos ab — jenseits dieser Distanz ist
 * der „nächste" Kreis keine ehrliche Zuordnung mehr (z. B. jenseits der
 * Grenze). Grosszügiger als LABEL_MAX_KM in location.ts, weil
 * Kreis-Schwerpunkte (statt einzelner Städte) deutlich weiter auseinander
 * liegen können.
 */
const KREIS_MAX_KM = 80;

// Gleiches Cache-Muster wie nearestCity() in location.ts — der Standort
// ändert sich fast nie, ein Ergebnis zurückzuhalten spart den vollen
// Durchlauf über alle 402 Kreise.
let lastKreisQuery: { lat: number; lon: number; hit: NearestKreis | null } | null = null;

/** Nächstgelegener bekannter Kreis, oder null wenn keiner näher als `KREIS_MAX_KM` liegt. */
export function nearestKreis(loc: GeoLocation): NearestKreis | null {
  if (lastKreisQuery && lastKreisQuery.lat === loc.latitude && lastKreisQuery.lon === loc.longitude) {
    return lastKreisQuery.hit;
  }
  let best: NearestKreis | null = null;
  for (const k of allKreise()) {
    if (Math.abs(k.latitude - loc.latitude) > 1) continue;
    const d = distanceKm(loc, k);
    if (d <= KREIS_MAX_KM && (!best || d < best.distanceKm)) best = { ...k, distanceKm: d };
  }
  lastKreisQuery = { lat: loc.latitude, lon: loc.longitude, hit: best };
  return best;
}

/** Kreis-AGS (5-stellig) → ARS (12-stellig), wie von der BBK-Warn-API gefordert. */
export function arsFromAgs(ags: string): string {
  return ags.padEnd(12, '0');
}

export type Severity = 'Minor' | 'Moderate' | 'Severe' | 'Extreme';

export interface CivilWarning {
  id: string;
  version: number;
  startDate: string;
  severity: Severity;
  urgency: string;
  type: 'Alert' | 'Update' | 'Cancel';
  i18nTitle: Record<string, string>;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  Minor: '#D8A24A',
  Moderate: '#E0793C',
  Severe: '#C94F3D',
  Extreme: '#8B2F3A',
};

/** Farbe je Schweregrad — dieselbe Staffelung wie beim Wetter-Badge (fair/poor). */
export function severityColor(severity: Severity): string {
  return SEVERITY_COLOR[severity];
}
```

- [ ] **Step 4: Tests laufen lassen, grün bestätigen**

Run: `npx vitest run src/core/civil-warnings.test.ts`
Expected: 4 Tests PASS.

- [ ] **Step 5: Typprüfung**

Run: `npm run typecheck`
Expected: keine Ausgabe, Exit-Code 0.

- [ ] **Step 6: Commit (nur auf ausdrückliche Freigabe des Nutzers)**

```bash
git add src/core/civil-warnings.ts src/core/civil-warnings.test.ts
git commit -m "feat(core): Kreis-Zuordnung und Severity-Einordnung für Zivilschutz-Warnungen"
```

---

### Task 2: Anzeige — Badge, Panel, Menü-Eintrag

**Files:**
- Create: `src/features/civil-warnings.ts`
- Modify: `src/main.ts` (Topbar-Markup Zeile 220–223, `MODULES` Zeile
  192–206, `applyStaticI18n()` Zeile 331–343, `setLocation()` Zeile 628–635,
  `boot()` Zeile 788–811, `wireEvents()` — neuer Klick-Handler)
- Modify: `src/i18n/index.ts` (neue `warn.*`-Schlüssel DE Zeile 181, EN
  Zeile 566, jeweils direkt vor `'about.button'`)
- Modify: `src/icons.ts` (neues Icon `triangle-alert`)
- Modify: `src/styles.css` (Badge-Farbe nach `.iconbtn--side`-Block Zeile
  163–166; Panel-Listen-Styles nach `.weather__sub`-Block Zeile 485–487)

**Interfaces:**
- Consumes: `nearestKreis`, `arsFromAgs`, `CivilWarning`, `severityColor`
  aus Task 1 (`../core/civil-warnings`), `icon`/`IconName` aus `../icons`,
  `Lang`/`Translator` aus `../i18n`.
- Produces:
  ```ts
  export function fetchCivilWarnings(loc: GeoLocation): Promise<CivilWarning[]>;
  export function openCivilWarnings(warnings: CivilWarning[], kreisName: string | null, lang: Lang, t: Translator): void;
  ```
  Task 3 verwendet `nearestKreis`/`arsFromAgs` aus Task 1 direkt, nicht
  diese beiden Funktionen.

- [ ] **Step 1: Icon ergänzen**

In `src/icons.ts` den Union-Typ um einen Eintrag erweitern — nach
`| 'panel-left';` wird daraus:

```ts
  | 'panel-left'
  | 'triangle-alert';
```

Und in `PATHS` (nach der Zeile `'panel-left': ...`) ergänzen:

```ts
  'triangle-alert':
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
```

- [ ] **Step 2: i18n-Schlüssel ergänzen (DE)**

In `src/i18n/index.ts` im deutschen Wörterbuch direkt vor
`'about.button': 'Info',` (Zeile 183) einfügen:

```ts
  'warn.button': 'Warnungen',
  'warn.badge': 'Aktive Warnungen: {n}',
  'warn.title': 'Zivilschutz-Warnungen',
  'warn.empty': 'Keine aktiven Warnungen für {kreis}.',
  'warn.close': 'Schließen',
  'warn.severity.minor': 'Gering',
  'warn.severity.moderate': 'Mittel',
  'warn.severity.severe': 'Schwer',
  'warn.severity.extreme': 'Extrem',
  'warn.disclaimer':
    'Amtliche Warnungen des Bundes für deinen Landkreis. Ersetzt keine offiziellen Kanäle, Sirenen oder Anweisungen vor Ort.',
```

- [ ] **Step 3: i18n-Schlüssel ergänzen (EN)**

Im englischen Wörterbuch direkt vor `'about.button': 'Info',` (Zeile 568)
einfügen:

```ts
  'warn.button': 'Warnings',
  'warn.badge': 'Active warnings: {n}',
  'warn.title': 'Civil protection warnings',
  'warn.empty': 'No active warnings for {kreis}.',
  'warn.close': 'Close',
  'warn.severity.minor': 'Minor',
  'warn.severity.moderate': 'Moderate',
  'warn.severity.severe': 'Severe',
  'warn.severity.extreme': 'Extreme',
  'warn.disclaimer':
    'Official federal warnings for your district. Does not replace official channels, sirens, or on-site instructions.',
```

- [ ] **Step 4: Netzwerk-Abruf und Panel**

Neue Datei `src/features/civil-warnings.ts`:

```ts
/**
 * Fähigkeit `civil-warnings` — amtliche Zivilschutz-Warnungen des Bundes
 * für den eigenen Landkreis (Spec §5, §10, §38.1).
 *
 * BBK-Dashboard-API, kein Schlüssel nötig, aggregiert bereits alle Quellen
 * (MOWAS/KATWARN/DWD/BIWAPP/Polizei) pro Kreis. Ohne Netz/Timeout: leere
 * Liste, kein Fehlertext — konsistent mit weather.ts (§10).
 */

import type { GeoLocation } from '../core/astro-engine';
import { arsFromAgs, nearestKreis, severityColor, type CivilWarning } from '../core/civil-warnings';
import { icon } from '../icons';
import type { Lang, Translator } from '../i18n';

const WARN_API = 'https://warnung.bund.de/api31/dashboard';

/** Aktive Warnungen für den Kreis am Standort. `type: 'Cancel'` (Entwarnung) wird herausgefiltert. */
export async function fetchCivilWarnings(loc: GeoLocation): Promise<CivilWarning[]> {
  const kreis = nearestKreis(loc);
  if (!kreis) return [];
  const ars = arsFromAgs(kreis.ags);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${WARN_API}/${ars}.json`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as CivilWarning[];
    return data.filter((w) => w.type !== 'Cancel');
  } catch {
    return [];
  }
}

export function openCivilWarnings(
  warnings: CivilWarning[],
  kreisName: string | null,
  lang: Lang,
  t: Translator,
): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'onboard__card outdoor'; // reicht: gleiche Breite/Ausrichtung wie das Outdoor-Panel
  const items = warnings
    .map((w) => {
      const title = w.i18nTitle[lang] ?? w.i18nTitle.de ?? w.id;
      return `
      <p class="warn__item">
        <span class="warn__ic" aria-hidden="true">${icon('triangle-alert')}</span>
        <span class="warn__body">
          <span class="warn__sev" style="background:${severityColor(w.severity)}">${t(`warn.severity.${w.severity.toLowerCase()}`)}</span>
          <span class="warn__title">${title}</span>
        </span>
      </p>`;
    })
    .join('');
  card.innerHTML = `
    <h2 class="onboard__title">${t('warn.title')}</h2>
    ${warnings.length ? items : `<p class="chrono__intro">${t('warn.empty', { kreis: kreisName ?? '' })}</p>`}
    <p class="solar__note">${t('warn.disclaimer')}</p>
    <div class="onboard__actions">
      <button class="btn btn--primary" id="warn-close">${t('warn.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  (card.querySelector('#warn-close') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
```

- [ ] **Step 5: Badge-Markup in `main.ts`**

Die Topbar-Zeile (Zeile 220–223)

```html
      <div class="topbar__actions">
        <button class="iconbtn iconbtn--side" id="drawer-side" aria-label="Menüseite wechseln">${icon('panel-left')}</button>
        <button class="iconbtn" id="burger" aria-label="Menü" aria-haspopup="dialog" aria-expanded="false">${icon('menu')}</button>
      </div>
```

ersetzen durch (neuer Badge-Button vor dem Seiten-Toggle, per Default
`hidden`):

```html
      <div class="topbar__actions">
        <button class="iconbtn iconbtn--warn" id="warn-badge" aria-label="Warnungen" hidden>${icon('triangle-alert')}</button>
        <button class="iconbtn iconbtn--side" id="drawer-side" aria-label="Menüseite wechseln">${icon('panel-left')}</button>
        <button class="iconbtn" id="burger" aria-label="Menü" aria-haspopup="dialog" aria-expanded="false">${icon('menu')}</button>
      </div>
```

- [ ] **Step 6: Import und State in `main.ts`**

Die Import-Zeile für Wetter (Zeile 44) um eine weitere ergänzen:

```ts
import { fetchCivilWarnings, openCivilWarnings } from './features/civil-warnings';
import { nearestKreis, type CivilWarning } from './core/civil-warnings';
```

Direkt nach `let weather: WeatherNow | null = null;` (Zeile 91) einfügen:

```ts
let civilWarnings: CivilWarning[] = [];
```

- [ ] **Step 7: Badge-Rendering und Refresh**

Direkt nach der Funktion `refreshWeather()` (endet Zeile 563) einfügen:

```ts
function renderWarnBadge(): void {
  const btn = $('#warn-badge');
  btn.hidden = civilWarnings.length === 0;
  btn.setAttribute('aria-label', t('warn.badge', { n: civilWarnings.length }));
}

async function refreshCivilWarnings(): Promise<void> {
  civilWarnings = await fetchCivilWarnings(location);
  renderWarnBadge();
}
```

- [ ] **Step 8: In `applyStaticI18n()`, `setLocation()`, `boot()` und `MODULES` verdrahten**

In `applyStaticI18n()` (Zeile 331–343), nach der Zeile mit `#drawer-side`
ergänzen — wichtig für Sprachwechsel, da `renderWarnBadge()` das
aria-label neu übersetzt, ohne neu abzurufen:

```ts
  $('#drawer-side').setAttribute('aria-label', t('menu.side'));
  renderWarnBadge();
```

In `setLocation()` (Zeile 628–635), nach `void refreshWeather();`
ergänzen:

```ts
  void refreshWeather(); // §28: Wetter am neuen Ort neu holen
  void refreshCivilWarnings(); // Warnungen sind kreisgebunden, am neuen Ort neu holen
```

In `boot()` (Zeile 788–811), nach `void refreshWeather();` (Zeile 795)
und nach dem Wetter-Intervall (Zeile 806) ergänzen:

```ts
  void refreshWeather();
  void refreshCivilWarnings();
  // ...
  window.setInterval(() => void refreshWeather(), 15 * 60_000);
  window.setInterval(() => void refreshCivilWarnings(), 15 * 60_000);
```

In `MODULES` (Zeile 192–206), als neuer Eintrag (Reihenfolge beliebig,
ans Ende anhängen):

```ts
  { key: 'warn', labelKey: 'warn.button', icon: 'triangle-alert', color: '#C94F3D', open: () => openCivilWarnings(civilWarnings, nearestKreis(location)?.name ?? null, lang, t) },
```

- [ ] **Step 9: Klick-Handler für den Badge**

In `wireEvents()`, direkt nach der Zeile `$('#drawer-side').addEventListener('click', toggleDrawerSide);` ergänzen:

```ts
  $('#warn-badge').addEventListener('click', () =>
    openCivilWarnings(civilWarnings, nearestKreis(location)?.name ?? null, lang, t),
  );
```

- [ ] **Step 10: CSS ergänzen**

In `src/styles.css` direkt nach dem Block

```css
.iconbtn--side {
  display: none;
}
```

(Zeile 163–166, aus Task 2 der Himmel-Layout-Änderung) einfügen:

```css
/* Badge für aktive Zivilschutz-Warnungen — sticht bewusst farblich hervor. */
.iconbtn--warn {
  color: var(--accent);
}
```

Und direkt nach dem Block `.weather__sub { color: var(--text-dim); }`
(Zeile 485–487) einfügen:

```css
/* Zivilschutz-Warnungen (§5, §10, §38.1) */
.warn__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  line-height: 1.4;
  margin: 0 0 12px;
  text-align: left;
}

.warn__ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: 18px;
  color: var(--text-dim);
  margin-top: 2px;
}

.warn__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warn__sev {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
}

.warn__title {
  color: var(--text);
}
```

- [ ] **Step 11: Typprüfung**

Run: `npm run typecheck`
Expected: keine Ausgabe, Exit-Code 0.

- [ ] **Step 12: Sichtprüfung im Browser**

Run: `npm run dev`, Seite öffnen.
Expected:
- Ohne aktive Warnung: kein Badge sichtbar, Menü-Eintrag „Warnungen" öffnet
  das Panel mit „Keine aktiven Warnungen für {Kreisname}" + Disclaimer.
- Um eine aktive Warnung zu simulieren: in den DevTools kurz
  `fetch('https://warnung.bund.de/api31/dashboard/064120000000.json')`
  gegen einen Kreis mit bekannter Warnung testen (z. B. per
  `https://warnung.bund.de/api31/mowas/mapData.json` einen aktuellen
  Eintrag suchen und dessen Gebiet nachschlagen), oder `fetchCivilWarnings`
  temporär einen festen Testwert zurückgeben lassen. Badge erscheint,
  Panel zeigt Titel + Schweregrad-Farbe + Disclaimer.
- Sprachwechsel: Badge-aria-label und Panel-Texte wechseln mit, kein
  roher Schlüssel sichtbar.

- [ ] **Step 13: Commit (nur auf ausdrückliche Freigabe des Nutzers)**

```bash
git add src/features/civil-warnings.ts src/main.ts src/i18n/index.ts src/icons.ts src/styles.css
git commit -m "feat(warn): Zivilschutz-Warnungen im Panel und als Topbar-Badge"
```

---

### Task 3: Push-Integration (bestehendes Erinnerungen-Opt-in erweitern)

**Files:**
- Modify: `src/core/reminders.ts` (`ReminderCategory`, `SOURCES`)
- Modify: `src/features/reminders.ts` (`ACTIVE`, `currentMeta()`)
- Modify: `src/features/push.ts` (`PushMeta.ars`)
- Modify: `api/_shared.ts` (`StoredSubscription.ars`)
- Modify: `api/subscribe.ts` (`CATS`, `ars` speichern)
- Modify: `api/cron.ts` (neuer Zweig für `civil-warning`)

**Interfaces:**
- Consumes: `nearestKreis`, `arsFromAgs` aus Task 1, `CivilWarning` aus
  Task 1.
- Produces: `StoredSubscription.ars?: string` — sonst keine neuen
  öffentlichen Schnittstellen, dieser Task ist der letzte.

**Wichtiger Hinweis zur Typkonsistenz:** `SOURCES` in `core/reminders.ts`
ist als `Record<ReminderCategory, ...>` typisiert — jede neue Kategorie
*muss* dort einen Eintrag bekommen, sonst schlägt `tsc` fehl. Die neue
Kategorie bekommt bewusst eine No-op-Quelle (`() => []`), weil
Zivilschutz-Warnungen nicht über `collectReminders()` laufen (siehe
Architecture oben) — die eigentliche Push-Logik steckt unten in Schritt 5
(`api/cron.ts`).

- [ ] **Step 1: `ReminderCategory` erweitern**

In `src/core/reminders.ts` die Zeile

```ts
export type ReminderCategory = 'comfort' | 'outdoor';
```

ersetzen durch:

```ts
export type ReminderCategory = 'comfort' | 'outdoor' | 'civil-warning';
```

Und den Block

```ts
const SOURCES: Record<ReminderCategory, (now: Date, loc: GeoLocation) => ReminderEvent[]> = {
  comfort: comfortReminders,
  outdoor: outdoorReminders,
};
```

ersetzen durch:

```ts
const SOURCES: Record<ReminderCategory, (now: Date, loc: GeoLocation) => ReminderEvent[]> = {
  comfort: comfortReminders,
  outdoor: outdoorReminders,
  // Braucht echtes Netzwerk (BBK-API) — läuft nicht über diese rein lokale
  // Pipeline, sondern über einen eigenen Zweig in api/cron.ts.
  'civil-warning': () => [],
};
```

- [ ] **Step 2: `PushMeta` und `StoredSubscription` um `ars` erweitern**

In `src/features/push.ts` das Interface

```ts
export interface PushMeta {
  lat: number;
  lon: number;
  tz?: string;
  lang: 'de' | 'en';
  categories: string[];
}
```

ersetzen durch:

```ts
export interface PushMeta {
  lat: number;
  lon: number;
  tz?: string;
  lang: 'de' | 'en';
  categories: string[];
  /** Kreis-ARS (12-stellig) für Zivilschutz-Warnungen — client-seitig berechnet (§38.1). */
  ars?: string;
}
```

In `api/_shared.ts` das Interface

```ts
export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  lat: number;
  lon: number;
  tz?: string;
  lang: 'de' | 'en';
  categories: ReminderCategory[];
  createdAt: number;
}
```

ersetzen durch:

```ts
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
```

- [ ] **Step 3: `currentMeta()` in `features/reminders.ts` berechnet den ARS**

Die Import-Zeile (Zeile 16)

```ts
import { collectReminders, dayKey, type ReminderCategory } from '../core/reminders';
```

um eine weitere ergänzen:

```ts
import { collectReminders, dayKey, type ReminderCategory } from '../core/reminders';
import { arsFromAgs, nearestKreis } from '../core/civil-warnings';
```

Die Zeile

```ts
const ACTIVE: ReminderCategory[] = ['comfort'];
```

ersetzen durch:

```ts
const ACTIVE: ReminderCategory[] = ['comfort', 'civil-warning'];
```

Die Funktion `currentMeta()` (Zeile 88–97)

```ts
function currentMeta(): PushMeta {
  const loc = deps!.getLocation();
  let tz: string | undefined;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    tz = undefined;
  }
  return { lat: loc.latitude, lon: loc.longitude, tz, lang: deps!.getLang(), categories: ACTIVE };
}
```

ersetzen durch:

```ts
function currentMeta(): PushMeta {
  const loc = deps!.getLocation();
  let tz: string | undefined;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    tz = undefined;
  }
  const kreis = nearestKreis(loc);
  return {
    lat: loc.latitude,
    lon: loc.longitude,
    tz,
    lang: deps!.getLang(),
    categories: ACTIVE,
    ars: kreis ? arsFromAgs(kreis.ags) : undefined,
  };
}
```

- [ ] **Step 4: `api/subscribe.ts` — Kategorie zulassen, `ars` speichern**

Die Zeile

```ts
const CATS: ReminderCategory[] = ['comfort', 'outdoor'];
```

ersetzen durch:

```ts
const CATS: ReminderCategory[] = ['comfort', 'outdoor', 'civil-warning'];
```

Den `record`-Aufbau

```ts
  const record: StoredSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    lat: body.lat,
    lon: body.lon,
    tz: typeof body.tz === 'string' ? body.tz : undefined,
    lang: body.lang === 'en' ? 'en' : 'de',
    categories: categories.length ? categories : ['comfort'],
    createdAt: Date.now(),
  };
```

ersetzen durch:

```ts
  const record: StoredSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    lat: body.lat,
    lon: body.lon,
    tz: typeof body.tz === 'string' ? body.tz : undefined,
    lang: body.lang === 'en' ? 'en' : 'de',
    categories: categories.length ? categories : ['comfort'],
    ars: typeof body.ars === 'string' ? body.ars : undefined,
    createdAt: Date.now(),
  };
```

- [ ] **Step 5: `api/cron.ts` — eigener Zweig für Zivilschutz-Warnungen**

Die Import-Zeile

```ts
import { collectReminders } from '../src/core/reminders.js';
```

um eine weitere ergänzen:

```ts
import { collectReminders } from '../src/core/reminders.js';
import type { CivilWarning } from '../src/core/civil-warnings.js';
```

Direkt vor `export default async function handler(...)` einfügen (pro
Cron-Durchlauf ein gemeinsamer Cache, damit derselbe Kreis nicht mehrfach
abgefragt wird, wenn mehrere Abos denselben `ars` haben):

```ts
const warningsCache = new Map<string, Promise<CivilWarning[]>>();

async function fetchWarningsForArs(ars: string): Promise<CivilWarning[]> {
  try {
    const res = await fetch(`https://warnung.bund.de/api31/dashboard/${ars}.json`);
    if (!res.ok) return [];
    const data = (await res.json()) as CivilWarning[];
    return data.filter((w) => w.type !== 'Cancel');
  } catch {
    return [];
  }
}

function warningsForArs(ars: string): Promise<CivilWarning[]> {
  let p = warningsCache.get(ars);
  if (!p) {
    p = fetchWarningsForArs(ars);
    warningsCache.set(ars, p);
  }
  return p;
}
```

In der `for (const hash of hashes)`-Schleife, direkt **nach** der
bestehenden `for (const e of events) { ... }`-Schleife (die die
comfort/outdoor-Ereignisse zustellt) und noch **innerhalb** der äusseren
Schleife einfügen:

```ts
    if (sub.categories.includes('civil-warning') && sub.ars) {
      const warnings = await warningsForArs(sub.ars);
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
```

- [ ] **Step 6: Volle Testsuite und Typprüfung**

Run: `npm run test && npm run build`
Expected: alle Tests PASS (inklusive der 4 neuen aus Task 1), `tsc` und
`vite build` ohne Fehler — insbesondere kein Typfehler an den Stellen, wo
`ReminderCategory` jetzt drei statt zwei Werte hat (`SOURCES`,
`CATS`-Filter).

- [ ] **Step 7: Manuelle Prüfung**

Run: `npm run dev`, Menü → Erinnerungen aktivieren (Push-Berechtigung
erteilen, falls gefragt). In den DevTools → Network → `/api/subscribe`
prüfen, dass der Request-Body `categories: ['comfort', 'civil-warning']`
und ein `ars`-Feld (12 Ziffern) enthält.

Für den Cron-Zweig ohne echten Vercel-Cron-Lauf: lokal
`node --loader tsx api/cron.ts` ist wegen der Vercel-Handler-Signatur
nicht direkt ausführbar — stattdessen den Code-Pfad durch Lesen
verifizieren (Typprüfung deckt Signaturen ab) und bei Gelegenheit nach dem
Deploy einmal `GET /api/cron?key=...` manuell aufrufen, um `sent`/`checked`
im JSON-Response zu prüfen.

- [ ] **Step 8: Commit (nur auf ausdrückliche Freigabe des Nutzers)**

```bash
git add src/core/reminders.ts src/features/reminders.ts src/features/push.ts api/_shared.ts api/subscribe.ts api/cron.ts
git commit -m "feat(push): Zivilschutz-Warnungen als Push-Kategorie"
```

---

## Abschliessende Verifikation (nach allen Tasks)

- [ ] `npm run test` — alle Tests grün, inklusive der neuen
  `nearestKreis`/`arsFromAgs`/`severityColor`-Tests.
- [ ] `npm run build` — `tsc --noEmit` und Vite-Build ohne Fehler.
- [ ] `npm run dev`, Durchgang in beiden Sprachen: Badge-Verhalten (aus,
  wenn keine Warnung), Panel-Leerzustand, Menü-Eintrag „Warnungen".
- [ ] Sichtprüfung der Texte gegen SPEC §5.2: keine Handlungsanweisung in
  Befehlsform, keine Dramatisierung, Disclaimer vorhanden und korrekt.
- [ ] Kontrolle, dass `src/data/kreise.ts` und `scripts/build-kreise.mjs`
  jetzt tatsächlich referenziert werden (`git status` zeigt sie nicht mehr
  als unversioniert-und-ungenutzt).
