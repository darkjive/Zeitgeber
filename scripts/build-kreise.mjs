/**
 * build-kreise — erzeugt src/data/kreise.ts aus einer GeoJSON-Kreiskarte.
 *
 * Quelle: https://github.com/m-ad/geofeatures-ags-germany (geojson/counties.json,
 * MIT). `id` je Feature ist der 5-stellige Kreis-AGS — die ersten 5 Stellen
 * des Amtlichen Regionalschlüssels (ARS), den die NINA/BBK-Warn-API erwartet
 * (Rest mit Nullen aufgefuellt, siehe core/civil-warnings.ts).
 *
 * Berechnet je Kreis den flaechengewichteten Polygon-Schwerpunkt (Shoelace-
 * Formel, bei MultiPolygon ueber alle Teilflaechen gewichtet) — reicht fuer
 * eine "naechster Kreis"-Zuordnung locker aus, ohne Punkt-in-Polygon-Tests
 * oder eine externe Geo-Bibliothek zu brauchen.
 *
 * Aufruf:  node scripts/build-kreise.mjs <pfad/zu/counties.json>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('Aufruf: node scripts/build-kreise.mjs <counties.json>');
  process.exit(1);
}

// Flaeche + Schwerpunkt eines Rings (Shoelace-Formel). Nur der Aussenring
// zaehlt — Loecher (Enklaven) sind bei deutschen Kreisen zu selten und zu
// klein, um die Naeherung spuerbar zu verzerren.
function ringCentroid(ring) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area /= 2;
  if (area === 0) return null;
  return { cx: cx / (6 * area), cy: cy / (6 * area), area: Math.abs(area) };
}

function polygonCentroid(coords) {
  // coords: Array von Ringen, coords[0] ist der Aussenring.
  return ringCentroid(coords[0]);
}

function featureCentroid(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let totalArea = 0;
  let x = 0;
  let y = 0;
  for (const poly of polys) {
    const c = polygonCentroid(poly);
    if (!c) continue;
    totalArea += c.area;
    x += c.cx * c.area;
    y += c.cy * c.area;
  }
  if (totalArea === 0) return null;
  return { lon: x / totalArea, lat: y / totalArea };
}

const geo = JSON.parse(readFileSync(src, 'utf8'));
const rows = [];
for (const f of geo.features) {
  const ags = f.id;
  const name = f.properties.name;
  const c = featureCentroid(f.geometry);
  if (!ags || !name || !c) continue;
  if (name.includes('|') || name.includes('\n')) continue; // Trennzeichen schuetzen
  rows.push({ ags, name, lat: c.lat, lon: c.lon });
}

rows.sort((a, b) => a.ags.localeCompare(b.ags));

const packed = rows.map((r) => `${r.ags}|${r.name}|${r.lat.toFixed(3)}|${r.lon.toFixed(3)}`).join('\n');

const out = `/**
 * kreise — GENERIERT von scripts/build-kreise.mjs. Nicht von Hand aendern.
 *
 * Datenquelle: github.com/m-ad/geofeatures-ags-germany (MIT). Enthaelt
 * ${rows.length} deutsche Kreise/kreisfreie Staedte: 5-stelliger Kreis-AGS,
 * Name, flaechengewichteter Schwerpunkt (Breite/Laenge).
 *
 * Zweck: Zuordnung Standort -> Amtlicher Regionalschluessel (ARS) fuer die
 * NINA/BBK-Warn-API (civil-warnings), rein lokal per naechstem Schwerpunkt —
 * kein Geocoding-Netzdienst noetig (§38.1).
 *
 * Kompaktes Zeilenformat "AGS|Name|Breite|Laenge" statt Objekt-Array, analog
 * zu data/cities.ts.
 */

export const KREISE_PACKED = ${JSON.stringify(packed)};
`;

const dest = resolve(process.cwd(), 'src/data/kreise.ts');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`${rows.length} Kreise → ${dest} (${(out.length / 1024).toFixed(1)} kB)`);
