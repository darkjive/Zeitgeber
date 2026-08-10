/**
 * Wandmodus — ältere Tablets als lebende Wanduhr (Spec §25).
 *
 * MVP-Grundfunktion (§37 Phase 1): Bildschirm wachhalten (nur in diesem Modus),
 * reduzierte Oberfläche, automatische Abdunklung nach Sonnenstand, Einbrennschutz
 * durch langsame Positionsverschiebung. Tippen blendet die volle Oberfläche ein.
 */

export class WallMode {
  private active = false;
  private wakeLock: WakeLockSentinel | null = null;
  private driftTimer: number | null = null;

  constructor(
    private root: HTMLElement,
    private onExit: () => void,
  ) {}

  get isActive(): boolean {
    return this.active;
  }

  async enter(): Promise<void> {
    this.active = true;
    this.root.classList.add('is-wall');
    await this.acquireWakeLock();
    this.startBurnInDrift();
  }

  exit(): void {
    this.active = false;
    this.root.classList.remove('is-wall');
    this.root.style.removeProperty('--wall-drift-x');
    this.root.style.removeProperty('--wall-drift-y');
    this.releaseWakeLock();
    if (this.driftTimer != null) {
      clearInterval(this.driftTimer);
      this.driftTimer = null;
    }
    this.onExit();
  }

  /** Abdunklung nach Sonnenstand (§25): nachts nicht blenden. */
  setNightness(nightness: number): void {
    // 1.0 (Tag, volle Helligkeit) → 0.35 (tiefe Nacht, gedimmt)
    const brightness = 1 - nightness * 0.65;
    this.root.style.setProperty('--wall-brightness', brightness.toFixed(3));
  }

  private async acquireWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {
      /* Wake Lock optional — Modus funktioniert auch ohne. */
    }
  }

  private releaseWakeLock(): void {
    this.wakeLock?.release().catch(() => undefined);
    this.wakeLock = null;
  }

  /** Einbrennschutz: minimale, langsame Positionsverschiebung (§25). */
  private startBurnInDrift(): void {
    let phase = 0;
    this.driftTimer = window.setInterval(() => {
      phase += 0.02;
      const dx = Math.sin(phase) * 6;
      const dy = Math.cos(phase * 0.7) * 6;
      this.root.style.setProperty('--wall-drift-x', `${dx.toFixed(1)}px`);
      this.root.style.setProperty('--wall-drift-y', `${dy.toFixed(1)}px`);
    }, 4000);
  }
}
