# Zeitgeber — Technische Spezifikation

| | |
|---|---|
| **Version** | 1.3 |
| **Stand** | 12. August 2026 |
| **Status** | Referenz-Web-Client umgesetzt (Phase 1 vollständig, Phase 2/3 großteils); native App und Provider in Arbeit |
| **Lizenz** | MIT, Open Source |
| **Arbeitstitel** | Zeitgeber |
| **Referenz-Implementierung** | https://github.com/darkjive/zeitgeber |

> Eigenständiger Neubau. Konzeptionell inspiriert von Gordon's Sun Clock (dynamisches Zifferblatt nach Sonnenstand) und Sky Tonight (AR-Kamera-Liveview). Kein Code-Reuse, eigene Architektur, eigener Funktionsumfang.

---

## Änderungsverlauf

| Version | Änderung |
|---|---|
| 0.1 | Grundgerüst: Tech-Stack, Architektur, Design, i18n, AR-Feature |
| 0.2 | Onboarding, Wetter, Wandmodus/Widgets, Fehlerzustände, Teilen/Export |
| 0.3 | Chronobiologie, Kinder-Layer, Outdoor-Layer; regulatorische Leitplanken erstmals |
| 0.4 | Dynamischer Wecker als eigene Kernfunktion |
| 0.5 | Architektur auf Drei-Achsen-Modell umgestellt; Planeten-Provider |
| 0.6 | Chronobiologie zum Alleinstellungsmerkmal ausgebaut; Begriffstrennung Sonnenzeit-Versatz vs. sozialer Jetlag |
| 0.7 | Zielgruppenanalyse; sonnenstandsgebundene religiöse Termine |
| 0.8 | Sieben anwendungsgebundene Module (Solar, Garten, Architektur, Drohnen, Jahreskreis, UV, Wildtiere) |
| 0.9 | Smarthome-Integration als eigenständiger Begleitdienst |
| 1.0 | Vollständige Neustrukturierung in sieben Teile, durchlaufende Nummerierung, regulatorische Leitplanken konsolidiert, Meta-Kopf und Inhaltsverzeichnis ergänzt |
| 1.1 | Sechs Grundsatzentscheidungen getroffen (Abschnitt 38): rein lokale Datenhaltung ohne Backend, keine Kamera-Ansicht auf Web, Spenden über GitHub Sponsors und PayPal, rechtliche Prüfung vor Phase 2, etablierte Konventionen für Gebetszeiten, `uv-window` gestrichen |
| 1.2 | Referenz-Web-Client umgesetzt und veröffentlicht. Neues Modul `comfort` (Hitzeschutz: Lüften & Verschattung, Abschnitt 31.8). Modul-Menü als Sammelstelle der optionalen Panels (Abschnitt 11.5). Monetarisierungsmodell bestätigt (Open Source + Spenden, kein In-App-Kauf). Umsetzungsstand dokumentiert (Abschnitt 40). |
| **1.3** | **Spenden ausschließlich über PayPal (Abschnitt 38.3); GitHub Sponsors gestrichen.** |

---

## Inhalt

**Teil I — Grundlagen**
1. Ziele & Leitprinzipien
2. Alleinstellungsmerkmal
3. Zielgruppen
4. Wissenschaftliche Grundlage
5. Regulatorische Leitplanken

**Teil II — Architektur & Technik**
6. Tech-Stack
7. Modularchitektur (Drei-Achsen-System)
8. Performance
9. Plattformkompatibilität
10. Fehler- & Ausnahmezustände

**Teil III — Gestaltung**
11. UX/UI-Design
12. Theme-Engine
13. Barrierefreiheit
14. Onboarding
15. Lokalisierung
16. Klangebene

**Teil IV — Provider (Achse A)**
17. Sonne & Mond
18. Planeten
19. Sterne, Sternbilder, Deep Sky
20. Satelliten & Flugzeuge
21. Meteorschauer & Kometen

**Teil V — Ansichten (Achse B)**
22. Zifferblatt
23. Kamera-Liveview
24. Weitere Ansichten
25. Wandmodus & Widgets

**Teil VI — Fähigkeiten (Achse C)**
26. Chronobiologie
27. Dynamischer Wecker
28. Wetter
29. Outdoor & Survival
30. Kinder & Familie
31. Anwendungsgebundene Module
32. Sonnenstandsgebundene Termine
33. Teilen & Export

**Teil VII — Erweiterung & Betrieb**
34. Smarthome-Begleitdienst
35. Nicht-funktionale Anforderungen
36. Lizenz & Monetarisierung
37. Roadmap
38. Getroffene Grundsatzentscheidungen
39. Verbleibende offene Punkte
40. Umsetzungsstand (Referenz-Web-Client)

---
---

# Teil I — Grundlagen

## 1. Ziele & Leitprinzipien

| Prinzip | Bedeutung |
|---|---|
| Wissenschaftlich korrekt | Berechnungen auf Ephemeriden-Basis, nachvollziehbar, testbar |
| Performance | 60 FPS UI, Kaltstart < 2 s, Berechnungen außerhalb des UI-Threads |
| Skalierbarkeit | Modularchitektur — neue Funktionen ohne Kernumbau |
| Kompatibilität | iOS, Android, Web (Desktop und Mobil), ein Codebase |
| Barrierefreiheit | WCAG 2.2 AA als Minimalziel |
| Gestaltung | Ultra clean, ergonomisch, leicht futuristisch-japanisch ("Wabi-Tech") |
| Lokalisierung | i18n-Architektur ab Tag eins, MVP: DE/EN |
| Privatsphäre | So viel wie möglich auf dem Gerät, keine unnötige Telemetrie |

Diese Prinzipien stehen bewusst vor dem Funktionsumfang. Wo eine Funktion mit einem Prinzip kollidiert, gewinnt das Prinzip — das gilt insbesondere für wissenschaftliche Korrektheit (siehe Abschnitte 4, 31).

---

## 2. Alleinstellungsmerkmal

> **Die einzige Uhr, die zeigt, wie weit die soziale Zeit von der Sonnenzeit entfernt ist.**

Der Markt für Schlaf- und Rhythmus-Anwendungen ist besetzt (Rise, Sleep Cycle, Timeshifter, diverse Chronotyp-Tests). **Alle messen den Menschen** — über Wearables, Selbstauskunft oder Telefonnutzung. Keine davon weiß, wo die Sonne am Standort des Nutzers tatsächlich steht.

Diese Anwendung hat diese Information ohnehin, mit voller astronomischer Genauigkeit. Sie ist damit die einzige, die **beide Seiten der Gleichung** darstellen kann: den Menschen und seine tatsächliche Lichtumgebung.

Entscheidend: Das ist kein aufgesetztes Zusatzmerkmal, sondern die logische Zuspitzung dessen, was die Uhr ohnehin tut. Genau deshalb trägt es. Die technische Ausarbeitung steht in Abschnitt 26.

**Kommunikation nach außen** — trägt sich ohne Gesundheitsclaims:

- *"Deine Uhr lügt. Nicht absichtlich — sie kennt nur deine Zeitzone, nicht deinen Ort."*
- *"12 Uhr ist fast nie Mittag."*
- *"Finde heraus, wie weit deine Zeit von deiner Sonne entfernt ist."*

---

## 3. Zielgruppen

### 3.1 Segmentierungsachse

Naheliegende Gruppierungen wie "Freiberufler" oder "Selbstständige" sind untauglich — das sind Erwerbsstatus, keine Bedürfnisse. Die brauchbare Achse ist **Zeitautonomie**:

> Kann diese Person ihren Tagesbeginn tatsächlich selbst wählen?

Wer das kann, für den ist der Sonnenzeit-Versatz **handlungsrelevant**. Wer es nicht kann, für den ist er bestenfalls interessant, schlimmstenfalls frustrierend. Diese Unterscheidung muss die Produktkommunikation treffen.

### 3.2 Primärzielgruppen (hohe Zeitautonomie)

**Solo-Selbstständige und Homeoffice-Arbeitende**
- 2025 arbeiteten 24,6 % aller Erwerbstätigen in Deutschland zumindest teilweise von zu Hause. Bei Solo-Selbstständigen sind es 53,0 %, davon 78,4 % täglich oder überwiegend.
- Maximale Zeitautonomie bei gleichzeitig fehlendem externem Taktgeber (kein Pendeln, kein Bürobeginn). Genau die Gruppe, bei der der Rhythmus am ehesten wegdriftet — und die etwas dagegen tun *kann*.
- Ansprache: Orientierungspunkt, nicht Selbstoptimierung

**Forschende und Wissenschaftler**
- Höchste Homeoffice-Quote aller Berufsgruppen (rund 53 %)
- Strategisch besonders wertvoll: Sie prüfen die Berechnung. Hält sie stand, werden sie zu Multiplikatoren. Open Source (Abschnitt 36) ist für diese Gruppe ein Vertrauensargument, kein Nebenaspekt.
- Fachbezug in Chronobiologie, Meteorologie, Geografie, Astronomie
- Liefert erfahrungsgemäß die besten Beiträge im Open-Source-Betrieb

**Fotografinnen und Fotografen**
- Goldene und blaue Stunde sind täglicher Arbeitsparameter (Abschnitt 29)
- Etablierter Markt für Sonnenstands-Anwendungen in diesem Segment, entsprechend wechselbereit
- Brauchen keine Erklärung, verstehen den Nutzen in Sekunden
- Für die Spendenlogik relevant: eine Gruppe, die den Wert professionell einordnen kann

**Amateurastronomen und Himmelsbeobachter**
- Kernnutzer für die Provider Planeten, Sterne, Satelliten und die Kamera-Ansicht
- Anspruchsvoll bezüglich Genauigkeit — deckt sich mit dem Leitprinzip
- Achtung: hier ist der Markt am dichtesten besetzt. Nicht als Hauptpositionierung wählen, sondern als mitgenommenes Segment.

**Outdoor-, Survival- und Naturnutzer**
- Restlicht-Countdown, Mondlicht, Himmelsrichtung ohne Kompass (Abschnitt 29)
- Klein, aber loyal und mundpropagandastark
- Offline-Fähigkeit ist für sie Voraussetzung, kein Nebenmerkmal

### 3.3 Sekundärzielgruppen (geringe Zeitautonomie — mit Bedacht behandeln)

**Schichtarbeitende**
- Rund 14,8 % der Erwerbstätigen in Deutschland leisten Schichtarbeit (2023), Tendenz seit den 1990er Jahren deutlich steigend
- Höchste Betroffenheit von zirkadianer Fehlanpassung — bei **geringster Handlungsfreiheit**
- **Produktethische Vorgabe:** Einer Person täglich anzuzeigen, wie weit ihr Leben von ihrem Rhythmus abweicht, ohne dass sie etwas ändern kann, ist keine Hilfe, sondern eine Belastung. Für diese Gruppe bleibt die Darstellung **beschreibend statt bewertend** — kein "Defizit", keine Warnfarben, keine Verschlechterungskurve.
- Sinnvoller Nutzen: wann im Umfeld noch Tageslicht verfügbar ist, nicht wie stark abgewichen wird

**Eltern von Kindern und Jugendlichen**
- Der Chronotyp verschiebt sich in der Pubertät biologisch nach hinten — realer Konflikt mit Schulanfangszeiten
- Anschlussfähig an den Kinder-Layer (Abschnitt 30)
- Ansprache rein erklärend, niemals als Erziehungswerkzeug

### 3.4 Anwendungsgebundene Segmente

Über die genannten hinaus erschließen die Module aus Abschnitt 31 und 32 jeweils eigene Gruppen: Betreiber von Balkonkraftwerken und Photovoltaikanlagen, Gartenbesitzer, Wohnungssuchende und Planende, Drohnenpiloten, sowie Menschen mit sonnenstandsgebundener religiöser oder jahreszeitlicher Praxis. Diese sind dort beschrieben, weil sie technisch an das jeweilige Modul gebunden sind.

### 3.5 Konsequenz für die Positionierung

Die Kernbotschaft muss für **alle** Gruppen funktionieren, ohne eine davon namentlich zu adressieren. Die Aussage aus Abschnitt 2 leistet das: neugierig machend, faktisch korrekt, frei von Gesundheits- und Weltanschauungsclaims.

Die Spezialisierung passiert über optionale Module, nicht über die Startseite.

**Risiko der Breite:** Eine Anwendung, die alles kann, wirkt schnell beliebig. Gegenmittel ist die Grundregel aus Abschnitt 7.4 — alle Module sind standardmäßig deaktiviert. Die Breite existiert, wird aber erst sichtbar, wenn jemand danach sucht. Nach außen bleibt die Kommunikation auf **eine** Aussage konzentriert.

---

## 4. Wissenschaftliche Grundlage

| Domäne | Quelle/Methode |
|---|---|
| Sonnenposition, Auf-/Untergang, Dämmerungszonen | VSOP87 (via `astronomy-engine`), Refraktion nach Bennett-Formel |
| Mondposition, Mondphasen | ELP2000-82B (via `astronomy-engine`) |
| Planetenpositionen | VSOP87 |
| Sterne und Sternbilder | Hipparcos-Katalog (Subset bis Magnitude 6), Sternbildgrenzen nach IAU |
| Satelliten und ISS | TLE-Daten (Two-Line Elements) + SGP4-Propagator (`satellite.js`) |
| Flugzeuge | ADS-B-Livedaten (OpenSky Network) |
| Zeitzonen und gesetzliche Zeit | IANA-Zeitzonendatenbank (`Intl` nativ oder `luxon`) |
| Koordinatentransformation | RA/Dec → Alt/Az über Greenwich Sidereal Time |
| Chronotyp und sozialer Jetlag | Munich Chronotype Questionnaire (MCTQ), Roenneberg/Wittmann |

**Validierung:** Unit-Tests gegen NASA-JPL-Horizons-Referenzwerte für definierte Stichtage und Stichorte. Abweichungstoleranzen: unter 0,1° für Sichtbarkeitsfunktionen, strenger für die Kernuhr.

**Abgrenzung — verbindlich:**
- Keine astrologischen Inhalte. Die Anwendung zeigt astronomische Positionen, keine Deutungen.
- Keine Solunar-Theorie (Abschnitt 31).
- Keine esoterisch begründeten Funktionen, unabhängig von ihrer Beliebtheit.

Begründung: Wissenschaftliche Korrektheit ist die Grundlage des Vertrauens in dieses Projekt. Eine einzige unbelegte Funktion beschädigt die Glaubwürdigkeit aller anderen — besonders bei der Zielgruppe aus Abschnitt 3.2, die die Berechnungen prüfen wird.

---

## 5. Regulatorische Leitplanken

Diese Regeln gelten **projektweit** und binden alle Module, insbesondere Chronobiologie (26), Wecker (27), UV-Fenster (31.6) und Drohnen (31.4).

### 5.1 Grundregel

Die Anwendung liefert **Informationen über Licht-, Zeit- und Himmelsverhältnisse** — niemals Diagnose, Behandlung, Therapie, Linderungsversprechen oder Rechtsauskunft.

Die regulatorische Grenze verläuft am **Claim**, nicht an der Funktion. Ein Sonnenaufgangswecker ist unbedenklich; derselbe Wecker mit Therapieversprechen ist es nicht.

### 5.2 Gesundheitsbezug

- **Keine Krankheitsbezüge** in Produkttexten, Store-Beschreibung, UI oder Marketing. Keine Nennung von Diagnosen als Zielgruppe, auch nicht implizit.
- **Keine Empfehlungen in Befehlsform.** Statt *"Steh jetzt auf"* → *"Sonnenaufgang war vor 20 Minuten."* Die Schlussfolgerung zieht der Nutzer.
- Bei Verweis auf Forschung: Quellenangabe, deskriptiv, ohne Anwendungsempfehlung auf die Person.

| Zulässig | Unzulässig |
|---|---|
| "Der Sonnenhöchststand ist heute um 13:24. Deine Uhr zeigt 12:00." | "Das verbessert deine Konzentration." |
| "Dein sozialer Jetlag beträgt 1:45 h." | "Hilft bei Schlafstörungen." |
| "Die Sonne erreicht heute maximal 17° Höhe. UV-B-Schwelle wird nicht überschritten." | Jede Aussage zu Vitamin-D-Versorgung, Bedarf oder Aufenthaltsdauer |
| "Sonnenaufgang war vor 20 Minuten." | "Reduziere deine Symptome." |

Hintergrund: Sobald eine Zweckbestimmung zur Behandlung oder Linderung einer Krankheit vorliegt, greift potenziell die EU-Medizinprodukteverordnung (MDR).

### 5.3 Rechtsbezug

Module mit Bezug zu Vorschriften (insbesondere `drone`) zeigen **Lichtverhältnisse**, keine Rechtsauskunft. Die Rechtslage variiert nach Land und Betriebskategorie. Ein entsprechender Hinweis ist verpflichtend.

### 5.4 Weltanschauungsbezug

Module mit religiösem oder weltanschaulichem Bezug (Abschnitt 32) liefern **Zeitangaben**, keine Deutung oder Anleitung. Sie sind standardmäßig deaktiviert; die Anwendung bleibt in ihrer Grundfunktion neutral.

### 5.5 Vor Veröffentlichung

Fachliche rechtliche Durchsicht sämtlicher Store-Texte und UI-Strings. Das gehört geprüft, nicht nach Bauchgefühl entschieden.

---
---

# Teil II — Architektur & Technik

## 6. Tech-Stack

### 6.1 Rahmenwerk

**React Native + Expo, TypeScript im strict mode.**

- Ein Codebase für iOS, Android und Web (`react-native-web`); Desktop später optional über einen Wrapper
- Kotlin Multiplatform wurde geprüft: sauberer für echte Nativität, aber zwei UI-Ebenen (SwiftUI + Compose) verdoppeln den Pflegeaufwand — für Einzelentwicklung nicht wirtschaftlich. Bleibt als Option für die Berechnungsebene, falls Performance-Grenzen erreicht werden.

### 6.2 Rendering

- **`@shopify/react-native-skia`** — GPU-beschleunigtes Canvas-Rendering, plattformübergreifend identische Ausgabe
- **`react-native-reanimated` v3+** — Animationen auf dem UI-Thread
- **`react-native-gesture-handler`** — native Touch-Interaktion (Zoom, Pan in Kartenansichten)

### 6.3 Astronomie-Engine

- **`astronomy-engine`** (MIT-Lizenz) als Basis
- Optional für höhere Präzision: vorgerechnete Ephemeriden-Tabellen (JPL DE440) als kompaktes Binärformat gebündelt — vermeidet eine Laufzeit-Abhängigkeit zu Python
- Alle Berechnungen außerhalb des UI-Threads (Web Worker bzw. `react-native-worklets`, rechenintensive Teile ggf. als JSI-Modul)
- **Verbindlich: keine UI-Abhängigkeiten in der Engine.** Sie muss als eigenständiges Paket auslagerbar bleiben — Voraussetzung für den Begleitdienst (Abschnitt 34). Diese Disziplin kostet in Phase 1 nichts und spart später einen Umbau.

### 6.4 Zustand und Daten

- **Zustand** oder **Jotai** für State-Management — kein Redux-Overhead nötig
- **MMKV** (`react-native-mmkv`) für lokale Persistenz
- **TanStack Query** für externe Abfragen (Satelliten, Flugzeuge, Wetter) — Caching, Wiederholung, Offline-Verhalten eingebaut

### 6.5 Kamera und Sensorik

- **`react-native-vision-camera`** für den Liveview
- Sensorfusion aus Gyroskop, Magnetometer und GPS (`expo-sensors`, `expo-location`) zur Bestimmung der Blickrichtung
- Overlay-Rendering über Skia auf dem Kamerabild
- **Nur nativ.** Auf Web wird die Kamera-Ansicht nicht angeboten (Abschnitt 38.2); dort ist die Himmelskarte die reguläre Ansicht.

---

## 7. Modularchitektur (Drei-Achsen-System)

### 7.1 Grundgedanke

Ein **schlanker Core** plus Module auf **drei getrennten Achsen**. Entscheidend ist die Trennung zwischen *was am Himmel ist* (Provider) und *wie es dargestellt wird* (Ansichten).

**Warum drei Achsen:** Ein Objekt wie "Planeten" muss im Zifferblatt, in der Kamera-Ansicht, in einer Liste und in der Suche erscheinen. Wären Objekte und Ansichten dieselbe Modulart, müsste jedes Objekt jede Ansicht einzeln kennen — bei 10 Objekten und 5 Ansichten sind das 50 Kopplungen. Mit getrennten Achsen sind es 15 unabhängige Module.

```
/core
  /astro-engine       → Ephemeriden, Koordinatentransformation, reine Funktionen
  /time-engine        → gesetzliche Zeit vs. Sonnenzeit, Zeitzonen
  /theme-engine       → Tag/Nacht-Zustand, Farbpaletten, Übergänge
  /i18n               → Sprachpakete, Pluralregeln
  /location           → GPS, manuelle Eingabe, Reverse Geocoding
  /object-bus         → zentrale Sammelstelle, aggregiert alle aktiven Provider

/providers            → ACHSE A: was ist am Himmel (liefert Objekte, keine UI)
  /sun  /moon  /planets  /stars  /constellations
  /satellites  /aircraft  /meteor-showers  /deep-sky  /comets

/views                → ACHSE B: wie wird es dargestellt (konsumiert ALLE Provider)
  /dial  /sky-view  /sky-map  /object-list  /timeline

/capabilities         → ACHSE C: Verhalten, keine Himmelsobjekte
  /chronobiology  /alarms  /weather  /ambient-sound  /temporal-hours
  /outdoor  /kids-mode  /sharing  /solar-yield  /garden  /architecture
  /drone  /wildlife  /prayer-times  /wheel-of-year  /comfort

/registry.ts          → zentrale Registrierung aller drei Achsen
```

### 7.2 Objekt-Schnittstelle (Achse A)

Jeder Provider liefert dasselbe Format — nur so bleiben Ansichten providerunabhängig:

```ts
interface CelestialObject {
  id: string;
  providerId: string;
  nameKey: string;              // i18n-Schlüssel, kein fertiger String
  position: EquatorialCoords;   // RA/Dec — Umrechnung in Alt/Az macht der Core
  magnitude?: number;           // scheinbare Helligkeit, für Sichtbarkeitsfilter
  angularSize?: number;         // für Sonne/Mond (echter Auf-/Untergang)
  kind: 'star' | 'planet' | 'moon' | 'sun' | 'satellite' | 'aircraft' | 'dso';
  metadata?: Record<string, unknown>;  // providerspezifisch, für Detailkarte
}

interface ObjectProvider {
  id: string;
  updateInterval: number;       // ms — Sterne: sehr selten, Flugzeuge: ~10 s
  requiresNetwork: boolean;
  requiresPermissions?: Permission[];
  getObjects(ctx: { time: Date; location: GeoLocation }): CelestialObject[];
}
```

`updateInterval` pro Provider erlaubt dem Core, Berechnungen sinnvoll zu takten. Ohne dieses Feld läuft alles im schnellsten gemeinsamen Takt und verbraucht unnötig Akku.

### 7.3 Ansichts-Schnittstelle (Achse B)

```ts
interface SkyView {
  id: string;
  supportedKinds?: CelestialObject['kind'][];  // optionale Filterung
  requiresSensors?: Sensor[];                  // Capability-Detection
  Component: React.FC<{ objects: CelestialObject[] }>;
}
```

Ansichten abonnieren den `object-bus` und erhalten alle aktiven Objekte. Sie kennen keine einzelnen Provider.

### 7.4 Konsequenzen

- **Neuer Provider** → erscheint automatisch in allen Ansichten
- **Neue Ansicht** → zeigt automatisch alle Objekte
- **Fehlerisolierung pro Modul**: Ein ausgefallener Provider entfernt nur seine Objekte aus dem Bus, alle anderen laufen weiter
- **Capability-Detection**: Ansichten mit Sensoranforderung werden auf Geräten ohne entsprechende Hardware gar nicht erst registriert (Abschnitt 10)
- **Grundregel Sichtbarkeit**: Alle optionalen Module sind standardmäßig deaktiviert. Wer nichts konfiguriert, sieht ein ruhiges Zifferblatt — kein Werkzeugmenü.
- Keine Freischaltungs- oder Lizenzprüfung nötig (Open Source, Abschnitt 36) — das vereinfacht den Core spürbar

---

## 8. Performance

- Zifferblatt-Neuberechnung einmal pro Minute; Sekundenanzeige nur kosmetisch interpoliert
- Alle Ephemeriden-Berechnungen memoisiert, Neuberechnung nur bei Zeit- oder Ortsänderung
- Skia-Canvas statt verschachtelter View-Hierarchien — ein Zeichenvorgang für das gesamte Zifferblatt
- Module werden erst bei Aktivierung geladen
- Code-Splitting pro Modul für die Web-Version
- Zielwerte: Time-to-Interactive unter 2 s (mobil), 60 FPS bei Zifferblatt-Animation, unter 150 MB Arbeitsspeicher im Leerlauf

---

## 9. Plattformkompatibilität

| Plattform | Ansatz |
|---|---|
| iOS | React Native (Expo), ab iOS 15 |
| Android | React Native (Expo), ab Android 8 (API 26) |
| Web Desktop | `react-native-web`; Himmelskarte statt Kamera-Ansicht (Abschnitt 38.2) |
| Web Mobil | wie Desktop — die Kamera-Ansicht wird auf Web grundsätzlich nicht angeboten |
| Tablet-Wandmodus | eigenes Layout-Preset (Abschnitt 25) |

PWA-Fähigkeit (installierbar, offline über Service Worker) für die Web-Version einplanen — deckt sich mit der Anforderung an Offline-Fähigkeit und lokale Datenhaltung.

---

## 10. Fehler- & Ausnahmezustände

Eine sensorlastige Anwendung hat viele Fehlerpfade. Sie müssen bewusst gestaltet sein und dürfen nicht in einem leeren Bildschirm enden.

| Zustand | Verhalten |
|---|---|
| Kein GPS-Signal / Standort verweigert | Rückfall auf manuelle Ortseingabe (Suchfeld + Karte), Kernuhr bleibt voll funktionsfähig |
| Kamera-Erlaubnis verweigert | Kamera-Ansicht schaltet auf die 2D-Himmelskarte um, Hinweis mit Direktlink zu den Systemeinstellungen |
| Kompass dekalibriert | Erkennung über den Genauigkeitswert des Magnetometers, animierter Kalibrierungshinweis, Overlay bleibt sichtbar aber als ungenau markiert |
| Externe Schnittstelle nicht erreichbar oder Rate-Limit | Betroffener Layer zeigt letzten Stand mit Zeitstempel oder deaktiviert sich sauber; niemals Absturz |
| TLE-Daten älter als 7 Tage | Hinweis auf reduzierte Genauigkeit, Berechnung läuft weiter |
| Gerät ohne Gyroskop/Magnetometer | Kamera-Ansicht wird gar nicht erst angeboten (Capability-Detection, Abschnitt 7.4) |
| Gerätezeit falsch gestellt | Optionaler Abgleich (GPS-Zeit oder NTP), Hinweis bei großer Abweichung |
| Geplante Alarme vom System entfernt | Aktiver Hinweis an den Nutzer statt stillem Ausfall (Abschnitt 27) |

**Grundregel:** Kein Modulausfall darf die Kernuhr beeinträchtigen. Module scheitern isoliert.

---
---

# Teil III — Gestaltung

## 11. UX/UI-Design — "Wabi-Tech"

Leitidee: Reduktion (Ma — bewusste Leere) trifft dezente Zukunftsästhetik. Ruhige Präzision statt Cyberpunk-Überladung.

### 11.1 Designsprache
- Viel Leerraum, wenige bedeutungsvolle Elemente
- Kreisformen dominant; das Zifferblatt ist das zentrale Motiv, keine eckigen Container darum
- Feine Linien statt Schatten oder Skeuomorphismus
- Dezente Glitch- oder Scan-Akzente ausschließlich bei Zustandsübergängen, nicht dauerhaft

### 11.2 Farbsystem (Vorschlag, anpassbar)

| Rolle | Tag | Nacht |
|---|---|---|
| Hintergrund | #F7F5F0 (warmes Washi-Weiß) | #0B0D12 (Blue-Black) |
| Primärakzent | #C94F3D (gedämpftes Vermillion) | #6FE0C9 (Mint-Cyan, gedimmt) |
| Sekundär | #2B3A42 (tiefes Indigo-Grau) | #8D6FE7 (Violett, gedimmt) |
| Text | #1A1A1A | #E8E8E8 |

Der Nachtmodus folgt einem echten Nachtsicht-Gedanken: reduzierte Blauanteile, gedimmte Helligkeit, damit die Anwendung im Freien nicht blendet.

### 11.3 Typografie
- **Space Grotesk** oder **Zen Maru Gothic** für Überschriften
- **Inter** für Bedienelemente
- **JetBrains Mono** für Zahlen und Zeitangaben — erzeugt den technisch-präzisen Eindruck

### 11.4 Bewegung
- Zonenübergänge als weicher Verlauf über den Tag, nicht abrupt
- Tag/Nacht-Wechsel als langsames "Atmen", physikalisch plausibel
- Mikro-Interaktionen dezent und abschaltbar (Reduce Motion, Abschnitt 13)

### 11.5 Modul-Menü

Mit wachsender Modulzahl darf die Hauptoberfläche nicht zur Knopfleiste werden.
Ein **einzelner Eintrag** öffnet ein Raster aller optionalen Fähigkeits-Panels;
wer nichts sucht, sieht nichts davon. Das setzt die Grundregel aus Abschnitt 7.4
in der Oberfläche um: standardmäßig ein ruhiges Zifferblatt, die Breite erst auf
Nachfrage. Provider-Layer, die eine Ansicht verändern (Planeten, Sterne), bleiben
als direkte Umschalter — sie sind keine Panels.

---

## 12. Theme-Engine

- **Tag und Nacht sind nicht binär**, sondern kontinuierlich entlang der Sonnenhöhe interpoliert: Tag → Sonnenuntergang → bürgerliche → nautische → astronomische Dämmerung → Nacht
- Eigene Core-Ebene, von allen Modulen konsumierbar — Overlays passen ihre Kontrastfarbe automatisch an
- Manuelle Übersteuerung möglich (etwa dauerhafter Nachtmodus im Wandbetrieb)

**Zonendefinitionen** (Sonnenhöhe):

| Zonen | Grenzen |
|---|---|
| 2 Zonen | Tag > −0,2667° \| Nacht ≤ −0,2667° |
| 3 Zonen | Tag \| Dämmerung −0,2667…−6° \| Nacht < −6° |
| 4 Zonen | Tag \| bürgerlich −0,2667…−6° \| nautisch −6…−12° \| Nacht < −12° |
| 5 Zonen | Tag > 6° \| Sonnenuntergang 6…−0,2667° \| bürgerlich \| nautisch \| Nacht |

---

## 13. Barrierefreiheit

- WCAG 2.2 AA: Kontrastverhältnisse (auch im Nachtmodus), Fokusreihenfolge, sichtbarer Fokusindikator
- Screenreader: Beschriftungen und Rollen auf allen interaktiven Elementen, semantische Beschreibung des Zifferblatt-Zustands ("Sonne bei 45° Höhe, Südwesten, 14:32 Uhr")
- Schriftgrößenskalierung respektiert Systemeinstellungen
- Reduce-Motion-Unterstützung: deaktiviert dekorative Animationen, behält funktionale
- Farbenblind-sichere Zonendarstellung — nicht allein über Farbe, zusätzlich über Struktur
- Standorteingabe auch per Text, kein GPS-Zwang

---

## 14. Onboarding

**Kritischster Punkt für die Akzeptanz.** Das Zifferblatt funktioniert anders als jede Uhr, die Nutzer kennen. Ohne Erklärung ist die Abbruchrate beim ersten Start hoch.

- **Drei bis vier Bildschirme beim Erststart**, überspringbar, jederzeit erneut aufrufbar:
  1. "Diese Uhr zeigt die echte Sonne" — animierter Vergleich zur gewohnten Uhr
  2. "12 Uhr ist selten echter Mittag" — die Verschiebung an einem konkreten Beispiel
  3. "Dein Standort bestimmt dein Zifferblatt" — Standortabfrage im Kontext, nicht als nackter Systemdialog
  4. "Was du sehen kannst" — kurzer Überblick über die Module
- **Kontextuelle Erklärungen**: Tippen auf ein Zifferblatt-Element erklärt dessen Bedeutung — kein Handbuchzwang
- **Permission-Priming**: Vor jedem Systemdialog eine eigene Erklärung, warum die Freigabe nötig ist. Deutlich höhere Zustimmungsrate als der nackte Dialog.
- **Zuverlässigkeitshinweis Android** (Abschnitt 27): Der erklärende Ablauf zur Akku-Optimierung gehört ins Onboarding des Weckers, nicht in eine FAQ
- Alle Texte lokalisiert (DE/EN im MVP)

---

## 15. Lokalisierung

- **`i18next` + `react-i18next`**, ein Namensraum pro Modul — skaliert mit dem Modulsystem
- MVP: Deutsch, Englisch. Struktur von Beginn an mehrsprachenfähig, keine fest verdrahteten Zeichenketten.
- Pluralisierung sowie Datums- und Zahlenformate über `Intl`
- Sprachumschaltung unabhängig von der Systemsprache wählbar

---

## 16. Klangebene

- Modul `ambient-sound`, umgesetzt über `expo-av` oder `react-native-track-player`
- Klanglandschaften an Tageszeit und Sonnenstand gekoppelt, weich überblendet
- Optional an Standort und Jahreszeit koppelbar
- Vollständig deaktivierbar (Ruhemodus, Wandbetrieb ohne Ton)
- Ausschließlich lizenzfreie oder selbst produzierte Klänge

---
---

# Teil IV — Provider (Achse A)

## 17. Sonne & Mond

Core-Provider, immer aktiv, nicht deaktivierbar.

**Sonne:** Position (Azimut, Höhe), echter Sonnenhöchststand, Auf- und Untergang unter Berücksichtigung von Refraktion und scheinbarer Größe, alle Dämmerungsgrenzen, Zeitgleichung, Sonnenzeit-Versatz.

**Mond:** Position, Phase mit Beleuchtungsgrad, Auf- und Untergang, scheinbare Größe, Alter im Zyklus.

Beide bilden die Grundlage für nahezu alle Fähigkeiten aus Teil VI.

---

## 18. Planeten

Der am häufigsten unterschätzte Provider: Planeten sind mit bloßem Auge sichtbar, wandern über Wochen erkennbar und sind für Einsteiger der beste Zugang zur Himmelsbeobachtung — deutlich zugänglicher als Deep-Sky-Objekte.

**Umfang:**
- Merkur, Venus, Mars, Jupiter, Saturn (mit bloßem Auge sichtbar)
- Uranus und Neptun (nur mit Optik — trotzdem anzeigen, entsprechend markiert)

**Zusatzdaten:**
- Scheinbare Helligkeit — schwankt bei Mars und Venus erheblich
- Elongation (Winkelabstand zur Sonne) — bestimmt die Beobachtbarkeit
- Sichtbarkeitsfenster: "heute ab 21:40 im Südwesten, bis 23:15"
- Phase bei Venus und Merkur — didaktisch wertvoll, da sie Lichtphasen wie der Mond zeigen
- Rückläufige Bewegung als Hinweis

**Ereignisse** (hoher Nutzwert, geringer Aufwand):
- **Konjunktionen** — enge Begegnungen zweier Planeten oder Planet und Mond, die sichtbarsten Himmelsereignisse überhaupt
- **Oppositionen** — beste Beobachtungszeit für äußere Planeten
- Größte Elongation bei Merkur und Venus
- Benachrichtigung optional, höchstens ein Hinweis pro Ereignis

---

## 19. Sterne, Sternbilder, Deep Sky

- **Sterne**: Hipparcos-Subset bis Magnitude 6 — was mit bloßem Auge sichtbar ist
- **Sternbilder**: Verbindungslinien und Grenzen nach IAU-Definition
- **Deep Sky**: Messier-Katalog, spätere Phase, primär für die Kamera- und Kartenansicht relevant

Sterne benötigen ein sehr langes Aktualisierungsintervall — hier zahlt sich `updateInterval` aus Abschnitt 7.2 unmittelbar aus.

---

## 20. Satelliten & Flugzeuge

**Satelliten:**
- TLE-Daten periodisch nachladen (CelesTrak, kostenlos)
- SGP4-Propagation auf dem Gerät (`satellite.js`)
- ISS priorisiert, Passvorhersage für den aktuellen Standort

**Flugzeuge:**
- ADS-B-Livedaten über das OpenSky Network: Position, Höhe, Kennung
- Aktualisierung moderat (10–15 s) und nur bei aktiver Ansicht — Rate-Limits beachten
- Höchster Netzbedarf aller Provider; entsprechend als letztes priorisiert

---

## 21. Meteorschauer & Kometen

**Meteorschauer:** die acht Hauptströme mit Radiant, Aktivitätskurve und Suchbereich. Datenbasis ist statisch und klein — sehr geringer Aufwand.

**Kometen:** ereignisgetrieben, da nur bei aktuellen Erscheinungen relevant. Bahnelemente extern nachladbar.

---
---

# Teil V — Ansichten (Achse B)

## 22. Zifferblatt

Die Standardansicht und der Kern der Anwendung.

- Einzeiger-Prinzip; die Skala selbst verändert sich täglich mit der Sonnengeometrie
- Farbzonen nach Sonnenhöhe (Abschnitt 12), kontinuierlich interpoliert
- Objekte anderer Provider erscheinen als dezente Marker an ihrer Azimut-Position
- **Immer sichtbar: die gesetzliche Zeit.** Die Anwendung ersetzt keine gewohnte Uhr, sie ergänzt sie um die Sonnengeometrie.
- Drei überlagerte Ringe, wenn Chronobiologie aktiv ist (Abschnitt 26.4): Sonnenstand außen, gesetzliche Zeit in der Mitte, persönlicher Rhythmus innen

---

## 23. Kamera-Liveview

- Kamerabild als Hintergrund
- Sensorfusion bestimmt die Blickrichtung des Geräts
- Overlay zeigt Himmelsobjekte an ihrer realen Position: Sonne, Mond, Planeten, helle Sterne, Satelliten, optional Flugzeuge
- Tippen auf ein Objekt öffnet eine Infokarte
- Kalibrierungshinweis bei Kompass-Ungenauigkeit — Magnetfeldstörungen sind ein reales Alltagsproblem
- Setzt Sensorik voraus; ohne diese wird die Ansicht nicht registriert (Abschnitt 10)

---

## 24. Weitere Ansichten

**Himmelskarte (2D):** Keine Sensorik nötig. **Auf Web die reguläre Hauptansicht** (Abschnitt 38.2), nicht ein Ersatz — sie wird entsprechend eigenständig gestaltet, ohne Hinweis darauf, dass eine andere Ansicht fehle.

**Objektliste:** "Heute Nacht sichtbar" — sortierbar und filterbar nach Helligkeit, Typ und Sichtbarkeitszeitraum. Die zugänglichste Ansicht für Einsteiger.

**Zeitreise:** Vergangenheit und Zukunft frei wählbar. Grundlage für "Der Himmel bei deiner Geburt" (Abschnitt 33) und für das Verständnis von Jahresverläufen.

---

## 25. Wandmodus & Widgets

Der Wandbetrieb — ein älteres Tablet als lebende Wanduhr — ist die stärkste Alltagsanwendung und braucht eigene technische Vorkehrungen.

**Wandmodus:**
- Bildschirm wachhalten, ausschließlich in diesem Modus
- **Automatische Abdunklung** nach Sonnenstand, damit die Anzeige nachts nicht blendet
- **Einbrennschutz** für OLED-Displays durch minimale, langsame Positionsverschiebung
- Reduzierte Oberfläche: nur Zifferblatt und höchstens ein bis zwei Zusatzangaben
- Tippen blendet kurzzeitig die vollständige Oberfläche ein

**Widgets:**
- iOS über WidgetKit (Homescreen und Sperrbildschirm), erfordert einen nativen Anteil
- Android über App Widget (Glance)
- Inhalt: Miniatur-Zifferblatt, Auf- und Untergang, aktuelle Sonnenhöhe
- Sparsames Aktualisierungsintervall (15–30 min genügt fachlich)
- Voraussetzung: Die Zifferblatt-Darstellung muss headless nutzbar sein — als reine Funktion von Zustand zu Bild, nicht an den Lebenszyklus der Anwendung gekoppelt

---
---

# Teil VI — Fähigkeiten (Achse C)

## 26. Chronobiologie

Umsetzung des Alleinstellungsmerkmals aus Abschnitt 2.

### 26.1 Zwei getrennte Konzepte

Diese Größen werden in populären Darstellungen häufig verwechselt und bleiben in der Anwendung strikt getrennt:

**A) Sonnenzeit-Versatz**
- Differenz zwischen gesetzlichem Mittag und tatsächlichem Sonnenhöchststand
- Ergibt sich aus Längengrad, Zeitzonenbreite, Sommerzeit und Zeitgleichung
- **Erfordert keinerlei Nutzerdaten** — reine Berechnung
- Beispiel: Ein Ort bei 8,65° Ost erreicht unter Sommerzeit den Sonnenhöchststand erst gegen 13:25 — die Uhr geht der Sonne also fast eineinhalb Stunden voraus
- Funktioniert ohne jede Datenerhebung und gehört deshalb in den MVP

**B) Sozialer Jetlag** (nach Roenneberg/Wittmann)
- Differenz der Schlafmitte zwischen Arbeitstagen und freien Tagen
- Standardmaß MSF<sub>sc</sub>, erhoben über den Munich Chronotype Questionnaire
- **Erfordert Nutzereingabe** — kein Wearable nötig, vier Fragen genügen
- Bevölkerungsdaten deuten auf eine hohe Verbreitung hin, mit den höchsten Werten bei Abendtypen

**Die Kombination beider Werte ist neu.** Wer einen späten Chronotyp hat *und* am Westrand einer Zeitzone lebt, erlebt beide Effekte additiv — und niemand zeigt ihm das bisher.

### 26.2 Ohne Nutzereingabe verfügbar
- Sonnenzeit-Versatz direkt im Zifferblatt
- **Morgenlicht-Fenster**: Zeitraum nach Sonnenaufgang mit hoher Beleuchtungsstärke, gekoppelt an das Wetter-Modul — Bewölkung reduziert die Außenhelligkeit erheblich
- **Lichtabfall am Abend**: ab wann natürliches Licht wegfällt
- **Jahresverlauf**: wie stark sich der Sonnenaufgang über das Jahr am eigenen Ort verschiebt (in Mitteleuropa über drei Stunden)

### 26.3 Mit optionaler Nutzereingabe
- Chronotyp-Einordnung nach MCTQ-Logik
- Sozialer-Jetlag-Wert mit Verlauf über Wochen
- Persönlicher Idealbereich als Zone im Zifferblatt
- **Kombinierter Gesamtversatz** aus beiden Größen — diese Kennzahl existiert sonst nirgends

### 26.4 Visualisierung
- Alles auf **einem einzigen Zifferblatt**, keine separaten Diagrammseiten
- Drei überlagerte Ringe (Abschnitt 22)
- Der Versatz ist als Winkelabstand unmittelbar erfassbar, ohne Zahlenverständnis
- Zugleich das teilbarste Bild der Anwendung (Abschnitt 33)

### 26.5 Datenhaltung
- Alle Eingaben **ausschließlich lokal**, kein Konto, kein Server, keine Übertragung
- Keine Anbindung an Gesundheitsdaten-Schnittstellen im MVP
- Export jederzeit möglich, Löschung mit einem Tippen

### 26.6 Regulatorisch
Es gelten die Leitplanken aus Abschnitt 5 vollständig und ohne Ausnahme. Dieses Modul liegt am nächsten an der Grenze zum Gesundheitsversprechen.

---

## 27. Dynamischer Wecker

Ein an den Sonnenaufgang gekoppelter Wecker verliert seinen Wert, wenn er täglich neu gestellt werden muss. Er muss sich **dauerhaft selbst mitführen** — über Jahreszeiten, Ortswechsel und Zeitumstellung hinweg.

### 27.1 Funktionsprinzip
- Der Nutzer stellt keine Uhrzeit ein, sondern eine **Regel**: "30 Minuten vor Sonnenaufgang", "bei Sonnenaufgang", "45 Minuten danach"
- Weitere Ankerpunkte: Sonnenuntergang, Dämmerungsgrenzen, Sonnenhöchststand
- Wochentagsauswahl wie bei jedem gewöhnlichen Wecker
- **Sicherheitsgrenzen**: Früh- und Spätgrenze definierbar. In Deutschland geht die Sonne im Juni vor 05:00 auf und im Dezember nach 08:20 — ohne Grenzen wird der Wecker im Sommer unbrauchbar. Kein optionales Detail.

### 27.2 Technische Umsetzung

| Plattform | Ansatz | Fallstricke |
|---|---|---|
| iOS | `UNCalendarNotificationTrigger`; die Anwendung plant einen Vorrat konkreter Termine (Systemgrenze: 64 ausstehende lokale Benachrichtigungen) | Hintergrundaktualisierung ist nicht garantiert. Vorrat großzügig füllen (etwa 60 Tage) und bei jedem Start auffrischen. |
| Android | `AlarmManager.setExactAndAllowWhileIdle()`, ab Android 12 zusätzlich `SCHEDULE_EXACT_ALARM` | Doze-Modus und herstellerspezifische Akku-Optimierung (Xiaomi, Huawei, Samsung) entfernen Alarme aggressiv. Erklärender Ablauf zur Freistellung nötig — gehört ins Onboarding (Abschnitt 14). |
| Web/PWA | Keine zuverlässigen Hintergrundalarme möglich | Funktion auf Web **gar nicht anbieten** statt unzuverlässig. Ehrlicher Hinweis genügt. |

### 27.3 Weitere Anforderungen
- **Ortswechsel**: bei mehr als 50 km Abweichung oder Zeitzonenwechsel alle geplanten Alarme neu berechnen
- **Zeitumstellung**: Berechnung erfolgt in Sonnenzeit, Umrechnung in gesetzliche Zeit zuletzt — dadurch automatisch korrekt
- **Vorschau**: Der Nutzer muss sehen, wann der Wecker in den nächsten Tagen auslöst. Fehlende Transparenz erzeugt Misstrauen und ist der häufigste Deinstallationsgrund bei solchen Weckern.
- **Selbsttest**: Erkennt die Anwendung entfernte Alarme, weist sie aktiv darauf hin (Abschnitt 10)
- **Sanftes Wecken** (spätere Phase): Lautstärke- und Helligkeitsrampe über 5–15 Minuten statt abruptem Ton

---

## 28. Wetter

Ohne Wetterinformation ist die Beobachtungsebene praktisch nutzlos — Nutzer müssen wissen, ob heute Nacht überhaupt etwas sichtbar ist.

- **Open-Meteo** (kostenlos, kein Schlüssel nötig, kommerziell nutzbar, datenschutzfreundlich)
- Kernwerte: Bewölkungsgrad, Niederschlagswahrscheinlichkeit, Sichtweite
- Darstellung icon-basiert und ruhig, bewusst ohne Unwetter-Dramatik
- **Beobachtungseignung** als abgeleiteter Indikator aus Bewölkung, Mondphase und Dämmerungsende
- Offline: letzter bekannter Stand mit Zeitstempel, keine leere Ansicht

---

## 29. Outdoor & Survival

Überschneidet sich technisch fast vollständig mit vorhandenen Berechnungen.

- **Restlicht-Countdown**: "Noch 47 Minuten brauchbares Licht" bis zum Ende der bürgerlichen Dämmerung
- **Mondlicht-Prognose**: Phase und Höhe ergeben die nächtliche Helligkeit ohne Kunstlicht
- **Himmelsrichtung ohne Kompass**: über den Sonnenazimut bestimmbar, funktioniert auch bei gestörtem Magnetometer
- **Blaue und goldene Stunde**: exakte Fenster — erschließt zusätzlich die Fotografie-Zielgruppe
- Vollständig offline funktionsfähig; hier ist das keine Zusatzeigenschaft, sondern Voraussetzung

---

## 30. Kinder & Familie

Das Vorbild erwähnt beiläufig, dass Kinder Himmelsbewegungen intuitiv erfassen, baut aber nichts darauf auf.

- Vereinfachte Ansicht: große Formen, kräftige Konturen, minimale Zahlen
- Fragen statt Daten: "Wo ist die Sonne gerade?" / "Wie lange ist es noch hell?" / "Warum ist der Mond manchmal am Tag da?"
- Kurze altersgerechte Erklärungen beim Antippen, zwei Sätze, keine Textwände
- Optionale Beobachtungsaufgaben ("Schau heute Abend nach Westen — siehst du die Venus?") — verknüpft den Bildschirm mit dem Rausgehen, statt ihn zu ersetzen
- **Keine Gamification** mit Punkten oder Serien; widerspricht dem ruhigen Charakter und erzeugt Druck
- Kein Konto, keine Datenerhebung bei Kindern — der sauberste Weg durch DSGVO Art. 8 und COPPA ist, gar nichts zu erheben

---

## 31. Anwendungsgebundene Module

Alle folgenden Module nutzen **ausschließlich bereits vorhandene Berechnungen**. Der Aufwand liegt fast vollständig in der Darstellung. Das ist der Hebel: eine Berechnungsengine, viele Anwendungsfelder.

### 31.1 `solar-yield` — Balkonkraftwerk und Photovoltaik
- Marktgröße: rund 1,29 Mio. registrierte Balkonkraftwerke in Deutschland (Frühjahr 2026), täglicher Zubau von etwa 1.030 Anlagen; die Dunkelziffer wird fachlich deutlich höher geschätzt
- Sonnenverlauf relativ zur Modulausrichtung (Azimut und Neigung eingebbar), Ertragsfenster über den Tag, Verschattungsprognose, günstigster Zeitraum für Großverbraucher
- Jahresvergleich zwischen Sommer und Winter
- Zielgruppe technikaffin und autonomieorientiert — deckt sich mit der Projektphilosophie
- **Abgrenzung**: reine Geometrie- und Einstrahlungsberechnung, keine Ertragsangabe in kWh (abhängig von Modul, Wechselrichter, Verschmutzung, Wetter)

### 31.2 `garden` — Garten, Schrebergarten, Balkon
- Sonnenstunden pro Standort über Tag und Jahr, Verschattung durch Gebäude oder Bäume (Höhe und Abstand eingebbar)
- Sehr großes Segment in Deutschland, bislang schwach bedient
- Anschlussfähig an den Kinder-Layer (Abschnitt 30)

### 31.3 `architecture` — Immobilien, Architektur, Wohnungssuche
- "Wohnung mit Nachmittagssonne" ist heute eine unüberprüfbare Behauptung; mit Sonnenstandsberechnung wird sie prüfbar
- Sonnenverlauf für eine konkrete Fassadenausrichtung über das Jahr, Verschattungssimulation, Tageslichtdauer pro Himmelsrichtung
- Erschließt ein völlig astronomiefernes Publikum

### 31.4 `drone` — Drohnenpiloten
- EU-Betriebsregeln knüpfen an Tageslicht beziehungsweise bürgerliche Dämmerung an
- Flugfenster für heute, Countdown, Hinweis vor Ablauf
- **Gilt Abschnitt 5.3**: zeigt Lichtverhältnisse, keine Rechtsauskunft

### 31.5 `wildlife` — Dämmerungsaktivität
- Dämmerungsfenster, Mondlicht, jahreszeitliche Verschiebung
- **Bewusste Abgrenzung**: Die populäre Solunar-Theorie (Mondphasen bestimmen Tieraktivität) ist wissenschaftlich schwach belegt und wird **nicht** umgesetzt. Erhöhte Dämmerungsaktivität vieler Arten ist dagegen gut dokumentiert — nur diese wird dargestellt.
- Siehe Abschnitt 4: Ein einziges unbelegtes Merkmal beschädigt die Glaubwürdigkeit aller anderen

### 31.6 Nicht umgesetzt: `uv-window`

Ein UV-Fenster-Modul wurde erwogen und **verworfen** (Entscheidung in Abschnitt 38.6). Die Berechnung wäre trivial — UV-B erreicht die Oberfläche erst oberhalb einer bestimmten Sonnenhöhe, was in mitteleuropäischen Wintermonaten tagsüber nie eintritt. Der Nutzen rechtfertigt jedoch das regulatorische Risiko nicht: Die zulässige Formulierungsgrenze verläuft mitten durch die eigentliche Kernaussage.

Hier dokumentiert, damit die Frage nicht erneut aufgeworfen wird.

### 31.7 Priorisierung nach Reichweite pro Aufwand
1. `solar-yield` — größte deutschsprachige Zielgruppe, stark wachsend
2. `prayer-times` (Abschnitt 32) — größte internationale Zielgruppe
3. `garden` — groß, unterversorgt, niedrigschwellig
4. `architecture` — erschließt astronomiefernes Publikum
5. `comfort` — mit den heißer werdenden Sommern zunehmend relevant, deutschsprachiges Massenpublikum
6. `wheel-of-year`, `drone`, `wildlife` — klein, aber sehr geringer Aufwand

### 31.8 `comfort` — Hitzeschutz: Lüften & Verschattung

Neu in Version 1.2. Nicht Teil des ursprünglichen Entwurfs, aber die logische
Fortsetzung des Hebels aus Abschnitt 31: Die Anwendung kennt Sonnenstand und —
über das Wetter-Modul (Abschnitt 28) — die Außentemperatur ohnehin. Mit
zunehmend heißen Sommern in Mitteleuropa ist der Alltagsnutzen hoch.

- **Verschattung (Rolläden):** Zeitfenster, in dem direkte Sonne stark auf eine
  senkrechte Fassade fällt — dann verschatten, um Wärmeeintrag zu vermeiden.
  Reine Geometrie (Einfallswinkel auf die senkrechte Fläche), identisch zur
  Rechnung aus `solar-yield`/`architecture`. Standardmäßig Süd- und Westfassade.
- **Lüften:** Ohne Temperaturdaten die Geometrie-Empfehlung „am kühlsten ohne
  Sonne" (abends nach Sonnenuntergang, morgens bis kurz nach Sonnenaufgang).
  Liegen stündliche Temperaturen vor (Open-Meteo, Abschnitt 28), wird das kühlste
  zusammenhängende Fenster um das Tagesminimum bestimmt und die Tageshöchst-
  temperatur samt Zeitpunkt der größten Hitze angezeigt.
- Vollständig offline nutzbar in der Geometrie-Variante; die Temperatur-
  Verfeinerung ist optional.

**Regulatorisch (Abschnitt 5) — verbindlich:** Hitze grenzt an Gesundheit. Das
Modul bleibt strikt **komfort- und energiebezogen** („kühl halten", „Wärme
draußen halten") und macht **keine Gesundheitsaussage** — kein Bezug auf
Hitzebelastung, Kreislauf oder Schutzwirkung. Die zulässige Formulierungsgrenze
verläuft hier bewusst vor jeder gesundheitlichen Wirkung.

---

## 32. Sonnenstandsgebundene Termine

Ein Anwendungsfeld, das technisch bereits vollständig abgedeckt ist und international sehr groß ausfällt.

### 32.1 `prayer-times`
- **Islamische Gebetszeiten** sind direkt über Sonnenhöhe und Schattenlänge definiert (Fajr, Dhuhr, Asr, Maghrib, Isha). Die Berechnung ist mathematisch identisch zu dem, was die Anwendung ohnehin leistet.
- **Ramadan**: Suhur und Iftar entsprechen Sonnenaufgang und Sonnenuntergang
- **Jüdischer Schabbat und Feiertage** beginnen und enden nach Sonnenuntergang; die halachischen Zeiten (Zmanim) sind ebenfalls sonnenstandsbasiert
- Das Vorbild deckt mit Agnihotra-Zeiten bereits eine vergleichbare Nische ab

**Voraussetzungen für eine seriöse Umsetzung:**
- **Berechnungsmethode auswählbar** — es existieren mehrere anerkannte Konventionen mit unterschiedlichen Dämmerungswinkeln. Eine falsche Voreinstellung wäre ein handfester Fehler, kein Schönheitsproblem.
- Fachliche Prüfung durch jemanden aus der jeweiligen Praxis vor Veröffentlichung
- Es gilt Abschnitt 5.4: reine Zeitangabe, keine Deutung oder Anleitung

### 32.2 `wheel-of-year`
- Sonnenwenden, Tagundnachtgleichen, die vier Zwischenfeste
- Anzeige des exakten astronomischen Zeitpunkts, nicht des kalendarischen Näherungsdatums
- Zielgruppe: naturverbundene und neopagane Praxis, ebenso säkulares Interesse am Jahresrhythmus
- Folgt derselben Logik wie 32.1

---

## 33. Teilen & Export

Hoher Verbreitungswert bei geringem Aufwand.

- **Export des Zifferblatts als Bild mit einem Tippen** — Skia rendert direkt in ein Bild, kein Bildschirmfoto nötig, dadurch saubere Auflösung ohne Bedienelemente
- Der Export enthält dezent Datum, Uhrzeit, Ort und einen kurzen Projekthinweis
- **"Der Himmel bei deiner Geburt"** als eigener Anlass — Datum eingeben, den Himmel dieses Moments rendern, teilen. In Verbindung mit der Zeitreise-Ansicht (Abschnitt 24).
- Natives Teilen-Menü, keine eigene Social-Media-Anbindung
- Auf Web: Download sowie Web Share API wo verfügbar

---
---

# Teil VII — Erweiterung & Betrieb

## 34. Smarthome-Begleitdienst

### 34.1 Richtungsentscheidung: Datenquelle statt Steuerzentrale

Die naheliegende Umsetzung wäre, dass die Anwendung Geräte schaltet. Das wird **bewusst nicht verfolgt**:

- Der Markt ist besetzt (Home Assistant, ioBroker, openHAB); deren Automatisierungslogik ist jeder eingebauten Lösung überlegen
- Es widerspricht dem Gestaltungsprinzip aus Abschnitt 11 — eine ruhige Uhr würde zur Steuerzentrale
- Es erzeugt Sicherheits- und Haftungsfragen, die zum Projektumfang nicht passen

**Stattdessen wird die Uhr zur Zeit- und Lichtquelle für bestehende Systeme.** Home Assistant besitzt eine Sonnen-Integration, diese liefert jedoch nur Grunddaten. Was dort fehlt, berechnet diese Anwendung ohnehin:

- Differenzierte Dämmerungszonen
- Echter Sonnenhöchststand statt gesetzlichem Mittag
- Sonnenzeit-Versatz (Abschnitt 26.1)
- Chronobiologische Werte, sofern erfasst
- Ertragsfenster nach Modulausrichtung (Abschnitt 31.1)
- Optional Gebetszeiten und Jahreskreis-Termine

Das Projekt ergänzt bestehende Systeme, statt mit ihnen zu konkurrieren.

### 34.2 Architektur

Eine mobile Anwendung kann keine zuverlässige Datenquelle für ein Smarthome sein — sie wird vom Betriebssystem beendet, hat keine feste Adresse im Netz und läuft nicht durchgehend.

**Lösung: `zeitgeber-bridge`** — ein eigenständiger, schlanker Dienst im lokalen Netz.

- Eigenes Repository, gleiche Lizenz, unabhängig von der Anwendung nutzbar
- Zielplattform: Einplatinenrechner, NAS, beliebiger Linux-Host, Container
- Nutzt **dieselbe Berechnungslogik** — Voraussetzung ist die UI-Freiheit der Engine aus Abschnitt 6.3
- Kein Cloud-Anteil, keine Registrierung, keine Verbindung zum Telefon nötig

### 34.3 Ausgabeformate

| Format | Zweck | Zielsysteme |
|---|---|---|
| **MQTT** | Zustandswerte und Ereignisse veröffentlichen | Home Assistant, ioBroker, openHAB, Node-RED |
| **REST/JSON** | Abfrage aktueller und zukünftiger Werte | beliebig, auch eigene Skripte |
| **Home-Assistant-Integration** | native Sensoren und Ereignisse | Home Assistant (HACS-fähig) |
| **iCal-Feed** | Sonnenereignisse als Kalendereinträge | jede Kalenderanwendung |
| **Webhook** | ereignisgetriebene Auslöser | beliebig |

Beispielhafte MQTT-Topics:

```
zeitgeber/sun/elevation          → aktuelle Sonnenhöhe in Grad
zeitgeber/sun/azimuth            → aktuelles Azimut
zeitgeber/sun/zone               → day | sunset | civil | nautical | night
zeitgeber/sun/solar_noon         → echter Sonnenhöchststand (ISO 8601)
zeitgeber/sun/offset_minutes     → Sonnenzeit-Versatz zur gesetzlichen Zeit
zeitgeber/events/sunrise         → Ereignis bei Sonnenaufgang
zeitgeber/solar/yield_window     → Ertragsfenster nach Modulkonfiguration
```

Damit werden Automatisierungen möglich, die bisher aufwendig waren — Beleuchtung, die dem tatsächlichen Dämmerungsverlauf folgt, oder Verbraucher, die sich am Ertragsfenster der eigenen Anlage orientieren.

### 34.4 Lesende Anbindung an Wechselrichter

Für Abschnitt 31.1 ist der Vergleich zwischen berechnetem und tatsächlichem Ertrag aufschlussreich — er macht Verschattung, Verschmutzung und Defekte sichtbar.

- Ausschließlich **lesender** Zugriff, keine Anlagensteuerung
- Über offene lokale Schnittstellen: OpenDTU/Ahoy, Shelly, Tasmota, SMA-Modbus, Fronius Solar API
- Bevorzugt über MQTT, sofern die Anlage ohnehin ins Smarthome meldet — dann entfällt jede gerätespezifische Umsetzung
- **Keine Hersteller-Cloud-Anbindung** — widerspräche der Datenschutzhaltung und erzeugte Fremdabhängigkeiten
- Gerätespezifische Adapter gehören in den Community-Bereich; niemand kann alle Geräte selbst besitzen

### 34.5 Verbindung zum Wandmodus

Begleitdienst und Wandmodus laufen sinnvoll auf derselben Hardware: Ein Einplatinenrechner mit angeschlossenem Display zeigt die Weboberfläche im Kiosk-Modus und betreibt zugleich den Dienst fürs Heimnetz. Ein Gerät, zwei Funktionen — attraktiv für die technikaffine Zielgruppe.

### 34.6 Abgrenzung und Risiken

- **Umfangsrisiko**: erste Komponente außerhalb der Anwendung selbst; verdoppelt die Wartungsfläche (zweites Repository, eigene Veröffentlichungen, eigene Dokumentation, eigene Fehlerberichte)
- **Konsequenz**: späte Phase, ausdrücklich optional. Die Anwendung muss ohne den Dienst vollständig funktionieren, der Dienst ohne die Anwendung.
- **Keine Steuerungsfunktion** — auch nicht auf Nutzerwunsch. Diese Grenze schützt Umfang und Positionierung.
- **Sicherheit**: bindet standardmäßig nur ans lokale Netz. Eine Freigabe ins Internet wird nicht unterstützt und in der Dokumentation ausdrücklich abgeraten.

---

## 35. Nicht-funktionale Anforderungen

| Kategorie | Zielwert |
|---|---|
| Kaltstart | unter 2 s bis interaktiv |
| Bildrate | 60 FPS, kein Ruckeln bei Zonenübergängen |
| Offline-Fähigkeit | Kernuhr vollständig offline funktionsfähig |
| Datenschutz | Standort nur lokal verarbeitet, keine Tracking-Bibliotheken |
| Testabdeckung | Astro-Engine über 90 %, Referenzvalidierung gegen JPL Horizons |
| Barrierefreiheit | WCAG 2.2 AA |
| Bundle-Größe (Web) | Initial-Load unter 500 KB, Rest nachladend |
| Speicherbedarf | unter 150 MB im Leerlauf |

---

## 36. Lizenz & Monetarisierung

- **Open Source**, Lizenz MIT — permissiv, im React-Native- und Astronomie-Umfeld üblich, keine Einschränkung für Nutzer oder Beitragende
- **Monetarisierung ausschließlich über Spenden** — kein Paywall, kein In-App-Kauf, keine Werbung
- Weg: **PayPal** (Entscheidung in Abschnitt 38.3)
- Platzierung dezent im Einstellungs- oder Info-Bereich, kein Banner in der Hauptoberfläche
- Architektonische Konsequenz: keine Freischaltungs- oder Lizenzprüfung nötig (Abschnitt 7.4)
- Repository von Beginn an öffentlich; CONTRIBUTING.md und CODE_OF_CONDUCT.md einplanen, sobald die Kernstruktur steht

---

## 37. Roadmap

### Phase 1 — MVP
- Core inklusive `object-bus` und Drei-Achsen-Registry (Abschnitt 7) — muss von Anfang an stehen, nachträglicher Umbau wäre teuer
- Astro-Engine UI-frei aufgesetzt (Abschnitt 6.3) — kostet jetzt nichts, spart später den Umbau für Abschnitt 34
- Provider: Sonne, Mond
- Ansicht: Zifferblatt mit Sonnen- und Dämmerungszonen
- Tag/Nacht-Theme, Standort, DE/EN
- **Sonnenzeit-Versatz** (Abschnitt 26.1 A) — reine Berechnung ohne Nutzerdaten, bereits der halbe USP
- **Onboarding** (Abschnitt 14) — nicht verschiebbar, entscheidet über die Erstnutzer-Akzeptanz
- Barrierefreiheits-Grundgerüst
- Fehlerzustände für Standort und fehlende Sensorik
- Wandmodus-Grundfunktion

### Phase 2 — Beobachtung und Alltagsnutzen
- Provider: Planeten (höchster Nutzwert pro Aufwand, rein rechnerisch), Sterne, Satelliten
- Ansichten: Kamera-Liveview, Himmelskarte, Objektliste
- Wetter (Voraussetzung für sinnvollen Beobachtungsnutzen)
- **Wecker und Chronobiologie** — bilden gemeinsam den eigentlichen Alltagsnutzen
- Outdoor-Modul (geringer Zusatzaufwand)
- Zeitreise-Ansicht und Teilen/Export
- Klangebene, antike Stunden
- Meteorschauer

### Phase 3 — Reichweite
- Provider: Flugzeuge, Sternbilder, Deep Sky, Kometen
- `solar-yield` — größte deutschsprachige Zielgruppe, innerhalb dieser Phase zuerst
- `prayer-times` — geringer Aufwand, größte internationale Wirkung; fachliche Prüfung vorab
- `garden`, `architecture`
- Kinder-Layer
- Chronotyp-Einordnung
- Sanftes Wecken
- Widgets
- Weitere Sprachen

### Phase 4 — Ausbau
- `wheel-of-year`, `drone`, `wildlife` — jeweils sehr geringer Aufwand
- **`zeitgeber-bridge`** (Abschnitt 34) — eigenes Repository, Smarthome-Datenquelle

**Vor Veröffentlichung von Phase 2**: rechtliche Durchsicht (Abschnitt 38.4). **Vor Phase 3**: fachlicher Abgleich `prayer-times` (Abschnitt 38.5). **Vor dem ersten öffentlichen Release**: Spendenlink prüfen (Abschnitt 38.3).

---

## 38. Getroffene Grundsatzentscheidungen

Diese Punkte waren bis v1.0 offen und sind entschieden. Sie binden die weitere Umsetzung.

### 38.1 Datenhaltung: rein lokal, kein Backend

- **Kein Server, keine Konten, keine Synchronisation.** Alle Daten bleiben auf dem Gerät.
- Begründung: Die chronobiologischen Eingaben umfassen vier Fragen. Ihre Neueingabe auf einem weiteren Gerät dauert unter einer Minute — das rechtfertigt weder Serverbetrieb noch Auftragsverarbeitung noch die damit verbundene Angriffsfläche.
- Bewusst in Kauf genommener Verlust: keine Geräte-Synchronisation
- Ausgleich: Export und Import als JSON-Datei, vom Nutzer selbst kontrolliert
- Architektonische Folge: Es gibt keine Backend-Komponente im gesamten Projekt. Der Begleitdienst aus Abschnitt 34 ist davon unberührt — er läuft im lokalen Netz des Nutzers und ist kein Projekt-Backend.

### 38.2 Kamera-Ansicht auf Web: wird nicht angeboten

- Die AR-Ansicht (Abschnitt 23) ist **ausschließlich in den nativen Anwendungen** verfügbar.
- Begründung: iOS Safari verlangt für den Zugriff auf die Geräteorientierung eine explizite Freigabe aus einer Nutzergeste heraus; die Kompassgenauigkeit bleibt auch danach unzuverlässig. Eine halb funktionierende AR-Ansicht wirkt defekt und beschädigt den Qualitätseindruck.
- **Die 2D-Himmelskarte ist auf Web die vollwertige Hauptansicht**, nicht ein Notbehelf. Sie wird entsprechend gestaltet und kommuniziert.
- Kein Hinweis in der Web-Version, dass „etwas fehlt" — stattdessen eine eigenständig gute Ansicht

### 38.3 Spenden: PayPal

- **PayPal** als einziger Weg — https://paypal.me/AlainRitter, ohne Freischaltungsverfahren sofort nutzbar
- **Kein GitHub Sponsors** — erfordert eine Freischaltung samt Bankverbindung und bringt gegenüber PayPal keinen zusätzlichen Personenkreis, der nicht ohnehin spenden würde
- **Kein Ko-fi** — bringt keinen zusätzlichen Personenkreis und verwässert die Darstellung

### 38.4 Rechtliche Durchsicht: vor Phase 2

- **Nicht vor Phase 1.** Der MVP enthält keinerlei gesundheitsbezogene Aussagen — der Sonnenzeit-Versatz ist reine Physik.
- Der Prüfbedarf entsteht mit dem Chronobiologie-Modul, also **vor der Veröffentlichung von Phase 2**.
- Umfang: ein bis zwei Stunden bei einer Fachanwältin oder einem Fachanwalt für Medizin- oder IT-Recht
- Prüfgegenstand: Store-Beschreibung und sämtliche UI-Strings gegen die Leitplanken aus Abschnitt 5

### 38.5 `prayer-times`: etablierte Konventionen übernehmen

- **Keine eigene Herleitung aus Dämmerungswinkeln.** Es existieren dokumentierte Berechnungskonventionen verschiedener Institutionen mit jeweils eigenen Parametern.
- Diese werden samt Quellenangabe übernommen und sind **auswählbar**, mit sinnvoller regionaler Voreinstellung
- Prüfung vor Veröffentlichung: Abgleich der berechneten Zeiten mit einem lokalen Gebetszeitenplan. Dafür genügt eine Person aus einer Gemeinde vor Ort — es braucht kein theologisches Gutachten, sondern einen praktischen Abgleich.
- Es gilt Abschnitt 5.4: reine Zeitangabe, keine Deutung

### 38.6 `uv-window`: gestrichen

- **Das Modul wird nicht umgesetzt.**
- Begründung: Der Nutzen ist gering, die zulässige Formulierungsgrenze verläuft mitten durch die eigentliche Kernaussage, und selbst ein Sonnenschutzhinweis wäre eine gesundheitsbezogene Handlungsanweisung. Das Verhältnis von Gewinn zu Risiko für die Gesamtpositionierung stimmt nicht.
- Sollte sich die Rechtslage oder die Bewertung später ändern, ist die Berechnung trivial nachrüstbar — die Sonnenhöhe liegt ohnehin vor.

---

## 39. Verbleibende offene Punkte

| Frage | Zu klären bis |
|---|---|
| Konkrete Wahl der Klanglandschaften und deren Lizenzherkunft (Abschnitt 16) | Phase 2 |
| Finales Farbsystem — der Vorschlag in 11.2 ist am Web-Client erprobt, noch nicht am nativen Gerät | Phase 1 |
| Genauigkeitsschwelle für den Wechsel auf JPL-Ephemeriden (Abschnitt 6.3) | Phase 2, abhängig von gemessener Abweichung |
| Projektname und Domain | vor dem ersten öffentlichen Release |
| Rechtliche Durchsicht inkl. `comfort`-Strings (Abschnitt 5, 38.4) | vor Phase-2-Veröffentlichung |

---
---

# Umsetzungsstand

## 40. Umsetzungsstand (Referenz-Web-Client)

Stand Version 1.2. Die Referenz-Implementierung
(https://github.com/darkjive/zeitgeber) ist ein eigenständiges Web-Target (kein
`react-native-web`), das die **UI-freie Berechnungsebene** (Abschnitt 6.3)
umsetzt; ein nativer Aufsatz (React Native + Expo) teilt sich diese Ebene.

### 40.1 Umgesetzt

| Bereich | Stand |
|---|---|
| Drei-Achsen-Architektur, `object-bus`, Registry (7) | vollständig |
| UI-freie Astro-Engine (6.3): Sonne (NOAA), Mond (Schlyter), Koordinatentransformation | vollständig, gegen Referenzwerte getestet |
| Sonnenzeit-Versatz (2, 26.1 A) | vollständig |
| Theme-Engine, kontinuierliche Zonen (12) | vollständig |
| Provider Sonne, Mond (17); Planeten (18); helle Fixsterne (19); Deep Sky (19, Messier-Highlights) | umgesetzt |
| Provider Satelliten/ISS (20, SGP4 via satellite.js, Überflugvorhersage) | umgesetzt; braucht Live-TLEs, SGP4 unit-getestet |
| Provider Flugzeuge (20, ADS-B/OpenSky, Topozentrik) | umgesetzt; braucht Live-ADS-B, Geometrie unit-getestet |
| Ansichten: Zifferblatt (22), Himmelskarte (24/38.2), Objektliste (24), Zeitreise (24) | umgesetzt |
| Chronobiologie inkl. sozialem Jetlag & kombiniertem Gesamtversatz (26) | vollständig, dritter Ring |
| Wetter (28), Outdoor (29), Teilen/Export (33), Wandmodus-Grundfunktion (25) | umgesetzt |
| `solar-yield` (31.1), `garden` (31.2), `architecture` (31.3), `drone` (31.4), `wildlife` (31.5), `comfort` (31.8) | umgesetzt |
| `prayer-times` (32.1), `wheel-of-year` (32.2) | umgesetzt |
| Meteorschauer (21), acht Hauptströme mit Radiant-Höhe | umgesetzt |
| Kinder-Layer (30), fragengeführt, ohne Gamification/Datenerhebung | umgesetzt |
| Onboarding (14), i18n DE/EN (15), Barrierefreiheit-Grundgerüst (13), Fehlerzustände (10) | umgesetzt |
| Info-/Spenden-Bereich (36, 38.3) | umgesetzt |
| Modul-Menü (11.5) | umgesetzt |
| PWA: Manifest, Service Worker, installierbar, offline (9, 35) | umgesetzt, offline verifiziert |

### 40.2 Noch offen

- **Provider:** Kometen (21, ereignisgetrieben — nur bei aktueller Erscheinung sinnvoll, Bahnelemente nachladbar)
- **Ansichten:** Kamera-Liveview (23, nur nativ, 38.2)
- **Fähigkeiten:** dynamischer Wecker (27, bewusst nicht auf Web, 27.2), Klangebene (16), antike Stunden
- **Widgets** (25) und **Smarthome-Begleitdienst** `zeitgeber-bridge` (34)
- **Native Parität:** Panels, Karte und Onboarding im Expo-Aufsatz; Skia-Rendering (6.2)

### 40.3 Nicht-funktional (35)

Erfüllt: Offline-Kernuhr (als installierbare PWA mit Service Worker, offline
verifiziert), rein lokale Datenhaltung, kein Backend/Tracking, Bundle-Größe
deutlich unter 500 KB. Referenzvalidierung der Berechnungen über
Unit-Tests (u. a. Sonnenposition, Elongationsschranken der inneren Planeten,
Polaris-Höhe ≈ geografische Breite, Reihenfolge der Gebetszeiten,
Jahreskreis-Ekliptiklängen, SGP4-Bahnhöhe der ISS).

Barrierefreiheit: automatischer axe-core-Durchlauf (WCAG 2.0/2.1/2.2 A+AA)
über Haupt- und Panel-Ansichten in Tag- und Nachtdarstellung — **0 Verstöße**
(Kontraste, ARIA-Rollen der Tabs, Formularbeschriftungen, SVG-Alternativtexte,
Seitensprache). Eine manuelle Prüfung mit Screenreader und reiner
Tastaturbedienung sowie der JPL-Horizons-Abgleich stehen noch aus.
