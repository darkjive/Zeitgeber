/**
 * object-bus — zentrale Sammelstelle, aggregiert alle aktiven Provider (§7.1).
 *
 * Ansichten abonnieren den Bus und erhalten alle aktiven Objekte; sie kennen
 * keine einzelnen Provider (§7.3). Fehlerisolierung pro Modul (§7.4): ein
 * ausgefallener Provider entfernt nur seine Objekte, alle anderen laufen weiter.
 */

import type { CelestialObject, ObjectProvider, ProviderContext } from './types';

export class ObjectBus {
  private providers = new Map<string, ObjectProvider>();
  private enabled = new Set<string>();

  register(provider: ObjectProvider): void {
    this.providers.set(provider.id, provider);
    if (provider.core) this.enabled.add(provider.id);
  }

  setEnabled(id: string, on: boolean): void {
    const p = this.providers.get(id);
    if (p?.core) return; // Core-Provider bleiben immer aktiv (§17)
    if (on) this.enabled.add(id);
    else this.enabled.delete(id);
  }

  isEnabled(id: string): boolean {
    return this.enabled.has(id);
  }

  /** Alle Objekte der aktiven Provider für den aktuellen Kontext. */
  collect(ctx: ProviderContext): CelestialObject[] {
    const out: CelestialObject[] = [];
    for (const id of this.enabled) {
      const provider = this.providers.get(id);
      if (!provider) continue;
      try {
        out.push(...provider.getObjects(ctx));
      } catch (err) {
        // Modul scheitert isoliert (§7.4, §10) — Kernuhr bleibt unberührt.
        console.warn(`Provider "${id}" fehlgeschlagen, wird übersprungen:`, err);
      }
    }
    return out;
  }
}
