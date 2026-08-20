# Design: Zivilschutz-Warnungen (BBK/NINA)

Datum: 2026-08-20
Status: zur Umsetzung freigegeben (im Chat besprochen und bestätigt)
Bezug: docs/SPEC.md §5 (Regulatorik), §10 (nie leere Ansicht), §38.1 (rein lokal, kein Backend)

## Ausgangslage

Vorarbeit existierte bereits unversioniert im Repo: `scripts/build-kreise.mjs`
erzeugt `src/data/kreise.ts` — eine kompakte Liste aller 402 deutschen
Landkreise/kreisfreien Städte mit AGS (amtlicher Gemeindeschlüssel),
Name und flächengewichtetem Mittelpunkt, im selben Zeilenformat wie
`data/cities.ts`. Bislang docken keine Funktionen oder UI daran an — das
ist Gegenstand dieses Designs.

Ziel: aktive amtliche Zivilschutz-Warnungen für den Landkreis des Nutzers
anzeigen, mit optionaler Push-Benachrichtigung bei neuen Warnungen.

**API-Realitätscheck (live getestet, 2026-08-20):** Der Bund betreibt unter
`warnung.bund.de/api31/dashboard/{ars}.json` einen Endpunkt ohne
Schlüsselpflicht, der bei aktiven Warnungen für den übergebenen 12-stelligen
ARS (Amtlicher Regionalschlüssel) ein JSON-Array liefert. Format bestätigt:
`{ id, version, startDate, severity: 'Minor'|'Moderate'|'Severe'|'Extreme',
urgency, type: 'Alert'|'Update'|'Cancel', i18nTitle: { de, en, ... } }`.
Der 5-stellige Kreis-AGS aus `kreise.ts` wird für den Aufruf mit sieben
Nullen auf 12 Stellen aufgefüllt (`06412` → `064120000000`, live geprüft:
funktioniert; `06412` direkt liefert HTTP 400).

## 1. Daten & Anzeige (Client, ohne Push)

**Neu: `src/core/civil-warnings.ts`** — reine, testbare Funktionen:

- `nearestKreis(loc: GeoLocation)`: analog zu `nearestCity()` in
  `core/location.ts` (Haversine-Distanz, 1°-Breiten-Vorfilter, `kreise.ts`
  als Datenquelle statt `cities.ts`).
- `arsFromAgs(ags: string): string`: 5-stelliger Kreis-AGS → 12-stelliger
  ARS (sieben Nullen anhängen).
- Typ `CivilWarning { id: string; version: number; severity: Severity;
  urgency: string; type: 'Alert' | 'Update' | 'Cancel'; title: string;
  startDate: string }` — `title` wird beim Parsen bereits aus
  `i18nTitle[lang] ?? i18nTitle.de` gezogen (kein eigenes Übersetzen nötig,
  der Bund liefert de/en direkt mit).
- Severity → Icon/Farbe-Mapping als reine Funktion (`warningColor(severity)`
  o. ä.), analog zum bestehenden `PLANET_COLOR`-Muster in `dial.ts`.

**Neu: `src/features/civil-warnings.ts`** — Netzwerk, analog zu `weather.ts`:

- `fetchCivilWarnings(loc: GeoLocation, lang: Lang): Promise<CivilWarning[]>`:
  `nearestKreis` → `arsFromAgs` → `GET .../api31/dashboard/{ars}.json`,
  8s-Timeout (`AbortController`, wie bei `fetchWeather`/`fetchPressureTrend`),
  Objekte mit `type: 'Cancel'` herausfiltern (das ist die Entwarnung, keine
  aktive Warnung mehr). Bei Fehler/Timeout: `[]`, kein Fehlertext — konsistent
  mit dem „nie leere Ansicht, aber auch kein Alarmismus"-Prinzip aus §10.
- Kein eigener Kreis-Treffer (`nearestKreis` liefert `null`, z. B. weit
  außerhalb Deutschlands): ebenfalls `[]`, Feature bleibt unauffällig inaktiv.

**UI:**

- Badge im Topbar: neues Icon (`alert-triangle` o. ä.) in
  `.topbar__actions`, neben Seiten-Toggle und Burger. Nur sichtbar, wenn
  `fetchCivilWarnings()` mindestens eine aktive Warnung liefert. Tap öffnet
  das Panel.
- Neues Panel `openCivilWarnings()` (Muster wie `openOutdoor`/`openWeather`):
  Liste aller aktiven Warnungen (Titel, Schweregrad-Icon, Startzeit) +
  Disclaimer-Satz. Leerer Zustand: „Keine aktiven Warnungen für {Kreisname}"
  statt einer leeren Fläche.
- Zusätzlich ein Eintrag in `MODULES` (Menü) analog zu Rhythmus/Outdoor, der
  dasselbe Panel öffnet — findbar auch ohne aktive Warnung, das Badge macht
  bei akuter Lage zusätzlich sofort sichtbar aufmerksam.
- Foreground-Refresh alle 15 Minuten, wie `refreshWeather()` in `main.ts`.

## 2. Push-Integration (Cron/Server)

- `ReminderCategory` in `core/reminders.ts` wird um `'civil-warning'`
  erweitert. Diese Kategorie läuft **nicht** durch `SOURCES`/
  `collectReminders()` — jene sind reine, synchrone Funktionen (identisch
  auf Client und Server berechnet), Zivilschutz-Warnungen brauchen aber
  einen echten Netzwerk-Call. Stattdessen bekommt `api/cron.ts` einen
  eigenen, zusätzlichen Zweig nur für diese Kategorie.
- **Abo-Erstellung** (`src/features/reminders.ts`, `currentMeta()`):
  `ACTIVE` (aktuell `['comfort']`, ein einzelner Toggle ohne
  Checkbox-Liste) wird um `'civil-warning'` ergänzt — der bestehende
  „Erinnerungen aktivieren"-Schalter deckt damit alle Kategorien ab, keine
  neue UI nötig. `StoredSubscription` (`api/_shared.ts`) bekommt ein neues
  Feld `ars?: string`, client-seitig aus `nearestKreis()` berechnet und bei
  Abo/Refresh mitgeschickt — kein Kreise-Datensatz auf dem Server nötig.
- **In `api/cron.ts`:** Zwischen-Cache (`Map<string, CivilWarning[]>`) pro
  Cron-Durchlauf. Alle Abos mit `categories.includes('civil-warning')` und
  gesetztem `ars` werden gruppiert; pro einzigartigem `ars` **ein** Fetch
  gegen die BBK-API, danach pro Abo aus dem Cache gematcht — verhindert
  redundante Calls, wenn mehrere Nutzer im selben Kreis wohnen.
- **Entdopplung:** gleiches `sentKey(hash, eventId)`-Muster wie bei den
  bestehenden Erinnerungen, `eventId = ${warning.id}:${warning.version}` —
  ein Versions-Update (z. B. Verlängerung/Verschärfung) löst erneut eine
  Push aus, eine reine Wiederholung ohne Änderung nicht.
- Push-Text: `i18nTitle[sub.lang] ?? i18nTitle.de` der Warnung.
- **Skalierungs-Hinweis** (bewusst in Kauf genommen, passend zur
  Selbst-Hosting-Größenordnung der App, vgl. `docs/PUSH_SETUP.md`): Die
  Zahl der Fetches pro Cron-Tick wächst linear mit der Zahl unterschied-
  licher Kreise unter den Abos — für eine Handvoll bis einige hundert Abos
  unproblematisch. Bei deutlich größerem Maßstab wäre ein Umstieg auf die
  günstigeren `mapData`-Sammel-Endpunkte nötig (nicht jetzt gebaut, YAGNI).

## 3. i18n, Disclaimer, Fehlerfälle, Testing

**Neue i18n-Schlüssel** (DE/EN, Muster wie `chrono.moon.disclaimer` /
`prayer.disclaimer`):

- `warn.badge` (aria-label fürs Badge)
- `warn.title`
- `warn.empty` — „Keine aktiven Warnungen für {kreis}."
- `warn.severity.minor` / `.moderate` / `.severe` / `.extreme`
- `warn.disclaimer` — „Amtliche Warnungen des Bundes für deinen Landkreis.
  Ersetzt keine offiziellen Kanäle, Sirenen oder Anweisungen vor Ort."
  Rein deskriptiv, keine Handlungsanweisung, konsistent mit §5.2.

**Fehlerfälle:**

- Kein Netz/Timeout beim Foreground-Fetch → Badge bleibt aus, Panel zeigt
  den leeren Zustand, kein Fehlertext (gleiches Prinzip wie bei
  Wetter/Luftdruck, §10).
- Fällt der BBK-Dienst im Cron für einen `ars` aus: dieser `ars` wird für
  den Tick übersprungen (try/catch pro Fetch), keine Push-Zustellung für
  betroffene Abos, kein Abbruch des gesamten Cron-Laufs für andere Abos.

**Testing** (nur `src/core/` läuft automatisiert, Testumgebung `node`):

- `nearestKreis()` gegen 2–3 bekannte Koordinaten/Kreise (TDD, Muster wie
  `location.test.ts`, falls vorhanden, sonst neu `civil-warnings.test.ts`)
- `arsFromAgs()` — Padding-Logik
- Severity→Icon/Farbe-Mapping (reine Funktion)
- Manueller Check im Browser: Panel mit echten/leeren Daten, Badge
  erscheint/verschwindet korrekt, beide Sprachen, Menü-Eintrag zeigt
  leeren Zustand außerhalb Deutschlands

## Nicht im Umfang (bewusst ausgeklammert, YAGNI)

- Keine Historie vergangener Warnungen.
- Keine Karten-/Geometrie-Darstellung des Warngebiets.
- Keine anderen Warnquellen als die BBK-Dashboard-API (kein separates
  Polling von MOWAS/KATWARN/DWD/BIWAPP/Polizei einzeln — der Dashboard-
  Endpunkt aggregiert bereits alle Quellen pro Kreis).
- Kein eigener, getrennter Opt-in-Flow — läuft über den bestehenden
  Erinnerungen-Schalter.
- Keine serverseitige Kreise-Datenhaltung — der ARS wird client-seitig
  berechnet und nur als Zeichenkette mitgeschickt.
