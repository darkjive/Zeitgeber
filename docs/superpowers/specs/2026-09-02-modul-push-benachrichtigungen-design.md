# Design: Modul-Push-Benachrichtigungen (Astronomie-Highlight, Wildwechsel, Meteorschauer, Sat-Pass)

Datum: 2026-09-02
Status: zur Umsetzung freigegeben (im Chat besprochen und bestätigt)
Bezug: docs/SPEC.md §5 (Regulatorik/Ton), §20 (Satelliten), §21 (Meteorschauer),
§31.4 (Drone), §31.5 (Wildlife); docs/superpowers/specs/2026-08-20-zivilschutz-warnungen-design.md
(Vorläufer-Muster für Netzwerk-Kategorien im Cron); docs/PUSH_SETUP.md

## Ausgangslage

Der bestehende Erinnerungs-Stack ist bereits solide: `core/reminders.ts`
definiert `ReminderCategory` und eine `SOURCES`-Map reiner Funktionen
`(now, loc) → ReminderEvent[]`, die **identisch auf Client (30s-Loop,
`features/reminders.ts`) und Server (`api/cron.ts`, alle 15 Min via
cron-job.org) laufen**. `civil-warning` ist die einzige bestehende
Netzwerk-Kategorie, mit eigenem Zweig direkt in `cron.ts` (siehe
Vorläufer-Design). Push-Kategorien werden heute hart codiert
(`ACTIVE = ['comfort', 'civil-warning']` in `features/reminders.ts`),
unabhängig von den im Menü einzeln zu-/abschaltbaren Info-Modulen
(`INFO_MODULES` in `main.ts`).

Ziel: vier neue, inhaltlich fertig recherchierte Kategorien ergänzen, dazu
ein eigenes Einstellungs-Panel, in dem jede Kategorie unabhängig von den
sichtbaren Info-Modulen an-/abgeschaltet werden kann (im Chat bewusst
gegen automatische Kopplung an Modul-Sichtbarkeit entschieden — siehe
„Nicht im Umfang").

**Kosten-Realitätscheck (recherchiert, 2026-09-02):** Vercel Hobby läuft
mit Fluid Compute (Standard) bei 300s Default/Max-Function-Duration, nicht
mehr den früher angenommenen ~10s — der Timeout-Vorbehalt im bestehenden
`cron.ts`-Kommentar ist überholt. Open-Meteo: 10.000 Requests/Tag kostenlos
(nicht-kommerziell). Upstash Redis Free Tier: 500.000 Commands/Monat. Für
die Selbst-Hosting-Größenordnung dieser App (vgl. Zivilschutz-Vorläufer)
unproblematisch — einzige nötige Anpassung: TLE-Daten (Celestrak bittet um
Zurückhaltung, <1 Req/s) werden in Redis gecacht (TTL 6h) statt bei jedem
Cron-Tick neu geholt.

## 1. Neue Kategorien & Datenmodell

`ReminderCategory` (`core/reminders.ts`) wächst um vier Werte:

- `'wildlife'` — Dämmerungsfenster (Morgen **und** Abend, Symmetrie zu
  `comfortReminders`' south/west-Muster), reine Geometrie
  (`sunTimes()`, bereits in `features/wildlife.ts` verwendet).
  `leadMin: 0` (Wildaktivität beginnt mit der Dämmerung selbst).
- `'meteor-peak'` — `showerOverview(now, loc)`, gefiltert auf
  `daysToPeak === 0 && radiantUp`. Trigger bei astronomischer Dämmerung
  des Peak-Abends.
- `'satellite-pass'` — bester (höchste Elevation) ISS/Sat-Durchgang des
  Abends über alle TLEs, `nextPass()` aus `core/satellites.ts`.
  `leadMin: 10` (Durchgänge dauern nur Minuten).
- `'astro-highlight'` — neues Modul `core/sky-highlights.ts`: kuratierte
  Liste (Venus, Jupiter, Sirius; Mars nur bei deutlich überdurchschnitt-
  licher Helligkeit) wird auf Höhe >20° während Dämmerung/Dunkelheit +
  `observationRating() === 'good'` (aus `features/weather.ts`) geprüft.
  Trigger bei `civilDusk`.

`ReminderEvent`/`SOURCES` bekommt einen optionalen Kontext-Parameter für
die zwei Kategorien, die externe Live-Daten brauchen:

```ts
export interface ReminderContext {
  weather?: WeatherNow; // für astro-highlight
  tles?: Tle[]; // für satellite-pass
}
type ReminderSource = (now: Date, loc: GeoLocation, ctx?: ReminderContext) => ReminderEvent[];
```

`comfort`, `outdoor`, `wildlife`, `meteor-peak` ignorieren `ctx` (bleiben
pure Funktionen wie heute). `astro-highlight`/`satellite-pass` liefern
`[]`, wenn ihr Teil von `ctx` fehlt — kein Crash, einfach kein Event.
`collectReminders(now, loc, cats, ctx?)`-Signatur bleibt für die
bestehenden drei Aufrufer (ohne `ctx`) unverändert.

**Wichtig:** die Scoring-Logik lebt **ausschließlich** in `core/`. Weder
Server noch Client duplizieren sie — beide bauen nur `ctx` unterschiedlich
zusammen (siehe Abschnitt 3/4) und rufen dieselbe `collectReminders()`.

## 2. Push-Kategorien vs. Info-Module

Bewusst **entkoppelt**: Push-Kategorien sind eine eigene, im
Erinnerungen-Panel gepflegte Auswahl, unabhängig davon, welche
Info-Module im Menü sichtbar geschaltet sind. Ein Nutzer kann z. B.
ISS-Durchgänge gepusht bekommen, ohne die `sat`-Karte dauerhaft
eingeblendet zu haben.

## 3. Server (`api/sources/`)

Gemeinsames Interface für die netzwerkabhängigen Kategorien:

```ts
// api/sources/types.ts
export interface Source {
  category: ReminderCategory;
  /** Einmal pro Cron-Lauf: externe Daten für alle betroffenen Abos vorladen/cachen. */
  prefetch(subs: StoredSubscription[]): Promise<void>;
  /** Pro Abo: Events aus den (bereits geladenen) Daten ableiten. */
  events(sub: StoredSubscription, now: Date): ReminderEvent[];
}
```

- **`api/sources/civil-warning.ts`** — Umzug der bestehenden BBK-Logik aus
  `cron.ts` (unique `ars` parallel prefetchen, In-Memory-Map pro
  Invocation, unverändert). Kein Bezug zu `core/reminders.ts`'s `SOURCES`
  (kein Client-Äquivalent für BBK-Daten möglich).
- **`api/sources/astro-highlight.ts`** — `prefetch()` sammelt eindeutige,
  grob gerundete (lat,lon)-Paare (~0,1° ≈ 11 km) und holt Open-Meteo
  parallel in eine In-Memory-Map (kein Redis nötig, Wetter ändert sich
  stundenweise). `events(sub, now)` baut `ctx.weather` aus der Map und
  ruft `SOURCES['astro-highlight'](now, subLoc, ctx)`.
- **`api/sources/satellite-pass.ts`** — `prefetch()` läuft einmal global:
  Redis-Cache (`cache:tles`, TTL 6h) prüfen, sonst Celestrak fetchen +
  zurückschreiben, Fallback auf `FALLBACK_TLES` bei Fehler. `events()`
  baut `ctx.tles` und ruft `SOURCES['satellite-pass'](now, subLoc, ctx)`.

`api/cron.ts` wird reiner Orchestrator: `SOURCES.map(s => s.prefetch(...))`
parallel vor der Hauptschleife (wie heute schon fürs BBK-Prefetch), pro
Abo `collectReminders()` (die vier reinen Geometrie-Kategorien) +
`Source`-Ergebnisse zusammenführen. Fällig-Check/Dedup
(`sentKey(hash, eventId)`)/Versand-Block bleibt unverändert.

## 4. Client-Parität (`features/reminders.ts`)

Astro-Highlight und Sat-Pass sollen auch im Vordergrund-Loop (30s-Takt)
funktionieren, nicht nur per Server-Push:

- **Wetter**: eigenes Polling alle 15 Min (`fetchWeather()`, wie es die
  Locbar bereits nutzt), läuft nur, wenn `'astro-highlight'` in den
  aktiven Kategorien ist.
- **TLEs**: wiederverwendet `satellites.ts`' `getTles()`; ist das
  `sat`-Info-Modul nicht aktiv (und TLEs damit nicht frisch), stößt
  `reminders.ts` selbst `refreshTles()` an, alle 6h.

Beides läuft **nur bei entsprechend aktiver Kategorie** — keine
Hintergrund-Netzwerklast für Nutzer, die diese Kategorien nicht gewählt
haben.

## 5. Einstellungs-Panel (`openReminders()`)

Aus dem einen Ein/Aus-Schalter wird eine Checkbox-Liste, gruppiert:

- *Sicherheit*: Hitzeschutz (`comfort`), Dämmerung/Wildwechsel
  (`wildlife`)
- *Himmel*: Goldene Stunde (`outdoor`), Meteorschauer-Maximum
  (`meteor-peak`), ISS-Durchgang (`satellite-pass`), Astronomie-Highlight
  (`astro-highlight`)

**Amtliche Warnungen (`civil-warning`) sind kein Checkbox-Eintrag** —
laufen automatisch mit, sobald der Haupt-Schalter „Erinnerungen" an ist,
kein Opt-out (sicherheitsrelevant, analog zum Vorläufer-Design).

Auswahl wird in `localStorage` (neuer Key `zeitgeber.reminderCategories`,
Muster wie `INFO_MODULES_KEY`) persistiert und als `categories` an
`PushMeta` gereicht (Feld existiert bereits in `push.ts`).

**Migration:** Bestandsnutzer mit aktiven Erinnerungen bekommen beim
ersten Laden `['comfort']` als Vorbelegung der neuen Checkbox-Liste
(`civil-warning` läuft ja ohnehin automatisch mit) — niemand verliert
beim Umstieg stillschweigend eine heute aktive Benachrichtigung.

## 6. i18n (DE/EN, Muster wie `remind.comfort.*`)

- `remind.wildlife.dusk` / `.dawn`
- `remind.meteor.peak` (mit Schauer-Namen-Platzhalter)
- `remind.satellite.pass` (mit Richtung/Höhe-Platzhaltern)
- `remind.astro.highlight` (mit Objekt-Namen/Richtung/Höhe-Platzhaltern)
- Panel-Gruppenüberschriften: `remind.group.safety`, `remind.group.sky`
- Kategorie-Labels: `remind.cat.comfort`, `.wildlife`, `.outdoor`,
  `.meteorPeak`, `.satellitePass`, `.astroHighlight`

## 7. Fehlerfälle

- Fehlt `ctx.weather`/`ctx.tles` (Fetch fehlgeschlagen, Timeout, Nutzer
  hat Kategorie gerade erst aktiviert und Erst-Fetch läuft noch): Quelle
  liefert `[]`, kein Fehlertext, kein Abbruch anderer Kategorien —
  gleiches Prinzip wie beim Zivilschutz-Vorläufer.
- Celestrak nicht erreichbar UND Redis-Cache leer/abgelaufen: Fallback auf
  `FALLBACK_TLES` (existiert bereits), keine Sat-Pass-Events für den Tick
  statt Absturz.

## 8. Testing

- `core/sky-highlights.ts`: neue `sky-highlights.test.ts` (Muster wie
  `meteor-showers.test.ts`) — Höhen-/Helligkeits-Schwellen, Objekt-Auswahl
  bei mehreren Kandidaten.
- `wildlifeReminders`, `meteorPeakReminders`: Ergänzung in
  `reminders.test.ts` (falls noch nicht vorhanden, neu anlegen, Muster
  wie `comfortReminders`-Tests).
- `satellitePassReminders`, `astroHighlightReminders`: Unit-Test mit
  synthetischem `ctx` (kein echter Netzwerk-Call nötig, da `ctx` injiziert
  wird — genau der Vorteil der Context-Parameter-Trennung).
- `api/sources/*.ts`: kein automatisierter Test (echte Netzwerk-Calls,
  analog zur bisherigen Nicht-Testabdeckung von `cron.ts`s BBK-Zweig);
  manueller Smoke-Test über `GET /api/cron?key=...`, Antwort-Felder
  `checked`/`sent` prüfen.
- Panel: manueller Check im Browser, beide Sprachen, Checkbox-Zustand
  übersteht Reload, Migration bestehender `ACTIVE`-Nutzer.

## Nicht im Umfang (bewusst ausgeklammert, YAGNI)

- Keine automatische Kopplung Push-Kategorie ↔ sichtbares Info-Modul
  (im Chat entschieden: separate Einstellungen).
- Keine weiteren Kategorien für `drone`/`wheel`/`sat`(-Karte
  selbst)/`solar` in dieser Runde — nur die vier explizit besprochenen.
  Folgt später demselben `Source`-Muster, falls gewünscht.
- Keine Schwellenwert-Konfiguration durch den Nutzer (Höhe, Helligkeit,
  Mondphase) — feste, im Code hinterlegte Werte, wie bei allen
  bestehenden Reminder-Kategorien.
- Kein Rate-Limiting/Quota-Monitoring für Open-Meteo/Celestrak — bei der
  Selbst-Hosting-Größenordnung nicht nötig (vgl. Kosten-Realitätscheck
  oben), YAGNI wie beim Zivilschutz-Vorläufer.
