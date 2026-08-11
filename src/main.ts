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
import { planetsProvider } from './providers/planets';
import { starsProvider } from './providers/stars';
import { renderDial } from './views/dial';
import { renderObjectList } from './views/object-list';
import { renderSkyMap } from './views/sky-map';
import { showOnboarding, hasOnboarded } from './features/onboarding';
import { WallMode } from './features/wallmode';
import { fetchWeather, observationRating, type WeatherNow } from './features/weather';
import { renderViewToBlob, shareOrDownload } from './features/share';
import { openSolarYield } from './features/solar-yield';
import { openPrayerTimes } from './features/prayer-times';
import { openChronobiology, currentChrono } from './features/chronobiology';
import { openOutdoor } from './features/outdoor';
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
bus.register(planetsProvider); // optional, standardmäßig deaktiviert (§7.4)
bus.register(starsProvider); // optional, standardmäßig deaktiviert (§7.4)

const app = document.getElementById('app') as HTMLElement;
let wall: WallMode;
type ViewId = 'dial' | 'list' | 'map';
let currentView: ViewId = 'dial';
let weather: WeatherNow | null = null;

// Zeitreise (§24): null = Live (jetzt), sonst eingefrorener Zeitpunkt.
let frozenTime: Date | null = null;
const currentTime = (): Date => frozenTime ?? new Date();
const rerender = (): void => render(currentTime());

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

    <div class="controls">
      <div class="seg" role="tablist">
        <button class="seg__btn is-active" id="view-dial" data-i18n="view.dial"></button>
        <button class="seg__btn" id="view-map" data-i18n="view.map"></button>
        <button class="seg__btn" id="view-list" data-i18n="view.list"></button>
      </div>
      <div class="layers">
        <button class="chip" id="planets-toggle" aria-pressed="false" data-i18n="layer.planets"></button>
        <button class="chip" id="stars-toggle" aria-pressed="false" data-i18n="layer.stars"></button>
        <button class="chip" id="solar-open" data-i18n="solar.button"></button>
        <button class="chip" id="prayer-open" data-i18n="prayer.button"></button>
        <button class="chip" id="chrono-open" data-i18n="chrono.button"></button>
        <button class="chip" id="outdoor-open" data-i18n="outdoor.button"></button>
      </div>
    </div>

    <main class="stage">
      <div class="view-wrap" id="view-wrap"></div>

      <section class="readout" id="readout" aria-live="polite">
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

    <div class="timebar">
      <div class="stepper">
        <button class="chip chip--sm" id="t-day-back" data-i18n="time.dayBack"></button>
        <button class="chip chip--sm" id="t-hr-back" data-i18n="time.hourBack"></button>
        <button class="chip chip--sm" id="t-hr-fwd" data-i18n="time.hourFwd"></button>
        <button class="chip chip--sm" id="t-day-fwd" data-i18n="time.dayFwd"></button>
      </div>
      <input class="t-input" id="t-input" type="datetime-local" aria-label="Zeitpunkt" />
      <button class="chip" id="t-now" data-i18n="time.now"></button>
      <button class="chip" id="t-share" data-i18n="share.button"></button>
    </div>

    <div class="weather" id="weather" hidden>
      <span class="weather__k" data-i18n="weather.title"></span>
      <span class="weather__badge" id="weather-badge">–</span>
      <span class="weather__sub" id="weather-sub"></span>
    </div>

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

  // Ansicht (Achse B): Zifferblatt, Himmelskarte oder Objektliste
  const wrap = $('#view-wrap');
  if (currentView === 'dial') {
    const chr = currentChrono();
    const chrono = chr ? { idealOnsetMin: chr.idealOnsetMin, idealWakeMin: chr.idealWakeMin, msfScMin: chr.msfScMin } : null;
    const { svg } = renderDial({ time: now, location, tzOffsetMinutes: tz, objects, t, chrono });
    wrap.replaceChildren(svg);
    $('#readout').hidden = false;
  } else if (currentView === 'map') {
    const { svg } = renderSkyMap(objects, t);
    wrap.replaceChildren(svg);
    $('#readout').hidden = false;
  } else {
    wrap.replaceChildren(renderObjectList(objects, t));
    $('#readout').hidden = true;
  }

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

  renderWeather(moon);
  updateTimebar(now);
}

const pad2 = (n: number): string => String(n).padStart(2, '0');
function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function updateTimebar(now: Date): void {
  const input = $('#t-input') as HTMLInputElement;
  if (document.activeElement !== input) input.value = toLocalInputValue(now);
  const live = frozenTime === null;
  const nowBtn = $('#t-now');
  nowBtn.classList.toggle('is-on', !live); // hervorgehoben, solange man in der Zeitreise ist
  app.classList.toggle('is-travelling', !live);
}

function renderWeather(moon?: { horizontal: { elevation: number }; metadata?: Record<string, unknown> }): void {
  const panel = $('#weather');
  if (!weather) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const moonUp = (moon?.horizontal.elevation ?? -90) > 0;
  const illum = (moon?.metadata?.illumination as number) ?? 0;
  const rating = observationRating(weather, illum, moonUp);
  const badge = $('#weather-badge');
  badge.textContent = t(`weather.${rating}`);
  badge.dataset.rating = rating;
  const stamp = t('weather.stamp', { time: fmtTime(new Date(weather.fetchedAt)) });
  $('#weather-sub').textContent = `${t('weather.clouds')} ${Math.round(weather.cloudCover)} % · ${stamp}`;
}

async function refreshWeather(): Promise<void> {
  weather = await fetchWeather(location);
  renderWeather(bus.collect({ time: currentTime(), location }).find((o) => o.kind === 'moon'));
}

async function exportCurrentView(): Promise<void> {
  const svg = $('#view-wrap').querySelector('svg');
  if (!svg) return; // Listenansicht hat kein Bild
  const now = currentTime();
  const css = getComputedStyle(document.documentElement);
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const place = location.label ?? nearestCityLabel(location);
  try {
    const blob = await renderViewToBlob(svg as SVGElement, {
      title: t('app.title'),
      caption: `${fmt.format(now)} · ${place}`,
      brand: t('share.brand'),
      bg: css.getPropertyValue('--bg').trim() || '#0B0D12',
      text: css.getPropertyValue('--text').trim() || '#E8E8E8',
      textDim: css.getPropertyValue('--text-dim').trim() || '#8A8F9C',
    });
    await shareOrDownload(blob, `sunclock-${toLocalInputValue(now).replace(/[:T-]/g, '')}.png`, t('app.title'));
  } catch (err) {
    console.warn('Export fehlgeschlagen:', err);
  }
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
  rerender();
}

function setLocation(loc: GeoLocation): void {
  location = { ...loc, label: loc.label ?? nearestCityLabel(loc) };
  saveLocation(location);
  rerender();
  void refreshWeather(); // §28: Wetter am neuen Ort neu holen
}

function setView(view: ViewId): void {
  currentView = view;
  $('#view-dial').classList.toggle('is-active', view === 'dial');
  $('#view-map').classList.toggle('is-active', view === 'map');
  $('#view-list').classList.toggle('is-active', view === 'list');
  rerender();
}

function toggleLayer(id: 'planets' | 'stars', btnSel: string): void {
  const on = !bus.isEnabled(id);
  bus.setEnabled(id, on);
  const btn = $(btnSel);
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-pressed', String(on));
  rerender();
}

function wireEvents(): void {
  $('#lang-toggle').addEventListener('click', () => setLang(lang === 'de' ? 'en' : 'de'));

  $('#view-dial').addEventListener('click', () => setView('dial'));
  $('#view-map').addEventListener('click', () => setView('map'));
  $('#view-list').addEventListener('click', () => setView('list'));

  $('#planets-toggle').addEventListener('click', () => toggleLayer('planets', '#planets-toggle'));
  $('#stars-toggle').addEventListener('click', () => toggleLayer('stars', '#stars-toggle'));

  // Zeitreise (§24)
  const stepBy = (ms: number) => {
    frozenTime = new Date(currentTime().getTime() + ms);
    rerender();
  };
  $('#t-day-back').addEventListener('click', () => stepBy(-86_400_000));
  $('#t-hr-back').addEventListener('click', () => stepBy(-3_600_000));
  $('#t-hr-fwd').addEventListener('click', () => stepBy(3_600_000));
  $('#t-day-fwd').addEventListener('click', () => stepBy(86_400_000));
  $('#t-now').addEventListener('click', () => {
    frozenTime = null; // zurück in die Gegenwart
    rerender();
  });
  ($('#t-input') as HTMLInputElement).addEventListener('change', (e) => {
    const val = (e.target as HTMLInputElement).value;
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      frozenTime = d;
      rerender();
    }
  });

  // Teilen/Export (§33)
  $('#t-share').addEventListener('click', () => void exportCurrentView());

  // Solar-Modul (§31.1) — Panel bei Bedarf, für aktuellen Ort und Zeitpunkt
  $('#solar-open').addEventListener('click', () => openSolarYield(location, currentTime(), t));

  // Gebetszeiten (§32.1) — Panel bei Bedarf
  $('#prayer-open').addEventListener('click', () => openPrayerTimes(location, currentTime(), t));

  // Chronobiologie (§26) — sozialer Jetlag, rein lokal; aktualisiert den Ring
  $('#chrono-open').addEventListener('click', () => {
    const off = solarOffset(currentTime(), location).minutes;
    openChronobiology(off, t, () => rerender());
  });

  // Outdoor & Survival (§29) — Panel bei Bedarf, offline
  $('#outdoor-open').addEventListener('click', () => openOutdoor(location, currentTime(), t));

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
  rerender();
  void refreshWeather();

  if (!hasOnboarded()) {
    await showOnboarding(t);
  }

  // Sekundentakt für den Zeiger; Ephemeriden nur bei Bedarf teuer (§8).
  window.setInterval(() => rerender(), 1000);
  // Wetter deutlich seltener aktualisieren (§8, §28).
  window.setInterval(() => void refreshWeather(), 15 * 60_000);
}

void boot();
