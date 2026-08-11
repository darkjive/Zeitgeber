# Sun Clock — Phase-1-MVP (Web-Target)

> Die einzige Uhr, die zeigt, wie weit die soziale Zeit von der Sonnenzeit
> entfernt ist. — _12 Uhr ist fast nie Mittag._

Eigenständiger Neubau nach der technischen Spezifikation v1.1. Diese Umsetzung
ist der **Phase-1-MVP-Kern** (Spec §37) als lauffähiges Web-Target: ein
astronomisch korrektes Zifferblatt mit Sonnenzeit-Versatz — dem
Alleinstellungsmerkmal aus §2, das „bereits der halbe USP" ist.

Der Zielstack der vollen App ist React Native + Expo (§6). Dieses Paket setzt
die Achse-übergreifende **Architektur bewusst UI-frei und portabel** um, damit
die Berechnungsebene (`src/core/astro-engine.ts`) unverändert in die native App
und in den späteren Begleitdienst (`sunclock-bridge`, §34) übernommen werden
kann.

## Schnellstart

```bash
cd sunclock
npm install
npm run dev        # Entwicklungsserver
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # gebauten Build lokal ansehen
npm test           # Validierung der Astro-Engine gegen Referenzwerte
```

Node 22+. Der Produktions-Build wiegt < 30 KB JS (gzip ~10 KB) — deutlich unter
dem Ziel von 500 KB Initial-Load (§35).

## Was der MVP kann

| Spec | Umsetzung |
|---|---|
| §7 Drei-Achsen-Architektur | `core` · `providers` (Achse A) · `views` (Achse B) · `features` (Achse C), zusammengeführt über den `object-bus` |
| §6.3 UI-freie Astro-Engine | `core/astro-engine.ts` — reine Funktionen, NOAA-Sonnenalgorithmus + Schlyter-Mond, keine DOM-Abhängigkeit |
| §4 Wissenschaftliche Grundlage | Sonnenposition < 0,1°, Zeitgleichung, Refraktion; Validierung in `astro-engine.test.ts` |
| §2 / §26.1 A Sonnenzeit-Versatz | `core/time-engine.ts` — gesetzlicher vs. echter Mittag, ohne Nutzerdaten |
| §22 Zifferblatt | `views/dial.ts` — 24-h-Zeitring mit Dämmerungszonen, Sonnenhöchststand-Marker, Kompassring mit Sonne/Mond |
| §12 Theme-Engine | kontinuierliche Tag/Nacht-Interpolation nach Sonnenhöhe, echter Nachtsicht-Modus |
| §17 Provider Sonne & Mond | Core-Provider, nicht deaktivierbar |
| §18 Provider Planeten | Merkur…Neptun, Helligkeit/Elongation, optional (Layer-Toggle) |
| §19 Provider Sterne | helle benannte Fixsterne (J2000), optional |
| §24 Ansicht Himmelskarte | 2D-Allsky, auf Web die Hauptansicht (§38.2) |
| §24 Ansicht Objektliste | „Heute Nacht sichtbar", sortiert nach Höhe |
| §24 Zeitreise | jeder Zeitpunkt frei wählbar, Grundlage für „Himmel bei deiner Geburt" |
| §33 Teilen & Export | Ansicht als PNG mit Fusszeile, Web Share API + Download |
| §28 Wetter | Open-Meteo, Beobachtungseignung, Offline-Fallback |
| §14 Onboarding | vier überspringbare Bildschirme |
| §15 Lokalisierung | DE/EN, keine fest verdrahteten Strings |
| §13 Barrierefreiheit | semantische Zifferblatt-Beschreibung, Fokus, Reduce-Motion |
| §10 Fehlerzustände | Rückfall auf manuelle Ortseingabe, Kernuhr bleibt funktionsfähig |
| §25 Wandmodus | Bildschirm-Wachhalten, Abdunklung nach Sonnenstand, Einbrennschutz-Drift |
| §38.1 rein lokal | keine Backend-Komponente; Standort/Spracheinstellung nur lokal |

## Projektstruktur

```
src/
  core/
    astro-engine.ts    Ephemeriden (Sonne, Mond, Ereignisse) — reine Funktionen
    time-engine.ts     Sonnenzeit-Versatz, Zeitgleichung, Zeitzonen
    theme-engine.ts    Zonen nach Sonnenhöhe, kontinuierliche Paletten
    object-bus.ts      aggregiert aktive Provider, Fehlerisolierung pro Modul
    location.ts        GPS, manuelle Eingabe, lokale Persistenz
    types.ts           CelestialObject / ObjectProvider / SkyView (§7.2/7.3)
    planets.ts         geozentrische Planetenpositionen (Keplerelemente)
    stars.ts           heller Fixstern-Katalog (J2000) + Transformation
  providers/           Achse A — sun, moon, planets, stars
  views/               Achse B — dial, sky-map, object-list
  features/            Achse C — onboarding, wallmode, weather, share
  i18n/                DE/EN
  main.ts              App-Shell, verdrahtet die drei Achsen
```

## Bewusst noch nicht enthalten (spätere Phasen)

Gemäß Roadmap (§37) gehören in weitere Phasen: Sterne/Satelliten/Flugzeuge,
Kamera-Liveview und Himmelskarte, dynamischer Wecker (auf Web bewusst nicht,
§27.2), Chronobiologie mit Nutzereingabe (sozialer Jetlag), Teilen/Export,
Klangebene sowie die anwendungsgebundenen Module (§31/§32). Die Architektur ist
so angelegt, dass ein neuer Provider automatisch in allen Ansichten erscheint
und eine neue Ansicht automatisch alle Objekte zeigt (§7.4) — diese
Erweiterungen kommen ohne Kernumbau hinzu.

Der native Aufsatz (React Native + Expo, §6) liegt unter `native/` und teilt
sich die UI-freie Berechnungsebene mit dem Web-Target.

## Lizenz

MIT (§36).
