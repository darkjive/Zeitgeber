# Sun Clock — nativer Aufsatz (React Native + Expo)

Der native Ziel-Stack aus der Spezifikation (§6): **React Native + Expo,
TypeScript strict**. Diese App teilt sich die **UI-freie Berechnungsebene** mit
dem Web-Target — genau die Portabilität, die §6.3 verlangt.

## Was hier geteilt wird

Alle rein rechnenden Module werden unverändert aus `../src` importiert, es gibt
**keine Kopie der Astronomie-Logik**:

- `../src/core/astro-engine` — Sonne, Mond, Ereignisse
- `../src/core/time-engine` — Sonnenzeit-Versatz
- `../src/core/theme-engine` — Zonen & Paletten nach Sonnenhöhe
- `../src/core/planets` — Planetenpositionen
- `../src/core/object-bus`, `../src/providers/*` — Achse A
- `../src/i18n` — DE/EN-Wörterbücher

Metro ist so konfiguriert (`metro.config.js`, `watchFolders`), dass diese
Dateien aus dem Repo-Wurzelordner mitgebündelt werden.

## Was nativ neu ist

- `App.tsx` — Shell für iOS/Android mit Ansichts-Umschalter (Zifferblatt /
  Karte / Liste) und Layer-Toggles (Planeten / Sterne / Deep Sky)
- `src/Dial.tsx` — Zifferblatt über `react-native-svg` (Geometrie identisch
  zum Web-Zifferblatt)
- `src/SkyMap.tsx` — 2D-Himmelskarte über `react-native-svg` (§24)
- `src/ObjectList.tsx` — „Heute Nacht sichtbar", sortiert nach Höhe (§24)
- `src/useSky.ts` — Hook, wertet die geteilte Engine im Sekundentakt aus;
  Provider Sonne/Mond/Planeten/Sterne/Deep Sky
- `src/useLocation.ts` — GPS über `expo-location`, Fallback-Ort (§10)

Noch offen für die native Parität: Fähigkeits-Panels (Chronobiologie,
Outdoor, Solar …) als `Modal`, Onboarding, Ortssuche, Wandmodus, Widgets
(§25), dynamischer Wecker (§27) und die Umstellung des Zifferblatt-Renderings
auf Skia (§6.2).

## Starten

```bash
cd native
npm install          # oder: npx expo install  (richtet SDK-Versionen aus)
npm run typecheck    # tsc --noEmit
npx expo start       # dann i/a für iOS-Simulator bzw. Android-Emulator
```

> **Hinweis zur Verifikation:** Dieser Aufsatz wurde in der Entwicklungs-
> umgebung dieses Commits **nicht in einem Simulator ausgeführt** (kein
> iOS/Android-Simulator, kein Expo-Install verfügbar). Der Code ist sorgfältig
> gegen die geteilte, getestete Engine geschrieben; ein `npm install` +
> `npx expo start` auf einem Entwicklungsrechner ist der nächste Schritt, um ihn
> live zu prüfen. Die Berechnungsebene selbst ist über die Tests im
> Wurzelprojekt (`npm test`) validiert.

## Nächste Schritte (Spec)

- Zifferblatt-Rendering auf `@shopify/react-native-skia` umstellen (§6.2,
  GPU-beschleunigt) — betrifft nur `src/Dial.tsx`
- Onboarding, Wandmodus, Objektliste und Wetter aus dem Web-Target nachziehen
- Widgets (WidgetKit / Glance, §25) und dynamischer Wecker (§27) — die auf Web
  bewusst fehlenden, nativen Kernfunktionen
