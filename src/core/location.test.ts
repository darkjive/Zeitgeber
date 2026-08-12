import { describe, expect, test, beforeEach } from 'vitest';

// Die Tests laufen unter `environment: 'node'` (vite.config.ts). Ein winziger
// Speicher-Stub reicht hier völlig — jsdom nur für localStorage wäre unverhältnismässig.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

import {
  DEFAULT_LOCATION,
  distanceKm,
  findCity,
  loadLocation,
  nearestCity,
  placeLabel,
  saveLocation,
} from './location';

const DARMSTADT = { latitude: 49.8728, longitude: 8.6512 };
const KARLSRUHE = { latitude: 49.0069, longitude: 8.4037 };
const NORDATLANTIK = { latitude: 45.0, longitude: -30.0 };

describe('distanceKm', () => {
  test('misst Karlsruhe–Darmstadt als knapp 98 km', () => {
    expect(distanceKm(KARLSRUHE, DARMSTADT)).toBeCloseTo(97.9, 1);
  });

  test('berücksichtigt die Stauchung der Längengrade in hohen Breiten', () => {
    // 1° Länge sind am Äquator ~111 km, bei 70° N nur noch ~38 km. Eine naive
    // Rechnung in Grad-Quadraten würde beide gleich gewichten und die nächste
    // Stadt im Norden falsch bestimmen.
    const aequator = distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const hoheBreite = distanceKm({ latitude: 70, longitude: 0 }, { latitude: 70, longitude: 1 });
    expect(aequator).toBeCloseTo(111, 0);
    expect(hoheBreite).toBeCloseTo(38, 0);
  });
});

describe('nearestCity', () => {
  test('findet Darmstadt für Darmstädter Koordinaten', () => {
    const hit = nearestCity(DARMSTADT);
    expect(hit?.label).toBe('Darmstadt');
    expect(hit!.distanceKm).toBeLessThan(5);
  });

  test('liefert null, wenn keine Stadt in Reichweite liegt', () => {
    expect(nearestCity(NORDATLANTIK)).toBeNull();
  });
});

describe('placeLabel', () => {
  test('nennt Darmstadt beim Namen statt der 97 km entfernten Nachbarstadt', () => {
    expect(placeLabel(DARMSTADT)).toBe('Darmstadt');
  });

  test('zeigt Koordinaten statt eines erfundenen Ortsnamens, wenn nichts nah ist', () => {
    const label = placeLabel(NORDATLANTIK);
    expect(label).not.toMatch(/[A-Za-z]{4,}/); // kein Stadtname
    expect(label).toContain('45');
    expect(label).toContain('30');
  });
});

describe('findCity', () => {
  test('findet Darmstadt über die manuelle Suche', () => {
    const hit = findCity('Darmstadt');
    expect(hit?.label).toBe('Darmstadt');
    expect(hit!.latitude).toBeCloseTo(49.87, 1);
    expect(hit!.longitude).toBeCloseTo(8.65, 1);
  });

  test('bevorzugt bei mehrdeutigen Namen die grössere Stadt', () => {
    expect(findCity('Berlin')?.label).toBe('Berlin');
  });

  test('liefert null für Unsinn', () => {
    expect(findCity('Xyzzyburg')).toBeNull();
  });
});

describe('Herkunft des Standorts', () => {
  beforeEach(() => localStorage.clear());

  test('der Vorgabeort ist als geraten markiert', () => {
    expect(DEFAULT_LOCATION.source).toBe('default');
  });

  test('speichert und liest die Herkunft mit', () => {
    saveLocation({ ...DARMSTADT, source: 'gps' });
    expect(loadLocation()).toMatchObject({ source: 'gps' });
  });

  test('persistiert kein Ortslabel — der Name wird stets neu aus den Koordinaten abgeleitet', () => {
    saveLocation({ ...DARMSTADT, source: 'gps' });
    expect(localStorage.getItem('sunclock.location')).not.toContain('Darmstadt');
  });

  test('behandelt Altbestände ohne Herkunft als manuell gewählt', () => {
    localStorage.setItem('sunclock.location', JSON.stringify({ ...DARMSTADT, label: 'Karlsruhe' }));
    const loaded = loadLocation();
    expect(loaded?.source).toBe('manual');
    expect(loaded?.latitude).toBeCloseTo(49.87, 1);
  });

  test('verwirft ein veraltet gespeichertes Label statt es weiterzuschleppen', () => {
    localStorage.setItem('sunclock.location', JSON.stringify({ ...DARMSTADT, label: 'Karlsruhe' }));
    expect(placeLabel(loadLocation()!)).toBe('Darmstadt');
  });
});
