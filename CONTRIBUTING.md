# Mitwirken an Zeitgeber

Danke für dein Interesse! Zeitgeber ist Open Source (MIT) und lebt von
Beiträgen — besonders willkommen sind Genauigkeits-Prüfungen der Berechnungen
und Übersetzungen.

## Grundprinzipien (aus der Spezifikation)

Bevor du eine Funktion vorschlägst, hilft ein Blick auf die Leitplanken:

1. **Wissenschaftliche Korrektheit vor Funktionsumfang.** Berechnungen sind
   ephemeriden-basiert und testbar. Keine astrologischen, esoterischen oder
   Solunar-Inhalte (Spec §4).
2. **Keine Gesundheits- oder Rechtsversprechen.** Die App liefert Informationen
   über Licht-, Zeit- und Himmelsverhältnisse — keine Diagnose, Therapie oder
   Rechtsauskunft (Spec §5).
3. **Privatsphäre zuerst.** Rein lokale Datenhaltung, kein Backend, keine
   Tracking-Bibliotheken (Spec §38.1).
4. **Wabi-Tech-Ästhetik.** Reduktion, Ruhe, feine Linien — keine Überladung
   (Spec §11).

## Architektur in Kürze

Drei getrennte Achsen (Spec §7):

- **Provider** (`src/providers`, Achse A) — liefern Himmelsobjekte, keine UI
- **Ansichten** (`src/views`, Achse B) — stellen alle Objekte dar
- **Fähigkeiten** (`src/features`, Achse C) — Verhalten, keine Himmelsobjekte

Die Berechnungsebene (`src/core/astro-engine.ts`) ist bewusst **UI-frei** und
muss es bleiben (Spec §6.3) — Voraussetzung für den späteren Begleitdienst.

Ein neuer Provider erscheint automatisch in allen Ansichten; eine neue Ansicht
zeigt automatisch alle Objekte. Nutze diese Entkopplung.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm run typecheck  # strikte Typprüfung
npm test           # Validierung der Astro-Engine
npm run build      # Produktions-Build
```

## Pull Requests

- Kleine, fokussierte PRs sind leichter zu prüfen.
- Neue oder geänderte Berechnungen brauchen einen Test gegen einen
  Referenzwert (NASA-JPL-Horizons oder NOAA Solar Calculator), Toleranz
  < 0,1° für Sichtbarkeitsfunktionen (Spec §4).
- `npm run typecheck` und `npm test` müssen grün sein.
- Neue UI-Strings gehören in **alle** Sprachdateien (`src/i18n`), keine fest
  verdrahteten Zeichenketten.

## Übersetzungen

Sprachdateien liegen in `src/i18n/index.ts`. MVP ist DE/EN; weitere Sprachen
sind willkommen. Achte auf `Intl`-konforme Formate für Zahlen und Zeiten.

## Verhaltenskodex

Mit deiner Teilnahme akzeptierst du den [Verhaltenskodex](./CODE_OF_CONDUCT.md).
