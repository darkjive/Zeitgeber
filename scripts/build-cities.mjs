/**
 * build-cities — erzeugt src/data/cities.ts aus dem GeoNames-Dump.
 *
 * Quelle: https://download.geonames.org/export/dump/cities15000.zip (CC BY 4.0).
 * Die Liste dient ausschliesslich der Beschriftung und der manuellen Ortssuche;
 * gerechnet wird immer mit den echten Koordinaten (§38.1: kein Netzaufruf,
 * der Standort verlaesst das Geraet nicht).
 *
 * Aufruf:  node scripts/build-cities.mjs <pfad/zu/cities15000.txt>
 *
 * Schwellen: DACH ab 20.000 Einwohnern (dichtes Netz dort, wo die App zuerst
 * genutzt wird), weltweit ab 200.000. Koordinaten auf 3 Nachkommastellen
 * (~110 m) — fuer ein Ortslabel mehr als genug, spart aber die Haelfte.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const NEAR = new Set(['DE', 'AT', 'CH', 'LI', 'LU']);
const MIN_NEAR = 20_000;
const MIN_WORLD = 200_000;

const src = process.argv[2];
if (!src) {
  console.error('Aufruf: node scripts/build-cities.mjs <cities15000.txt>');
  process.exit(1);
}

const rows = [];
for (const line of readFileSync(src, 'utf8').split('\n')) {
  if (!line) continue;
  const f = line.split('\t');
  const [name, lat, lon, cc, pop] = [f[1], +f[4], +f[5], f[8], +f[14]];
  const min = NEAR.has(cc) ? MIN_NEAR : MIN_WORLD;
  if (!(pop >= min) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  if (name.includes('|') || name.includes('\n')) continue; // Trennzeichen schuetzen
  rows.push({ name, lat, lon, cc, pop });
}

// Groesste zuerst: bei gleichem Namen gewinnt die groessere Stadt in der Suche.
rows.sort((a, b) => b.pop - a.pop);

const packed = rows.map((r) => `${r.name}|${r.lat.toFixed(3)}|${r.lon.toFixed(3)}|${r.cc}`).join('\n');

const out = `/**
 * cities — GENERIERT von scripts/build-cities.mjs. Nicht von Hand aendern.
 *
 * Datenquelle: GeoNames (https://www.geonames.org), lizenziert unter CC BY 4.0.
 * Enthaelt ${rows.length} Orte: DACH ab ${MIN_NEAR.toLocaleString('de-DE')} Einwohnern,
 * weltweit ab ${MIN_WORLD.toLocaleString('de-DE')}.
 *
 * Kompaktes Zeilenformat "Name|Breite|Laenge|Land" statt eines Objekt-Arrays —
 * das spart im Bundle rund zwei Drittel und wird beim ersten Zugriff einmalig
 * geparst (siehe core/location.ts).
 */

export const CITIES_PACKED = ${JSON.stringify(packed)};
`;

const dest = resolve(process.cwd(), 'src/data/cities.ts');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`${rows.length} Orte → ${dest} (${(out.length / 1024).toFixed(1)} kB)`);
