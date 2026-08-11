# Änderungsverlauf

Alle nennenswerten Änderungen an Sun Clock. Format nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [SemVer](https://semver.org/lang/de/).

## [1.0.0] — 2026-08-11

Erste vollständige Ausgabe. Web-Client (installierbare, offline-fähige PWA)
plus nativer Aufsatz auf geteilter, UI-freier Berechnungsebene.

### Kern & Architektur

- Drei-Achsen-Architektur (Provider / Ansichten / Fähigkeiten) über einen
  `object-bus` mit Fehlerisolierung pro Modul (Spec §7)
- UI-freie Astronomie-Engine: Sonne (NOAA), Mond (Schlyter), Planeten
  (Keplerelemente), Fixsterne & Deep Sky (Koordinatentransformation), Satelliten
  (SGP4 via `satellite.js`), Flugzeuge (ADS-B-Topozentrik) — reine Funktionen
- Sonnenzeit-Versatz und kombinierter Gesamtversatz — das Alleinstellungsmerkmal

### Ansichten

- Zifferblatt mit kontinuierlichen Dämmerungszonen und drittem Ring
  (persönlicher Rhythmus)
- 2D-Himmelskarte (auf Web die Hauptansicht), Objektliste, Zeitreise

### Provider

- Sonne, Mond (immer aktiv); Planeten, Fixsterne, Deep Sky, Meteorschauer;
  Satelliten/ISS und Flugzeuge (live, mit Fallback und Veraltet-Erkennung)

### Fähigkeiten

- Chronobiologie (sozialer Jetlag, Chronotyp), Wetter, Outdoor & Survival,
  Teilen/Export als PNG, Wandmodus
- Anwendungsgebundene Module: Solarertrag, Fassade, Garten, Gebetszeiten,
  Jahreskreis, Wildtiere, Drohne, Kinder-Layer
- Neu gegenüber Spec: Hitze- & Lüften-Assistent (Rolläden/Lüften)

### Qualität & Betrieb

- PWA: Manifest, Service Worker, installierbar, offline verifiziert
- Barrierefreiheit: axe-core-Durchlauf (WCAG 2.0/2.1/2.2 A+AA) mit 0 Verstößen
- 68 Unit-Tests gegen Referenzwerte und physikalische Invarianten
- Lokalisierung DE/EN; rein lokale Datenhaltung, kein Backend, kein Tracking
- Bundle deutlich unter 500 KB; Open Source (MIT), Finanzierung über Spenden

### Nativer Aufsatz (React Native + Expo)

- Zifferblatt, Himmelskarte, Objektliste; Layer-Toggles; Modul-Menü mit den
  lesbaren Panels — teilt die Engine mit dem Web-Target
- Noch nicht im Simulator verifiziert; Eingabe-Panels, Onboarding, Wandmodus,
  Widgets, Wecker und Skia-Rendering stehen aus (siehe `docs/SPEC.md` §40)
