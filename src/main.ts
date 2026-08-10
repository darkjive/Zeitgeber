/**
 * main — App-Shell (Web-Target). Verdrahtet Core, Provider (Achse A),
 * Zifferblatt-Ansicht (Achse B) und Fähigkeiten (Achse C) über die Registry.
 *
 * Phase-1-MVP (Spec §37): Core + object-bus + Registry, UI-freie Astro-Engine,
 * Provider Sonne/Mond, Zifferblatt mit Dämmerungszonen, Tag/Nacht-Theme,
 * Standort, DE/EN, Sonnenzeit-Versatz, Onboarding, Barrierefreiheit,
 * Fehlerzustände, Wandmodus-Grundfunktion.
 */

import './styles.css';

import { ObjectBus } from './core/object-bus';
import { paletteForElevation, zoneForElevation } from './core/theme-engine';
import { solarOffset, utcOffsetMinutes } from './core/time-engine';
import {
  DEFAULT_LOCATION,
  findCity,
  loadLocation,
  nearestCityLabel,
  requestGeolocation,
  saveLocation,
} from './core/location';
import type { GeoLocation } from './core/astro-engine';
import { sunTimes } from './core/astro-engine';
import { sunProvider } from './providers/sun';
import { moonProvider } from './providers/moon';
import { renderDial } from './views/dial';
import { showOnboarding, hasOnboarded } from './features/onboarding';
import { WallMode } from './features/wallmode';
import {
  azimuthDirKey,
  createTranslator,
  detectLang,
  saveLang,
  type Lang,
  type Translator,
} from './i18n';

// --- Zustand ----------------------------------------------------------------

let lang: Lang = detectLang();
let t: Translator = createTranslator(lang);
let location: GeoLocation = loadLocation() ?? DEFAULT_LOCATION;

const bus = new ObjectBus();
bus.register(sunProvider);
bus.register(moonProvider);

const app = document.getElementById('app') as HTMLElement;
let wall: WallMode;

// --- Formatierung -----------------------------------------------------------

const fmtTime = (d: Date, withSeconds = false): string =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  }).format(d);

function fmtDuration(totalMin: number): string {
  const m = Math.abs(totalMin);
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min} ${t('unit.min')}`;
  return `${h} ${t('unit.hour')} ${min} ${t('unit.min')}`;
}

// --- App-Gerüst -------------------------------------------------------------

app.innerHTML = `
  <div class="frame">
    <header class="topbar">
      <div class="brand">
        <span class="brand__mark">☀</span>
        <div>
          <div class="brand__name" data-i18n="app.title"></div>
          <div class="brand__tag" data-i18n="app.tagline"></div>
        </div>
      </div>
      <div class="topbar__actions">
        <button class="btn btn--ghost" id="lang-toggle" aria-label="Language"></button>
        <button class="btn btn--ghost" id="wall-toggle"></button>
      </div>
    </header>

    <main class="stage">
      <div class="dial-wrap" id="dial-wrap"></div>

      <section class="readout" aria-live="polite">
        <div class="readout__legal">
          <span class="readout__label" data-i18n="dial.legalTime"></span>
          <span class="readout__time" id="legal-time">–</span>
        </div>
        <div class="readout__solar">
          <span class="readout__label" data-i18n="dial.solarTime"></span>
          <span class="readout__solar-time" id="solar-time">–</span>
        </div>
        <p class="offset" id="offset-line"></p>
        <p class="offset__explain" id="offset-explain"></p>
      </section>
    </main>

    <section class="sky">
      <div class="sky__cell">
        <span class="sky__k" data-i18n="object.sun"></span>
        <span class="sky__v" id="sun-elev">–</span>
        <span class="sky__sub" id="sun-dir">–</span>
      </div>
      <div class="sky__cell">
        <span class="sky__k" data-i18n="object.moon"></span>
        <span class="sky__v" id="moon-phase">–</span>
        <span class="sky__sub" id="moon-illum">–</span>
      </div>
      <div class="sky__cell">
        <span class="sky__k" data-i18n="dial.sunrise"></span>
        <span class="sky__v" id="sunrise">–</span>
        <span class="sky__sub" data-i18n="dial.sunset"></span>
        <span class="sky__sub" id="sunset">–</span>
      </div>
    </section>

    <footer class="locbar">
      <button class="loc" id="loc-btn">
        <span class="loc__pin">📍</span>
        <span id="loc-label">–</span>
      </button>
      <form class="loc-search" id="loc-search" hidden>
        <input id="loc-input" type="text" autocomplete="off" />
        <button class="btn btn--primary" type="submit" data-i18n="loc.manual"></button>
      </form>
      <p class="loc__msg" id="loc-msg" hidden></p>
    </footer>
  </div>
`;

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => app.querySelector(sel) as T;

function applyStaticI18n(): void {
  app.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n as string);
  });
  $('#lang-toggle').textContent = lang === 'de' ? 'EN' : 'DE';
  $('#wall-toggle').textContent = t(wall?.isActive ? 'wall.exit' : 'wall.enter');
  ($('#loc-input') as HTMLInputElement).placeholder = t('loc.placeholder');
}

// --- Haupt-Render -----------------------------------------------------------

function render(now: Date): void {
  const ctx = { time: now, location };
  const objects = bus.collect(ctx);
  const sun = objects.find((o) => o.kind === 'sun');
  const moon = objects.find((o) => o.kind === 'moon');

  const tz = utcOffsetMinutes(now);
  const { palette, nightness } = paletteForElevation(sun?.horizontal.elevation ?? -90);
  applyPalette(palette);
  wall?.setNightness(nightness);

  // Zifferblatt
  const { svg } = renderDial({ time: now, location, tzOffsetMinutes: tz, objects, t });
  const wrap = $('#dial-wrap');
  wrap.replaceChildren(svg);

  // Zeit-Readout
  $('#legal-time').textContent = fmtTime(now, true);

  const off = solarOffset(now, location);
  const solarClock = new Date(now.getTime() - off.minutes * 60_000);
  $('#solar-time').textContent = fmtTime(solarClock);

  const line = $('#offset-line');
  if (Math.abs(off.minutes) < 2) line.textContent = t('offset.exact');
  else if (off.minutes > 0) line.textContent = t('offset.ahead', { m: fmtDuration(off.minutes) });
  else line.textContent = t('offset.behind', { m: fmtDuration(off.minutes) });
  $('#offset-explain').textContent = t('offset.explain', { noon: fmtTime(off.solarNoon) });

  // Sky-Strip
  if (sun) {
    $('#sun-elev').textContent = `${Math.round(sun.horizontal.elevation)}°`;
    const zoneName = t(zoneForElevation(sun.horizontal.elevation).nameKey);
    $('#sun-dir').textContent = `${t(azimuthDirKey(sun.horizontal.azimuth))} · ${zoneName}`;
  }
  if (moon) {
    const illum = (moon.metadata?.illumination as number) ?? 0;
    $('#moon-phase').textContent = t((moon.metadata?.phaseKey as string) ?? 'object.moon');
    $('#moon-illum').textContent = `${Math.round(illum * 100)} %`;
  }

  // Auf-/Untergang
  const times = sunTimes(now, location);
  $('#sunrise').textContent = times.sunrise ? fmtTime(times.sunrise) : '—';
  $('#sunset').textContent = times.sunset ? fmtTime(times.sunset) : '—';

  $('#loc-label').textContent = location.label ?? nearestCityLabel(location);
}

function applyPalette(p: ReturnType<typeof paletteForElevation>['palette']): void {
  const r = document.documentElement.style;
  r.setProperty('--bg', p.bg);
  r.setProperty('--surface', p.surface);
  r.setProperty('--accent', p.accent);
  r.setProperty('--secondary', p.secondary);
  r.setProperty('--text', p.text);
  r.setProperty('--text-dim', p.textDim);
}

// --- Interaktion ------------------------------------------------------------

function setLang(next: Lang): void {
  lang = next;
  t = createTranslator(lang);
  saveLang(lang);
  applyStaticI18n();
  render(new Date());
}

function setLocation(loc: GeoLocation): void {
  location = { ...loc, label: loc.label ?? nearestCityLabel(loc) };
  saveLocation(location);
  render(new Date());
}

function wireEvents(): void {
  $('#lang-toggle').addEventListener('click', () => setLang(lang === 'de' ? 'en' : 'de'));

  $('#wall-toggle').addEventListener('click', async () => {
    if (wall.isActive) wall.exit();
    else await wall.enter();
    applyStaticI18n();
  });

  const search = $('#loc-search') as HTMLFormElement;
  const input = $('#loc-input') as HTMLInputElement;
  const msg = $('#loc-msg');

  $('#loc-btn').addEventListener('click', async () => {
    msg.hidden = true;
    try {
      const geo = await requestGeolocation();
      setLocation(geo);
      search.hidden = true;
    } catch {
      // §10: Rückfall auf manuelle Eingabe, Kernuhr läuft weiter.
      search.hidden = false;
      msg.hidden = false;
      msg.textContent = t('loc.denied');
      input.focus();
    }
  });

  search.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = findCity(input.value);
    if (city) {
      setLocation(city);
      search.hidden = true;
      msg.hidden = true;
      input.value = '';
    } else {
      msg.hidden = false;
      msg.textContent = t('loc.notFound');
    }
  });

  // Wandmodus: Tippen blendet die volle Oberfläche kurz ein (§25).
  app.addEventListener('click', (e) => {
    if (wall.isActive && !(e.target as HTMLElement).closest('#wall-toggle')) {
      app.classList.add('wall-peek');
      window.setTimeout(() => app.classList.remove('wall-peek'), 3000);
    }
  });
}

// --- Start ------------------------------------------------------------------

async function boot(): Promise<void> {
  wall = new WallMode(app, () => applyStaticI18n());
  wireEvents();
  applyStaticI18n();
  render(new Date());

  if (!hasOnboarded()) {
    await showOnboarding(t);
  }

  // Sekundentakt für den Zeiger; Ephemeriden nur bei Bedarf teuer (§8).
  window.setInterval(() => render(new Date()), 1000);
}

void boot();
