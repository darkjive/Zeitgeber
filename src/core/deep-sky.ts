/**
 * deep-sky — kuratierter Messier-/NGC-Katalog (Spec §19, spätere Phase).
 *
 * Highlights des Nachthimmels: Galaxien, Nebel und Sternhaufen, die mit
 * kleinem Fernglas oder Teleskop lohnen. J2000-Positionen; die Horizontal-
 * koordinaten liefert die vorhandene Transformation (astro-engine).
 */

export type DsoType = 'galaxy' | 'nebula' | 'cluster';

export interface DeepSkyObject {
  name: string;
  ra: number; // Grad (J2000)
  dec: number; // Grad
  mag: number;
  type: DsoType;
}

export const DEEP_SKY: DeepSkyObject[] = [
  { name: 'M31 (Andromeda)', ra: 10.68, dec: 41.27, mag: 3.4, type: 'galaxy' },
  { name: 'M33 (Dreieck)', ra: 23.46, dec: 30.66, mag: 5.7, type: 'galaxy' },
  { name: 'M45 (Plejaden)', ra: 56.75, dec: 24.12, mag: 1.6, type: 'cluster' },
  { name: 'M42 (Orionnebel)', ra: 83.82, dec: -5.39, mag: 4.0, type: 'nebula' },
  { name: 'M1 (Krebsnebel)', ra: 83.63, dec: 22.01, mag: 8.4, type: 'nebula' },
  { name: 'M35', ra: 92.27, dec: 24.34, mag: 5.3, type: 'cluster' },
  { name: 'M41', ra: 101.5, dec: -20.72, mag: 4.5, type: 'cluster' },
  { name: 'M44 (Praesepe)', ra: 130.1, dec: 19.67, mag: 3.7, type: 'cluster' },
  { name: 'M81 (Bodes Galaxie)', ra: 148.89, dec: 69.07, mag: 6.9, type: 'galaxy' },
  { name: 'M104 (Sombrero)', ra: 190.0, dec: -11.62, mag: 8.0, type: 'galaxy' },
  { name: 'M51 (Strudel)', ra: 202.47, dec: 47.2, mag: 8.4, type: 'galaxy' },
  { name: 'M64 (Schwarzes Auge)', ra: 194.18, dec: 21.68, mag: 8.5, type: 'galaxy' },
  { name: 'M63 (Sonnenblume)', ra: 198.96, dec: 42.03, mag: 8.6, type: 'galaxy' },
  { name: 'M3', ra: 205.55, dec: 28.38, mag: 6.2, type: 'cluster' },
  { name: 'M5', ra: 229.64, dec: 2.08, mag: 5.6, type: 'cluster' },
  { name: 'M13 (Herkuleshaufen)', ra: 250.42, dec: 36.46, mag: 5.8, type: 'cluster' },
  { name: 'M92', ra: 259.28, dec: 43.14, mag: 6.4, type: 'cluster' },
  { name: 'M6 (Schmetterling)', ra: 265.08, dec: -32.21, mag: 4.2, type: 'cluster' },
  { name: 'M7 (Ptolemäus)', ra: 268.45, dec: -34.79, mag: 3.3, type: 'cluster' },
  { name: 'M8 (Lagunennebel)', ra: 271.0, dec: -24.38, mag: 6.0, type: 'nebula' },
  { name: 'M22', ra: 279.1, dec: -23.9, mag: 5.1, type: 'cluster' },
  { name: 'M11 (Wildenten)', ra: 282.77, dec: -6.27, mag: 6.3, type: 'cluster' },
  { name: 'M57 (Ringnebel)', ra: 283.4, dec: 33.03, mag: 8.8, type: 'nebula' },
  { name: 'M27 (Hantelnebel)', ra: 299.9, dec: 22.72, mag: 7.4, type: 'nebula' },
  { name: 'M15', ra: 322.49, dec: 12.17, mag: 6.2, type: 'cluster' },
  { name: 'M34', ra: 40.5, dec: 42.72, mag: 5.5, type: 'cluster' },
  { name: 'Doppelhaufen h+χ', ra: 34.75, dec: 57.13, mag: 4.3, type: 'cluster' },
  { name: 'M37', ra: 88.07, dec: 32.55, mag: 6.2, type: 'cluster' },
];
