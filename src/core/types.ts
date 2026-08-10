/**
 * Kern-Schnittstellen des Drei-Achsen-Systems (Spec §7.2, §7.3).
 * Achse A = Provider (was ist am Himmel), Achse B = Ansichten (wie dargestellt),
 * Achse C = Fähigkeiten (Verhalten). Die Trennung hält Provider und Ansichten
 * entkoppelt: neuer Provider erscheint automatisch in allen Ansichten.
 */

import type { GeoLocation, HorizontalCoords } from './astro-engine';

export type ObjectKind = 'sun' | 'moon' | 'planet' | 'star' | 'satellite' | 'aircraft' | 'dso';

export interface CelestialObject {
  id: string;
  providerId: string;
  /** i18n-Schlüssel, kein fertiger String (Spec §7.2). */
  nameKey: string;
  kind: ObjectKind;
  horizontal: HorizontalCoords;
  /** Scheinbare Helligkeit, für Sichtbarkeitsfilter. */
  magnitude?: number;
  /** Providerspezifische Zusatzdaten für die Detailkarte. */
  metadata?: Record<string, unknown>;
}

export interface ProviderContext {
  time: Date;
  location: GeoLocation;
}

export interface ObjectProvider {
  id: string;
  /** Aktualisierungstakt in ms — erlaubt dem Core sinnvolles Timing (§7.2). */
  updateInterval: number;
  requiresNetwork: boolean;
  /** Core-Provider (Sonne/Mond) sind nicht deaktivierbar (§17). */
  core?: boolean;
  getObjects(ctx: ProviderContext): CelestialObject[];
}

export interface SkyView {
  id: string;
  nameKey: string;
  requiresSensors?: string[];
}
