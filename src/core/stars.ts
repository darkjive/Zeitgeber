/**
 * stars — heller, benannter Fixstern-Subset (Spec §19).
 *
 * Bis ~Magnitude 2 mit Eigennamen: die Ankersterne der Sternbilder, das was
 * mit blossem Auge sofort auffällt. J2000-Positionen (RA/Dec in Grad). Für den
 * vollen Hipparcos-Subset bis Magnitude 6 (§19) wird später ein gebündelter
 * Katalog nachgeladen; die Datenform bleibt gleich.
 *
 * Sterne benötigen ein sehr langes Aktualisierungsintervall — die Eigenbewegung
 * ist über Jahre vernachlässigbar; nur die tägliche Rotation zählt (§7.2, §19).
 */

export interface Star {
  name: string;
  ra: number; // Rektaszension, Grad (J2000)
  dec: number; // Deklination, Grad (J2000)
  mag: number; // scheinbare Helligkeit
}

export const BRIGHT_STARS: Star[] = [
  { name: 'Sirius', ra: 101.287, dec: -16.716, mag: -1.46 },
  { name: 'Canopus', ra: 95.988, dec: -52.696, mag: -0.74 },
  { name: 'Arcturus', ra: 213.915, dec: 19.182, mag: -0.05 },
  { name: 'Rigil Kentaurus', ra: 219.902, dec: -60.834, mag: -0.27 },
  { name: 'Vega', ra: 279.234, dec: 38.784, mag: 0.03 },
  { name: 'Capella', ra: 79.172, dec: 45.998, mag: 0.08 },
  { name: 'Rigel', ra: 78.634, dec: -8.202, mag: 0.13 },
  { name: 'Procyon', ra: 114.825, dec: 5.225, mag: 0.34 },
  { name: 'Betelgeuse', ra: 88.793, dec: 7.407, mag: 0.5 },
  { name: 'Achernar', ra: 24.429, dec: -57.237, mag: 0.46 },
  { name: 'Hadar', ra: 210.956, dec: -60.373, mag: 0.61 },
  { name: 'Altair', ra: 297.696, dec: 8.868, mag: 0.77 },
  { name: 'Acrux', ra: 186.65, dec: -63.099, mag: 0.77 },
  { name: 'Aldebaran', ra: 68.98, dec: 16.509, mag: 0.85 },
  { name: 'Antares', ra: 247.352, dec: -26.432, mag: 1.09 },
  { name: 'Spica', ra: 201.298, dec: -11.161, mag: 1.04 },
  { name: 'Pollux', ra: 116.329, dec: 28.026, mag: 1.14 },
  { name: 'Fomalhaut', ra: 344.413, dec: -29.622, mag: 1.16 },
  { name: 'Deneb', ra: 310.358, dec: 45.28, mag: 1.25 },
  { name: 'Mimosa', ra: 191.93, dec: -59.689, mag: 1.25 },
  { name: 'Regulus', ra: 152.093, dec: 11.967, mag: 1.35 },
  { name: 'Adhara', ra: 104.656, dec: -28.972, mag: 1.5 },
  { name: 'Castor', ra: 113.65, dec: 31.888, mag: 1.57 },
  { name: 'Gacrux', ra: 187.791, dec: -57.113, mag: 1.63 },
  { name: 'Shaula', ra: 263.402, dec: -37.104, mag: 1.62 },
  { name: 'Bellatrix', ra: 81.283, dec: 6.35, mag: 1.64 },
  { name: 'Elnath', ra: 81.573, dec: 28.608, mag: 1.65 },
  { name: 'Alnilam', ra: 84.053, dec: -1.202, mag: 1.69 },
  { name: 'Alnitak', ra: 85.19, dec: -1.943, mag: 1.77 },
  { name: 'Alioth', ra: 193.507, dec: 55.96, mag: 1.76 },
  { name: 'Dubhe', ra: 165.932, dec: 61.751, mag: 1.79 },
  { name: 'Mirfak', ra: 51.081, dec: 49.861, mag: 1.79 },
  { name: 'Wezen', ra: 107.098, dec: -26.393, mag: 1.83 },
  { name: 'Kaus Australis', ra: 276.043, dec: -34.385, mag: 1.85 },
  { name: 'Alkaid', ra: 206.885, dec: 49.313, mag: 1.85 },
  { name: 'Avior', ra: 125.628, dec: -59.51, mag: 1.86 },
  { name: 'Menkalinan', ra: 89.882, dec: 44.947, mag: 1.9 },
  { name: 'Alhena', ra: 99.428, dec: 16.399, mag: 1.93 },
  { name: 'Peacock', ra: 306.412, dec: -56.735, mag: 1.94 },
  { name: 'Polaris', ra: 37.954, dec: 89.264, mag: 1.98 },
  { name: 'Mirzam', ra: 95.675, dec: -17.956, mag: 1.98 },
  { name: 'Alphard', ra: 141.897, dec: -8.659, mag: 2.0 },
  { name: 'Hamal', ra: 31.793, dec: 23.462, mag: 2.0 },
  { name: 'Diphda', ra: 10.897, dec: -17.987, mag: 2.04 },
  { name: 'Nunki', ra: 283.816, dec: -26.297, mag: 2.05 },
  { name: 'Denebola', ra: 177.265, dec: 14.572, mag: 2.11 },
];
