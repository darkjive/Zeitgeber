<div align="center">

# Sun Clock

**Die einzige Uhr, die zeigt, wie weit die soziale Zeit von der Sonnenzeit entfernt ist.**

_12 Uhr ist fast nie Mittag._

Open Source (MIT) · TypeScript strict · Web (PWA) + iOS/Android · offline · ohne Backend · DE/EN

</div>

---

Sun Clock ist eine astronomisch korrekte Uhr, die nicht die Zeitzone anzeigt,
sondern den **tatsächlichen Sonnenstand an deinem Ort** — und den Abstand
dazwischen. Fast jede Uhr kennt nur deine Zeitzone, nicht deinen Ort. Sun Clock
kennt beides und zeigt als einzige **beide Seiten der Gleichung**: die soziale
Zeit und die echte Lichtumgebung.

Kein Konto, kein Server, keine Tracker. Alle Daten bleiben auf dem Gerät.

## Das Alleinstellungsmerkmal

Sun Clock verbindet zwei Größen, die sonst niemand zusammenführt:

- **Sonnenzeit-Versatz** — der Abstand zwischen gesetzlichem Mittag und
  echtem Sonnenhöchststand. Reine Physik, keine Eingabe nötig.
- **Sozialer Jetlag** — der Abstand zwischen deinem sozialen und deinem
  biologischen Rhythmus, nach dem Munich Chronotype Questionnaire (vier
  Zeitangaben genügen).

Wer einen späten Chronotyp hat *und* am Westrand einer Zeitzone lebt, erlebt
beide Effekte **additiv** — den **kombinierten Gesamtversatz**, den es sonst
nirgends gibt. Sun Clock zeigt ihn auf einem einzigen Zifferblatt.

## Funktionsumfang

**Ansichten**

| Ansicht | Beschreibung |
|---|---|
| Zifferblatt | 24-Stunden-Sonnenuhr mit kontinuierlichen Dämmerungszonen, Sonnenhöchststand-Marker, Kompassring und – bei aktivem Rhythmus – drei überlagerten Ringen (Sonne, gesetzliche Zeit, Körper-Rhythmus) |
| Himmelskarte | 2D-Allsky-Karte, Zenit in der Mitte, alle Objekte an ihrer realen Position |
| Objektliste | „Heute Nacht sichtbar", sortiert nach Höhe, mit Helligkeit und Richtung |
| Zeitreise | jeder Zeitpunkt frei wählbar – Vergangenheit wie Zukunft, „Der Himmel bei deiner Geburt" |

**Am Himmel**

Sonne und Mond (immer aktiv), Planeten (Merkur–Neptun mit Helligkeit und
Elongation) und helle benannte Fixsterne. Jeder Provider erscheint automatisch
in allen Ansichten.

**Fähigkeiten**

| Modul | Beschreibung |
|---|---|
| Chronobiologie | sozialer Jetlag, Chronotyp und kombinierter Gesamtversatz – rein lokal, rein beschreibend |
| Sonnenzeit-Versatz | gesetzlicher vs. echter Mittag, live |
| Outdoor & Survival | Restlicht-Countdown, blaue/goldene Stunde, Mondlicht-Prognose, Himmelsrichtung ohne Kompass |
| Solarertrag | Modul-Ausrichtung/Neigung, Ertragsfenster, Sommer/Winter – reine Geometrie, keine kWh |
| Fassade & Tageslicht | direkte Besonnung einer Fassade über den Tag – macht „Wohnung mit Nachmittagssonne" prüfbar |
| Garten & Verschattung | Sonnenstunden am Standort, Verschattung durch Gebäude/Baum (Höhe & Abstand) |
| Gebetszeiten | etablierte Konventionen (auswählbar, mit Quelle), reine Zeitangabe |
| Jahreskreis | Sonnenwenden, Tagundnachtgleichen und Zwischenfeste als exakter astronomischer Zeitpunkt |
| Wetter | Beobachtungseignung über Open-Meteo, mit Offline-Rückfall |
| Teilen & Export | aktuelle Ansicht als hochauflösendes PNG mit Fußzeile |
| Wandmodus | lebende Wanduhr mit Abdunklung und Einbrennschutz |

Alle optionalen Module sind **standardmäßig deaktiviert** – wer nichts
konfiguriert, sieht ein ruhiges Zifferblatt. Die Breite wird erst sichtbar, wenn
jemand danach sucht.

## Plattformen

- **Web** (`react-native-web`-frei, eigenständiges Web-Target): läuft im
  Browser, als PWA installierbar, offline-fähig.
- **Nativ** (`native/`, React Native + Expo): iOS und Android teilen sich die
  **identische, UI-freie Berechnungsebene** mit dem Web-Target – keine Kopie der
  Astronomie-Logik.

## Schnellstart

```bash
# Web
npm install
npm run dev        # Entwicklungsserver
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # gebauten Build ansehen
npm test           # Validierung der Berechnungen gegen Referenzwerte

# Nativ (iOS/Android)
cd native
npm install
npx expo start
```

Node 22+.

## Architektur

Ein schlanker Core plus Module auf **drei getrennten Achsen** – die Trennung
zwischen *was am Himmel ist* und *wie es dargestellt wird* hält alles entkoppelt:
Ein neuer Provider erscheint automatisch in allen Ansichten, eine neue Ansicht
zeigt automatisch alle Objekte.

```
src/
  core/                Ephemeriden & Ableitungen – reine, UI-freie Funktionen
    astro-engine.ts      Sonne, Mond, Ereignisse, Koordinatentransformation
    time-engine.ts       Sonnenzeit-Versatz, Zeitgleichung, Zeitzonen
    theme-engine.ts      Zonen nach Sonnenhöhe, kontinuierliche Paletten
    planets.ts           geozentrische Planetenpositionen
    stars.ts             heller Fixstern-Katalog + Transformation
    solar-geometry.ts    Einstrahlungsgeometrie für PV
    prayer-times.ts      Gebetszeiten aus Sonnenhöhe
    chronobiology.ts     sozialer Jetlag & Chronotyp (MCTQ)
    outdoor.ts           Restlicht, blaue/goldene Stunde, Mondlicht, Richtung
    wheel-of-year.ts     Sonnenwenden/Tagundnachtgleichen als exakte Zeitpunkte
    sun-hours.ts         direkte Sonnenstunden, Fassade & Verschattung
    object-bus.ts        aggregiert aktive Provider, Fehlerisolierung pro Modul
    location.ts          GPS, manuelle Eingabe, lokale Persistenz
  providers/           Achse A – sun, moon, planets, stars
  views/               Achse B – dial, sky-map, object-list
  features/            Achse C – onboarding, wallmode, weather, share, solar-yield,
                                 prayer-times, chronobiology, outdoor, wheel-of-year, about
  i18n/                DE/EN
  main.ts              App-Shell, verdrahtet die drei Achsen

native/                React-Native/Expo-Aufsatz auf derselben core-Engine
```

Die Berechnungsebene ist bewusst **frei von UI-Abhängigkeiten**, damit sie
unverändert in die native App und in einen späteren Smarthome-Begleitdienst
(`sunclock-bridge`) übernommen werden kann.

## Wissenschaftliche Grundlage

| Domäne | Methode |
|---|---|
| Sonnenposition, Auf-/Untergang, Dämmerung | NOAA-Algorithmus (VSOP87-Ableitung), Refraktion |
| Mondposition, Phase | Schlyter-Näherung inkl. Hauptperturbationen |
| Planeten | Keplersche Bahnelemente, geozentrisch |
| Fixsterne | J2000-Katalog, Transformation über Greenwich Sidereal Time |
| Chronotyp, sozialer Jetlag | Munich Chronotype Questionnaire (Roenneberg/Wittmann) |
| Zeitzonen | IANA über `Intl` |

**Keine** astrologischen, esoterischen oder Solunar-Inhalte. Wissenschaftliche
Korrektheit ist die Grundlage des Vertrauens in dieses Projekt.

Validiert über Unit-Tests gegen Referenzwerte und starke physikalische
Invarianten (u. a. Polaris-Höhe ≈ geografische Breite, maximale Elongation der
inneren Planeten, korrekte Reihenfolge der Gebetszeiten). `npm test`.

## Datenschutz

- Kein Backend, keine Konten, keine Synchronisation, keine Tracking-Bibliotheken.
- Standort und alle Eingaben werden **nur lokal** verarbeitet.
- Chronobiologie-Daten: Export als JSON und Löschung mit einem Tippen.

## Regulatorisches

Sun Clock liefert **Informationen über Licht-, Zeit- und Himmelsverhältnisse** –
niemals Diagnose, Therapie oder Rechtsauskunft. Module mit Gesundheits-,
Rechts- oder Weltanschauungsbezug bleiben beschreibend und sind standardmäßig
deaktiviert.

## Unterstützen

Sun Clock ist Open Source und wird ausschließlich über **freiwillige Spenden**
finanziert – kein Paywall, keine In-App-Käufe, keine Werbung.

- **GitHub Sponsors** — https://github.com/sponsors/darkjive
- **PayPal** — im Info-Bereich der App verlinkt

Die Spenden-Hinweise stehen dezent im Info-Bereich, nie in der Hauptoberfläche.

## Mitwirken

Beiträge sind willkommen – besonders Genauigkeits-Prüfungen der Berechnungen und
Übersetzungen. Siehe [CONTRIBUTING.md](./CONTRIBUTING.md) und den
[Verhaltenskodex](./CODE_OF_CONDUCT.md). Neue oder geänderte Berechnungen
brauchen einen Test gegen einen Referenzwert.

## Lizenz

[MIT](./LICENSE).
