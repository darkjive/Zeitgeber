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
import { deepSkyProvider } from './providers/deep-sky';
import { satellitesProvider } from './providers/satellites';
import { aircraftProvider } from './providers/aircraft';
import { openSatellites, refreshTles } from './features/satellites';
import { fetchAircraft } from './features/aircraft';
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
import { openAbout } from './features/about';
import { openWheelOfYear } from './features/wheel-of-year';
import { openGarden, openArchitecture } from './features/sun-hours-panels';
import { openComfort } from './features/comfort';
import { openWildlife } from './features/wildlife';
import { openDrone } from './features/drone';
import { openMeteorShowers } from './features/meteor-showers';
import { openKids } from './features/kids';
import { icon, type IconName } from './icons';
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
bus.register(deepSkyProvider); // optional, standardmäßig deaktiviert (§7.4)
bus.register(satellitesProvider); // optional, standardmäßig deaktiviert (§7.4)
bus.register(aircraftProvider); // optional, standardmäßig deaktiviert (§7.4)

const app = document.getElementById('app') as HTMLElement;
let wall: WallMode;
type ViewId = 'dial' | 'list' | 'map';
type LayerId = 'planets' | 'stars' | 'deep-sky' | 'satellites' | 'aircraft';
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

// --- Menü-Inhalte (Ebenen + Module) -----------------------------------------
// Lucide-Icons statt Emojis, je Modul in einer eigenen, ruhigen Farbe (§11).

interface LayerDef {
  id: LayerId;
  labelKey: string;
  icon: IconName;
  color: string;
}

const LAYERS: LayerDef[] = [
  { id: 'planets', labelKey: 'layer.planets', icon: 'globe', color: '#C97A4A' },
  { id: 'stars', labelKey: 'layer.stars', icon: 'star', color: '#E0C24E' },
  { id: 'deep-sky', labelKey: 'layer.deepsky', icon: 'telescope', color: '#8D6FE7' },
  { id: 'satellites', labelKey: 'layer.satellites', icon: 'satellite', color: '#4FB6A0' },
  { id: 'aircraft', labelKey: 'layer.aircraft', icon: 'plane', color: '#5AA0D6' },
];

interface ModuleDef {
  key: string;
  labelKey: string;
  icon: IconName;
  color: string;
  open: (now: Date) => void;
}

const MODULES: ModuleDef[] = [
  { key: 'chrono', labelKey: 'chrono.button', icon: 'moon', color: '#8D6FE7', open: (now) => openChronobiology(solarOffset(now, location).minutes, t, () => rerender()) },
  { key: 'comfort', labelKey: 'comfort.button', icon: 'thermometer-sun', color: '#E8794A', open: (now) => openComfort(location, now, t) },
  { key: 'outdoor', labelKey: 'outdoor.button', icon: 'compass', color: '#4F9E8C', open: (now) => openOutdoor(location, now, t) },
  { key: 'solar', labelKey: 'solar.button', icon: 'zap', color: '#E0A93C', open: (now) => openSolarYield(location, now, t) },
  { key: 'arch', labelKey: 'arch.button', icon: 'building-2', color: '#7C93B0', open: (now) => openArchitecture(location, now, t) },
  { key: 'garden', labelKey: 'garden.button', icon: 'sprout', color: '#5FA968', open: (now) => openGarden(location, now, t) },
  { key: 'wildlife', labelKey: 'wildlife.button', icon: 'bird', color: '#C98A5E', open: (now) => openWildlife(location, now, t) },
  { key: 'meteor', labelKey: 'meteor.button', icon: 'sparkles', color: '#C9A94B', open: (now) => openMeteorShowers(location, now, t) },
  { key: 'drone', labelKey: 'drone.button', icon: 'radar', color: '#5AA0D6', open: (now) => openDrone(location, now, t) },
  { key: 'prayer', labelKey: 'prayer.button', icon: 'moon-star', color: '#8FA6D8', open: (now) => openPrayerTimes(location, now, t) },
  { key: 'wheel', labelKey: 'wheel.button', icon: 'orbit', color: '#C77FA8', open: (now) => openWheelOfYear(now, t) },
  { key: 'kids', labelKey: 'kids.button', icon: 'baby', color: '#E56B9B', open: (now) => openKids(location, now, t) },
  { key: 'sat', labelKey: 'sat.button', icon: 'satellite', color: '#9AA0AD', open: (now) => openSatellites(location, now, t) },
];

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
      <button class="iconbtn" id="burger" aria-label="Menü" aria-haspopup="dialog" aria-expanded="false">${icon('menu')}</button>
    </header>

    <div class="controls">
      <div class="seg" role="tablist" aria-label="Ansicht">
        <button class="seg__btn is-active" id="view-dial" role="tab" aria-selected="true" aria-controls="view-wrap" data-i18n="view.dial"></button>
        <button class="seg__btn" id="view-map" role="tab" aria-selected="false" aria-controls="view-wrap" data-i18n="view.map"></button>
        <button class="seg__btn" id="view-list" role="tab" aria-selected="false" aria-controls="view-wrap" data-i18n="view.list"></button>
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

  <div class="drawer" id="drawer" hidden>
    <div class="drawer__scrim" id="drawer-scrim"></div>
    <aside class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer__head">
        <span class="drawer__title" id="drawer-title" data-i18n="menu.title"></span>
        <button class="iconbtn" id="drawer-close" aria-label="Menü schließen">${icon('x')}</button>
      </div>
      <div class="drawer__body" id="drawer-body">
        <section class="drawer__section">
          <h3 class="drawer__h" data-i18n="menu.layers"></h3>
          <div class="mlist" id="drawer-layers"></div>
        </section>
        <section class="drawer__section">
          <h3 class="drawer__h" data-i18n="menu.modules"></h3>
          <div class="mlist" id="drawer-modules"></div>
        </section>
        <section class="drawer__section">
          <h3 class="drawer__h" data-i18n="menu.settings"></h3>
          <div class="mlist" id="drawer-settings"></div>
        </section>
      </div>
    </aside>
  </div>
`;

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => app.querySelector(sel) as T;

function applyStaticI18n(): void {
  document.documentElement.lang = lang; // WCAG 3.1.1
  app.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n as string);
  });
  $('#burger').setAttribute('aria-label', t('menu.open'));
  $('#drawer-close').setAttribute('aria-label', t('menu.close'));
  const locInput = $('#loc-input') as HTMLInputElement;
  locInput.placeholder = t('loc.placeholder');
  locInput.setAttribute('aria-label', t('loc.manual'));
  buildDrawer();
}

// --- Menü-Drawer (§11) ------------------------------------------------------

const iconSpan = (name: IconName, color: string): string =>
  `<span class="mrow__ic" style="color:${color}">${icon(name)}</span>`;

function buildDrawer(): void {
  // Ebenen — Kippschalter je Himmels-Provider.
  $('#drawer-layers').innerHTML = LAYERS.map(
    (l) => `
    <button class="mrow" data-layer="${l.id}" role="switch" aria-checked="${bus.isEnabled(l.id)}">
      ${iconSpan(l.icon, l.color)}
      <span class="mrow__label">${t(l.labelKey)}</span>
      <span class="mrow__switch" aria-hidden="true"></span>
    </button>`,
  ).join('');

  // Module — öffnen jeweils ein Panel.
  $('#drawer-modules').innerHTML = MODULES.map(
    (m) => `
    <button class="mrow" data-mod="${m.key}">
      ${iconSpan(m.icon, m.color)}
      <span class="mrow__label">${t(m.labelKey)}</span>
      <span class="mrow__chev">${icon('chevron-right')}</span>
    </button>`,
  ).join('');

  // Einstellungen — Sprache, Wandmodus, Info.
  const langName = lang === 'de' ? 'Deutsch' : 'English';
  $('#drawer-settings').innerHTML = `
    <button class="mrow" data-set="lang">
      ${iconSpan('languages', '#6C8ED6')}
      <span class="mrow__label">${t('settings.language')}</span>
      <span class="mrow__val">${langName}</span>
    </button>
    <button class="mrow" data-set="wall" aria-pressed="${wall?.isActive ? 'true' : 'false'}">
      ${iconSpan('monitor', '#8D7BC0')}
      <span class="mrow__label">${t(wall?.isActive ? 'wall.exit' : 'wall.enter')}</span>
      <span class="mrow__chev">${icon('chevron-right')}</span>
    </button>
    <button class="mrow" data-set="about">
      ${iconSpan('info', '#4F9E8C')}
      <span class="mrow__label">${t('about.button')}</span>
      <span class="mrow__chev">${icon('chevron-right')}</span>
    </button>`;
}

let lastFocus: HTMLElement | null = null;

function openDrawer(): void {
  lastFocus = document.activeElement as HTMLElement;
  const drawer = $('#drawer');
  drawer.hidden = false;
  // Reflow, dann is-open für die Slide-in-Animation.
  void drawer.offsetWidth;
  drawer.classList.add('is-open');
  $('#burger').setAttribute('aria-expanded', 'true');
  ($('#drawer-close') as HTMLButtonElement).focus();
}

function closeDrawer(): void {
  const drawer = $('#drawer');
  if (drawer.hidden) return;
  drawer.classList.remove('is-open');
  $('#burger').setAttribute('aria-expanded', 'false');
  window.setTimeout(() => {
    drawer.hidden = true;
  }, 280);
  lastFocus?.focus();
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
  r.setProperty('--on-accent', p.onAccent);
}

// --- Interaktion ------------------------------------------------------------

function setLang(next: Lang): void {
  lang = next;
  t = createTranslator(lang);
  saveLang(lang);
  document.documentElement.lang = lang; // WCAG 3.1.1
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
  for (const [id, v] of [['#view-dial', 'dial'], ['#view-map', 'map'], ['#view-list', 'list']] as const) {
    const on = view === v;
    $(id).classList.toggle('is-active', on);
    $(id).setAttribute('aria-selected', String(on));
  }
  rerender();
}

function toggleLayer(id: LayerId, row: HTMLElement): void {
  const on = !bus.isEnabled(id);
  bus.setEnabled(id, on);
  row.setAttribute('aria-checked', String(on));
  // Frische Netzdaten nur beim Einschalten (§20).
  if (on && id === 'satellites') void refreshTles().then(() => rerender());
  if (on && id === 'aircraft') void fetchAircraft(location).then(() => rerender());
  rerender();
}

async function toggleWall(): Promise<void> {
  if (wall.isActive) wall.exit();
  else await wall.enter();
  applyStaticI18n();
}

function wireEvents(): void {
  $('#view-dial').addEventListener('click', () => setView('dial'));
  $('#view-map').addEventListener('click', () => setView('map'));
  $('#view-list').addEventListener('click', () => setView('list'));

  // Burger-Menü + Drawer (§11)
  $('#burger').addEventListener('click', openDrawer);
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer();
  });

  // Ein Delegat für alle Drawer-Zeilen; der Drawer-Inhalt wird bei Sprach-/
  // Wandmodus-Wechsel neu aufgebaut, daher keine Handler pro Zeile.
  $('#drawer-body').addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest('.mrow') as HTMLElement | null;
    if (!row) return;
    if (row.dataset.layer) {
      toggleLayer(row.dataset.layer as LayerId, row);
    } else if (row.dataset.mod) {
      const mod = MODULES.find((m) => m.key === row.dataset.mod);
      closeDrawer();
      mod?.open(currentTime());
    } else if (row.dataset.set === 'lang') {
      setLang(lang === 'de' ? 'en' : 'de'); // baut den Drawer neu auf
    } else if (row.dataset.set === 'wall') {
      closeDrawer();
      void toggleWall();
    } else if (row.dataset.set === 'about') {
      closeDrawer();
      openAbout(t);
    }
  });

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
    const el = e.target as HTMLElement;
    if (wall.isActive && !el.closest('#burger') && !el.closest('.drawer')) {
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
  // Flugzeuge nur bei aktiver Ansicht nachladen (§20, Rate-Limits beachten).
  window.setInterval(() => {
    if (bus.isEnabled('aircraft')) void fetchAircraft(location);
  }, 12_000);
}

void boot();

// PWA: Service Worker registrieren (Offline-Fähigkeit, §9/§35).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* PWA optional — die App läuft auch ohne Service Worker. */
    });
  });
}
