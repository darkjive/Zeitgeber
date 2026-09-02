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
  geolocationGranted,
  loadLocation,
  placeLabel,
  requestGeolocation,
  saveLocation,
  type LocationSource,
  type StoredLocation,
} from './core/location';
import type { GeoLocation } from './core/astro-engine';
import { sunTimes } from './core/astro-engine';
import { sunProvider } from './providers/sun';
import { moonProvider } from './providers/moon';
import { planetsProvider } from './providers/planets';
import { starsProvider } from './providers/stars';
import { deepSkyProvider } from './providers/deep-sky';
import { satellitesProvider } from './providers/satellites';
import { renderSatCard, refreshTles } from './features/satellites';
import { renderDial } from './views/dial';
import { renderObjectList } from './views/object-list';
import { renderSkyMap } from './views/sky-map';
import { buildOverlay, type DialOverlay, type OverlayId } from './core/dial-overlay';
import { showOnboarding, hasOnboarded, type OnboardProfile } from './features/onboarding';
import { WallMode } from './features/wallmode';
import { fetchWeather, observationRating, weatherCondition, type WeatherNow } from './features/weather';
import { fetchCivilWarnings, renderWarnCard } from './features/civil-warnings';
import { nearestKreis, type CivilWarning } from './core/civil-warnings';
import { renderViewToBlob, shareOrDownload } from './features/share';
import { openSolarYield } from './features/solar-yield';
import { openPrayerTimes } from './features/prayer-times';
import { openChronobiology, currentChrono } from './features/chronobiology';
import { renderOutdoorCard } from './features/outdoor';
import { openAbout } from './features/about';
import { renderWheelCard } from './features/wheel-of-year';
import { openGarden, openArchitecture } from './features/sun-hours-panels';
import { renderComfortCard, refreshComfortTemps } from './features/comfort';
import { renderWildlifeCard } from './features/wildlife';
import { renderDroneCard } from './features/drone';
import { renderMeteorCard } from './features/meteor-showers';
import { openKids } from './features/kids';
import { initReminders, openReminders, refreshReminderMeta, remindersEnabled } from './features/reminders';
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
let location: StoredLocation = loadLocation() ?? DEFAULT_LOCATION;

const bus = new ObjectBus();
bus.register(sunProvider);
bus.register(moonProvider);
bus.register(planetsProvider); // optional, standardmäßig deaktiviert (§7.4)
bus.register(starsProvider); // optional, standardmäßig deaktiviert (§7.4)
bus.register(deepSkyProvider); // optional, standardmäßig deaktiviert (§7.4)
bus.register(satellitesProvider); // optional, standardmäßig deaktiviert (§7.4)

const app = document.getElementById('app') as HTMLElement;
let wall: WallMode;
type ViewId = 'dial' | 'list' | 'map';
type LayerId = 'planets' | 'stars' | 'deep-sky' | 'satellites';
let currentView: ViewId = 'dial';
let weather: WeatherNow | null = null;
let civilWarnings: CivilWarning[] = [];

// Zeitreise (§24): null = Live (jetzt), sonst eingefrorener Zeitpunkt.
let frozenTime: Date | null = null;
const currentTime = (): Date => frozenTime ?? new Date();
const rerender = (): void => render(currentTime());

// Ans Zifferblatt geheftetes Modul-Overlay (§22, §29). Persistiert, Default aus.
const OVERLAY_KEY = 'zeitgeber.dialOverlay';
const loadOverlay = (): OverlayId | null => {
  try {
    return localStorage.getItem(OVERLAY_KEY) === 'outdoor' ? 'outdoor' : null;
  } catch {
    return null;
  }
};
let dialOverlay: OverlayId | null = loadOverlay();

function setDialOverlay(id: OverlayId | null): void {
  dialOverlay = id;
  try {
    if (id) localStorage.setItem(OVERLAY_KEY, id);
    else localStorage.removeItem(OVERLAY_KEY);
  } catch {
    /* ignore */
  }
  rerender();
}

// Layout: ab 900px automatisch zweispaltig (Zifferblatt Mitte, Module
// links/rechts), darunter automatisch gestapelt wie mobil — kein manueller
// Umschalter mehr.
const DESKTOP_LAYOUT_QUERY = window.matchMedia('(min-width: 900px)');

function applyDesktopLayout(): void {
  const columns = DESKTOP_LAYOUT_QUERY.matches;
  document.documentElement.dataset.desktopLayout = columns ? 'columns' : 'stacked';
  const target = columns ? $('.topbar__mid') : $('.controls');
  target.appendChild($('.seg'));
}

DESKTOP_LAYOUT_QUERY.addEventListener('change', applyDesktopLayout);

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
];

const LAYERS_KEY = 'zeitgeber.layers';
const loadEnabledLayers = (): LayerId[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYERS_KEY) ?? '[]') as string[];
    return raw.filter((k): k is LayerId => LAYERS.some((l) => l.id === k));
  } catch {
    return [];
  }
};

function saveEnabledLayers(): void {
  try {
    localStorage.setItem(LAYERS_KEY, JSON.stringify(LAYERS.filter((l) => bus.isEnabled(l.id)).map((l) => l.id)));
  } catch {
    /* Auswahl ist Komfort, kein Zustand, ohne den die Uhr scheitert. */
  }
}

/** Schaltet eine Himmels-Ebene an/aus und persistiert (§7.4) — analog zu setInfoModuleEnabled. */
function setLayerEnabled(id: LayerId, on: boolean): void {
  bus.setEnabled(id, on);
  saveEnabledLayers();
  // Frische Netzdaten nur beim Einschalten (§20).
  if (on && id === 'satellites') void refreshTles().then(() => rerender());
}

for (const id of loadEnabledLayers()) bus.setEnabled(id, true);

interface ToolModuleDef {
  key: string;
  labelKey: string;
  icon: IconName;
  color: string;
  open: (now: Date) => void;
}

// Werkzeuge — Formulare/Rechner, öffnen als Bottom-Sheet, auf Zuruf (§7.4).
const TOOL_MODULES: ToolModuleDef[] = [
  { key: 'chrono', labelKey: 'chrono.button', icon: 'moon', color: '#8D6FE7', open: (now) => openChronobiology(solarOffset(now, location).minutes, location, now, t, () => rerender()) },
  { key: 'solar', labelKey: 'solar.button', icon: 'zap', color: '#E0A93C', open: (now) => openSolarYield(location, now, t) },
  { key: 'arch', labelKey: 'arch.button', icon: 'building-2', color: '#7C93B0', open: (now) => openArchitecture(location, now, t) },
  { key: 'garden', labelKey: 'garden.button', icon: 'sprout', color: '#5FA968', open: (now) => openGarden(location, now, t) },
  { key: 'prayer', labelKey: 'prayer.button', icon: 'moon-star', color: '#8FA6D8', open: (now) => openPrayerTimes(location, now, t) },
  { key: 'kids', labelKey: 'kids.button', icon: 'baby', color: '#E56B9B', open: (now) => openKids(location, now, t) },
];

type InfoModuleKey = 'comfort' | 'outdoor' | 'wildlife' | 'meteor' | 'drone' | 'wheel' | 'sat' | 'warn';

interface InfoModuleDef {
  key: InfoModuleKey;
  labelKey: string;
  titleKey: string;
  icon: IconName;
  color: string;
  /** Themenspalte im Breitbild-Layout: links = Vor-Ort/Umwelt, rechts = Himmel/Position (§9). */
  side: 'left' | 'right';
  render: (now: Date) => string;
  /** Einmaliges Nachladen von Netzdaten, wenn die Karte eingeschaltet wird (§20). */
  onEnable?: () => void;
}

// Info-Module — reine Anzeige, bleiben als Dauer-Karte im Content-Bereich
// sichtbar, solange eingeschaltet (§7.4, persistiert).
const INFO_MODULES: InfoModuleDef[] = [
  {
    key: 'comfort',
    labelKey: 'comfort.button',
    titleKey: 'comfort.title',
    icon: 'thermometer-sun',
    color: '#E8794A',
    side: 'left',
    render: (now) => renderComfortCard(location, now, t),
    onEnable: () => void refreshComfortTemps(location).then(() => rerender()),
  },
  {
    key: 'outdoor',
    labelKey: 'outdoor.button',
    titleKey: 'outdoor.title',
    icon: 'compass',
    color: '#4F9E8C',
    side: 'left',
    render: (now) => renderOutdoorCard(location, now, t, { pinned: dialOverlay === 'outdoor', onPin: (on: boolean) => setDialOverlay(on ? 'outdoor' : null) }),
  },
  { key: 'wildlife', labelKey: 'wildlife.button', titleKey: 'wildlife.title', icon: 'bird', color: '#C98A5E', side: 'left', render: (now) => renderWildlifeCard(location, now, t) },
  {
    key: 'warn',
    labelKey: 'warn.button',
    titleKey: 'warn.title',
    icon: 'triangle-alert',
    color: '#C94F3D',
    side: 'left',
    render: () => renderWarnCard(civilWarnings, nearestKreis(location)?.name ?? null, lang, t),
  },
  { key: 'drone', labelKey: 'drone.button', titleKey: 'drone.title', icon: 'radar', color: '#5AA0D6', side: 'right', render: (now) => renderDroneCard(location, now, t) },
  { key: 'wheel', labelKey: 'wheel.button', titleKey: 'wheel.title', icon: 'orbit', color: '#C77FA8', side: 'right', render: (now) => renderWheelCard(now, t) },
  {
    key: 'sat',
    labelKey: 'sat.button',
    titleKey: 'sat.title',
    icon: 'satellite',
    color: '#9AA0AD',
    side: 'right',
    render: (now) => renderSatCard(location, now, t),
    onEnable: () => void refreshTles().then(() => rerender()),
  },
  { key: 'meteor', labelKey: 'meteor.button', titleKey: 'meteor.title', icon: 'sparkles', color: '#C9A94B', side: 'right', render: (now) => renderMeteorCard(location, now, t) },
];

const INFO_MODULES_KEY = 'zeitgeber.infoModules';
const loadEnabledInfoModules = (): Set<InfoModuleKey> => {
  try {
    const raw = JSON.parse(localStorage.getItem(INFO_MODULES_KEY) ?? '[]') as string[];
    return new Set(raw.filter((k): k is InfoModuleKey => INFO_MODULES.some((m) => m.key === k)));
  } catch {
    return new Set();
  }
};
let enabledInfoModules: Set<InfoModuleKey> = loadEnabledInfoModules();

function saveEnabledInfoModules(): void {
  try {
    localStorage.setItem(INFO_MODULES_KEY, JSON.stringify([...enabledInfoModules]));
  } catch {
    /* Auswahl ist Komfort, kein Zustand, ohne den die Uhr scheitert. */
  }
}

/** Schaltet eine Info-Karte an/aus, persistiert und lädt bei Bedarf nach (§20). */
function setInfoModuleEnabled(key: InfoModuleKey, on: boolean): void {
  if (on === enabledInfoModules.has(key)) return;
  if (on) enabledInfoModules.add(key);
  else enabledInfoModules.delete(key);
  saveEnabledInfoModules();
  if (on) INFO_MODULES.find((m) => m.key === key)?.onEnable?.();
}

function toggleInfoModule(key: InfoModuleKey, row: HTMLElement): void {
  const on = !enabledInfoModules.has(key);
  setInfoModuleEnabled(key, on);
  row.setAttribute('aria-checked', String(on));
  rerender();
}

// Bedürfnis-Profil aus dem Onboarding (§14-Erweiterung) → passende Module vorauswählen.
// solar/sleep enthalten zusätzlich ein Werkzeug ohne An/Aus-Zustand (TOOL_MODULES) —
// statt es zu „aktivieren“, öffnen wir es einmalig als Kennenlern-Moment.
function applyOnboardProfile(profile: OnboardProfile | null): void {
  if (!profile) return;
  switch (profile) {
    case 'outdoor':
      (['outdoor', 'wildlife', 'comfort'] as const).forEach((k) => setInfoModuleEnabled(k, true));
      break;
    case 'space':
      // 'sat' lädt die TLEs bereits über sein onEnable (§20) — kein zweiter Fetch nötig.
      (['sat', 'meteor', 'wheel'] as const).forEach((k) => setInfoModuleEnabled(k, true));
      (['stars', 'planets', 'deep-sky', 'satellites'] as const).forEach((id) => setLayerEnabled(id, true));
      break;
    case 'solar':
      (['comfort', 'wheel'] as const).forEach((k) => setInfoModuleEnabled(k, true));
      TOOL_MODULES.find((m) => m.key === 'solar')?.open(currentTime());
      break;
    case 'sleep':
      (['comfort', 'wildlife'] as const).forEach((k) => setInfoModuleEnabled(k, true));
      TOOL_MODULES.find((m) => m.key === 'chrono')?.open(currentTime());
      break;
  }
  buildDrawer(); // Menü zeigt sonst noch den vor-onboarding Stand (§11)
  rerender();
}

// --- App-Gerüst -------------------------------------------------------------

app.innerHTML = `
  <div class="frame">
    <header class="topbar">
      <div class="topbar__row">
        <div class="brand">
          <span class="brand__mark">${icon('sun')}</span>
          <div>
            <div class="brand__name" data-i18n="app.title"></div>
            <div class="brand__tag" data-i18n="app.tagline"></div>
          </div>
        </div>
        <div class="topbar__mid"></div>
        <div class="topbar__actions">
          <button class="iconbtn iconbtn--warn" id="warn-badge" aria-label="Warnungen" hidden>${icon('triangle-alert')}</button>
          <button class="chip" id="t-share" data-i18n="share.button"></button>
          <button class="iconbtn" id="burger" aria-label="Menü" aria-haspopup="dialog" aria-expanded="false">${icon('menu')}</button>
        </div>
      </div>

      <div class="timebar">
        <div class="stepper">
          <button class="chip chip--sm" id="t-day-back" data-i18n="time.dayBack"></button>
          <button class="chip chip--sm" id="t-hr-back" data-i18n="time.hourBack"></button>
          <button class="chip chip--sm" id="t-hr-fwd" data-i18n="time.hourFwd"></button>
          <button class="chip chip--sm" id="t-day-fwd" data-i18n="time.dayFwd"></button>
        </div>
        <input class="t-input" id="t-input" type="datetime-local" aria-label="Zeitpunkt" />
        <button class="chip" id="t-now" data-i18n="time.now"></button>
      </div>
    </header>

    <div class="controls">
      <div class="seg" role="tablist" aria-label="Ansicht">
        <button class="seg__btn is-active" id="view-dial" role="tab" aria-selected="true" aria-controls="view-wrap" data-i18n="view.dial"></button>
        <button class="seg__btn" id="view-map" role="tab" aria-selected="false" aria-controls="view-wrap" data-i18n="view.map"></button>
        <button class="seg__btn" id="view-list" role="tab" aria-selected="false" aria-controls="view-wrap" data-i18n="view.list"></button>
      </div>
    </div>

    <main class="stage">
      <header class="locbar">
        <div class="locbar__row">
          <form class="locbar__cell loc" id="loc-search">
            <span class="locbar__k loc__pin">${icon('map-pin')}</span>
            <input class="locbar__v" id="loc-input" type="text" autocomplete="off" />
            <button class="loc__submit" type="submit" data-i18n="loc.manual"></button>
            <span class="locbar__sub" id="loc-msg" hidden></span>
          </form>

          <div class="locbar__cell" id="weather" hidden>
            <span class="locbar__k">${icon('eye')}<span class="sr-only" data-i18n="weather.title"></span></span>
            <span class="locbar__v" id="weather-badge">–</span>
            <span class="locbar__sub" id="weather-sub"></span>
          </div>

          <div class="locbar__cell" id="weather-now" hidden>
            <span class="locbar__k" id="weather-now-icon"></span>
            <span class="locbar__v" id="weather-now-temp">–</span>
            <span class="locbar__sub" id="weather-now-label"></span>
          </div>
        </div>
      </header>

      <div class="view-wrap" id="view-wrap"></div>

      <div class="dial-tip" id="dial-tip" role="tooltip" hidden></div>

      <div class="overlay-key" id="overlay-key" hidden></div>

      <section class="readout" id="readout" aria-live="polite">
        <div class="readout__legal">
          <span class="readout__label">${icon('clock')}<span class="sr-only" data-i18n="dial.legalTime"></span></span>
          <span class="readout__time" id="legal-time">–</span>
        </div>
        <div class="readout__solar">
          <span class="readout__label">${icon('sun')}<span class="sr-only" data-i18n="dial.solarTime"></span></span>
          <span class="readout__solar-time" id="solar-time">–</span>
          <span class="delta" id="delta">–</span>
        </div>
        <p class="offset" id="offset-line"></p>
        <p class="offset__explain" id="offset-explain"></p>
      </section>

      <section class="sky">
        <div class="sky__cell">
          <span class="sky__k">${icon('sun')}<span class="sr-only" data-i18n="object.sun"></span></span>
          <span class="sky__v" id="sun-elev">–</span>
          <span class="sky__sub" id="sun-dir">–</span>
        </div>
        <div class="sky__cell">
          <span class="sky__k">${icon('moon')}<span class="sr-only" data-i18n="object.moon"></span></span>
          <span class="sky__v" id="moon-phase">–</span>
          <span class="sky__sub" id="moon-illum">–</span>
        </div>
        <div class="sky__cell">
          <span class="sky__k">${icon('sunrise')}<span class="sr-only" data-i18n="dial.sunrise"></span></span>
          <span class="sky__v" id="sunrise">–</span>
          <span class="sky__k">${icon('sunset')}<span class="sr-only" data-i18n="dial.sunset"></span></span>
          <span class="sky__sub" id="sunset">–</span>
        </div>
      </section>
    </main>

    <aside class="side side--left">
      <div class="info-cards" id="info-cards-left" hidden></div>
    </aside>

    <aside class="side side--right">
      <div class="info-cards" id="info-cards-right" hidden></div>
    </aside>
  </div>

  <div class="drawer" id="drawer" hidden>
    <div class="drawer__scrim" id="drawer-scrim"></div>
    <aside class="drawer__panel" id="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
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
          <h3 class="drawer__h" data-i18n="menu.tools"></h3>
          <div class="mlist" id="drawer-tools"></div>
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
  renderWarnBadge();
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

  // Info-Module — Kippschalter, Karte erscheint/verschwindet im Content-Bereich.
  $('#drawer-modules').innerHTML = INFO_MODULES.map(
    (m) => `
    <button class="mrow" data-info="${m.key}" role="switch" aria-checked="${enabledInfoModules.has(m.key)}">
      ${iconSpan(m.icon, m.color)}
      <span class="mrow__label">${t(m.labelKey)}</span>
      <span class="mrow__switch" aria-hidden="true"></span>
    </button>`,
  ).join('');

  // Werkzeuge — öffnen jeweils ein Bottom-Sheet.
  $('#drawer-tools').innerHTML = TOOL_MODULES.map(
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
    <button class="mrow" data-set="reminders">
      ${iconSpan('bell', '#E0A93C')}
      <span class="mrow__label">${t('remind.button')}</span>
      <span class="mrow__val">${remindersEnabled() ? t('remind.stateOn') : t('remind.stateOff')}</span>
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
  const { palette, nightness, sky } = paletteForElevation(sun?.horizontal.elevation ?? -90);
  applyPalette(palette, sky);
  wall?.setNightness(nightness);

  // Ansicht (Achse B): Zifferblatt, Himmelskarte oder Objektliste
  const wrap = $('#view-wrap');
  if (currentView === 'dial') {
    const chr = currentChrono();
    const chrono = chr ? { idealOnsetMin: chr.idealOnsetMin, idealWakeMin: chr.idealWakeMin, msfScMin: chr.msfScMin } : null;
    const overlay = buildOverlay(dialOverlay, now, location);
    const { svg } = renderDial({ time: now, location, tzOffsetMinutes: tz, objects, t, chrono, overlay });
    wrap.replaceChildren(svg);
    renderOverlayKey(overlay);
    $('#readout').hidden = false;
  } else if (currentView === 'map') {
    const { svg } = renderSkyMap(objects, t);
    wrap.replaceChildren(svg);
    renderOverlayKey(null);
    $('#readout').hidden = false;
  } else {
    wrap.replaceChildren(renderObjectList(objects, t));
    renderOverlayKey(null);
    $('#readout').hidden = true;
  }

  // Zeit-Readout
  const legal = fmtTime(now, true);
  $('#legal-time').innerHTML = `${legal.slice(0, -2)}<span class="readout__sec">${legal.slice(-2)}</span>`;

  const off = solarOffset(now, location);
  const solarClock = new Date(now.getTime() - off.minutes * 60_000);
  $('#solar-time').textContent = fmtTime(solarClock);
  $('#delta').textContent = Math.abs(off.minutes) < 2 ? '—' : `Δ ${fmtDuration(off.minutes)}`;

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

  renderLocbar();

  renderWeather(moon);
  renderInfoCards(now);
  updateTimebar(now);
}

/** Dauer-Karten der eingeschalteten Info-Module (§7.4) — reine Ableitung aus
 * bereits vorhandenen/gecachten Daten, kein Netz-Zugriff pro Tick. Zwei
 * Container nach Themenspalte (§9), statt einer einzelnen Liste. */
function renderInfoCards(now: Date): void {
  const cardHtml = (m: InfoModuleDef): string => `
    <section class="info-card" data-info-card="${m.key}">
      <header class="info-card__head">
        <span class="info-card__ic" style="color:${m.color}">${icon(m.icon)}</span>
        <span class="info-card__title">${t(m.titleKey)}</span>
      </header>
      <div class="info-card__body">${m.render(now)}</div>
    </section>`;

  for (const side of ['left', 'right'] as const) {
    const active = INFO_MODULES.filter((m) => m.side === side && enabledInfoModules.has(m.key));
    const container = $(`#info-cards-${side}`);
    container.hidden = active.length === 0;
    container.innerHTML = active.map(cardHtml).join('');
  }
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
  const nowPanel = $('#weather-now');
  const panel = $('#weather');
  if (!weather) {
    nowPanel.hidden = true;
    panel.hidden = true;
    return;
  }
  nowPanel.hidden = false;
  const cond = weatherCondition(weather.weatherCode, weather.isDay);
  $('#weather-now-icon').innerHTML = icon(cond.icon);
  $('#weather-now-temp').textContent = `${Math.round(weather.temperatureC)}°`;
  $('#weather-now-label').textContent = t(cond.labelKey);

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

function renderOverlayKey(overlay: DialOverlay | null): void {
  const box = $('#overlay-key');
  if (!overlay) {
    box.hidden = true;
    box.replaceChildren();
    return;
  }
  // Legende: Bögen und Marker nach Label zusammenfassen (gleiche Farbe/Bedeutung).
  const seen = new Set<string>();
  const items: { color: string; label: string; hollow: boolean }[] = [];
  for (const a of overlay.arcs) {
    if (!a.from || !a.to || seen.has(a.labelKey)) continue;
    seen.add(a.labelKey);
    items.push({ color: a.color, label: t(a.labelKey), hollow: false });
  }
  for (const m of overlay.markers) {
    if (!m.at || seen.has(m.labelKey)) continue;
    seen.add(m.labelKey);
    items.push({ color: m.color, label: t(m.labelKey), hollow: !!m.hollow });
  }
  box.replaceChildren();
  for (const it of items) {
    const chip = document.createElement('span');
    chip.className = 'overlay-key__item';
    const sw = document.createElement('span');
    sw.className = it.hollow ? 'overlay-key__dot overlay-key__dot--hollow' : 'overlay-key__dot';
    sw.style.setProperty('--k', it.color);
    chip.append(sw, document.createTextNode(it.label));
    box.appendChild(chip);
  }
  box.hidden = items.length === 0;
}

async function refreshWeather(): Promise<void> {
  weather = await fetchWeather(location);
  renderWeather(bus.collect({ time: currentTime(), location }).find((o) => o.kind === 'moon'));
}

function renderWarnBadge(): void {
  const btn = $('#warn-badge');
  btn.hidden = civilWarnings.length === 0;
  btn.setAttribute('aria-label', t('warn.badge', { n: civilWarnings.length }));
}

async function refreshCivilWarnings(): Promise<void> {
  civilWarnings = await fetchCivilWarnings(location);
  renderWarnBadge();
}

async function exportCurrentView(): Promise<void> {
  const svg = $('#view-wrap').querySelector('svg');
  if (!svg) return; // Listenansicht hat kein Bild
  const now = currentTime();
  const css = getComputedStyle(document.documentElement);
  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const place = placeLabel(location);
  try {
    const blob = await renderViewToBlob(svg as SVGElement, {
      title: t('app.title'),
      caption: `${fmt.format(now)} · ${place}`,
      brand: t('share.brand'),
      bg: css.getPropertyValue('--bg').trim() || '#0B0D12',
      text: css.getPropertyValue('--text').trim() || '#E8E8E8',
      textDim: css.getPropertyValue('--text-dim').trim() || '#8A8F9C',
    });
    await shareOrDownload(blob, `zeitgeber-${toLocalInputValue(now).replace(/[:T-]/g, '')}.png`, t('app.title'));
  } catch (err) {
    console.warn('Export fehlgeschlagen:', err);
  }
}

function applyPalette(
  p: ReturnType<typeof paletteForElevation>['palette'],
  sky: ReturnType<typeof paletteForElevation>['sky'],
): void {
  const r = document.documentElement.style;
  r.setProperty('--bg', p.bg);
  r.setProperty('--bg-top', sky.top);
  r.setProperty('--bg-bottom', sky.bottom);
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

/**
 * Standortleiste. Ein bloss angenommener Ort wird sichtbar als solcher
 * ausgewiesen — sonst könnte der Nutzer nicht erkennen, ob die angezeigten
 * Zeiten überhaupt für ihn gelten. Das Eingabefeld dient zugleich als Anzeige
 * und als manuelle Ortssuche (§10) — die GPS-Abfrage selbst läuft nur noch im
 * Onboarding.
 */
function renderLocbar(): void {
  const guessed = location.source === 'default';
  const form = $('#loc-search');
  form.classList.toggle('is-guess', guessed);
  const input = $('#loc-input') as HTMLInputElement;
  // Tippt der Nutzer gerade oder klickt gleich auf "Ort suchen", darf das
  // Sekundentakt-Rerender den Eingabewert nicht überschreiben — sonst reißt
  // ein Klick auf den Button (der den Fokus vom Feld nimmt) die Eingabe weg,
  // bevor die Fehlermeldung überhaupt gelesen werden kann.
  if (!form.contains(document.activeElement)) input.value = guessed ? '' : placeLabel(location);
}

/** Nur die Koordinaten wandern in den Zustand — der Name wird stets neu abgeleitet. */
function setLocation(loc: GeoLocation, source: LocationSource): void {
  location = { latitude: loc.latitude, longitude: loc.longitude, source };
  saveLocation(location);
  rerender();
  void refreshWeather(); // §28: Wetter am neuen Ort neu holen
  void refreshCivilWarnings(); // Warnungen sind kreisgebunden, am neuen Ort neu holen
  if (enabledInfoModules.has('comfort')) void refreshComfortTemps(location).then(() => rerender()); // Temperaturprognose ist ortsgebunden
  void refreshReminderMeta(); // §reminders: Push-Abo am neuen Ort aktualisieren
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
  setLayerEnabled(id, on);
  row.setAttribute('aria-checked', String(on));
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

  // Zifferblatt-Tooltip: Beschriftung für Planeten, Sonne/Mond, Dämmerungs-
  // zonen, Sonnenhöchststand/gesetzlichen Mittag, Analog-Zeiger und
  // Schlaffenster steht nicht dauerhaft am Ring (überlagert sich sonst mit
  // Himmelsrichtungen/anderen Markern), sondern erscheint nur bei Hover/Tap.
  // Delegation auf #view-wrap, weil das SVG bei jedem Tick neu aufgebaut wird.
  const dialTip = $('#dial-tip');
  let tipHideTimer: number | undefined;
  const showTip = (target: Element): void => {
    const name = target.getAttribute('data-name');
    if (!name) return;
    const rect = target.getBoundingClientRect();
    dialTip.textContent = name;
    dialTip.style.left = `${rect.left + rect.width / 2}px`;
    dialTip.style.top = `${rect.top}px`;
    dialTip.hidden = false;
  };
  const hideTip = (): void => {
    dialTip.hidden = true;
  };
  const viewWrap = $('#view-wrap');
  viewWrap.addEventListener('mouseover', (e) => {
    const hinted = (e.target as Element).closest('.dial__hint');
    if (hinted) showTip(hinted);
  });
  viewWrap.addEventListener('mouseout', (e) => {
    if ((e.target as Element).closest('.dial__hint')) hideTip();
  });
  viewWrap.addEventListener('click', (e) => {
    const hinted = (e.target as Element).closest('.dial__hint');
    if (!hinted) return;
    e.stopPropagation();
    window.clearTimeout(tipHideTimer);
    showTip(hinted);
    tipHideTimer = window.setTimeout(hideTip, 2500);
  });
  document.addEventListener('click', hideTip);

  // Burger-Menü + Drawer (§11)
  $('#burger').addEventListener('click', openDrawer);
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-scrim').addEventListener('click', closeDrawer);
  $('#warn-badge').addEventListener('click', () => {
    if (!enabledInfoModules.has('warn')) {
      setInfoModuleEnabled('warn', true);
      rerender();
    }
    $('#info-cards-left').querySelector('[data-info-card="warn"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
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
    } else if (row.dataset.info) {
      toggleInfoModule(row.dataset.info as InfoModuleKey, row);
    } else if (row.dataset.mod) {
      const mod = TOOL_MODULES.find((m) => m.key === row.dataset.mod);
      closeDrawer();
      mod?.open(currentTime());
    } else if (row.dataset.set === 'lang') {
      setLang(lang === 'de' ? 'en' : 'de'); // baut den Drawer neu auf
    } else if (row.dataset.set === 'reminders') {
      closeDrawer();
      openReminders(t, () => buildDrawer());
    } else if (row.dataset.set === 'wall') {
      closeDrawer();
      void toggleWall();
    } else if (row.dataset.set === 'about') {
      closeDrawer();
      openAbout(t);
    }
  });

  // Outdoor-Karte wird bei jedem Tick neu gerendert — der Pin-Toggle meldet
  // sich daher per Delegation statt per eigenem Listener (§7.4).
  $('#info-cards-left').addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('[data-action="outdoor-pin"]') as HTMLElement | null;
    if (!el) return;
    setDialOverlay(el.getAttribute('aria-checked') === 'true' ? null : 'outdoor');
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

  search.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = findCity(input.value);
    if (city) {
      msg.hidden = true;
      setLocation(city, 'manual');
      // Feld zeigt danach den aufgelösten Namen (§renderLocbar), nicht die Sucheingabe —
      // egal ob per Enter (Fokus im Feld) oder Klick auf den Button (Fokus dort) abgeschickt.
      (document.activeElement as HTMLElement | null)?.blur();
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

/**
 * Steht die Standortfreigabe bereits, wird sie beim Start still genutzt: eine
 * einmal erteilte Erlaubnis soll nicht ungenutzt liegen bleiben, während die
 * Uhr mit einem geratenen Ort rechnet. Ohne Freigabe wird bewusst kein Dialog
 * ausgelöst — der Berechtigungsdialog gehört an den Standort-Knopf, nicht vor
 * den ersten Blick auf die Uhr. Eine manuell gewählte Stadt bleibt unangetastet.
 */
async function adoptGpsIfAllowed(): Promise<void> {
  if (location.source === 'manual') return;
  if (!(await geolocationGranted())) return;
  try {
    setLocation(await requestGeolocation(), 'gps');
  } catch {
    /* §10: Die Uhr läuft mit dem bisherigen Ort weiter. */
  }
}

async function boot(): Promise<void> {
  applyDesktopLayout();
  wall = new WallMode(app, () => applyStaticI18n());
  wireEvents();
  applyStaticI18n();
  rerender();
  await adoptGpsIfAllowed();
  void refreshWeather();
  void refreshCivilWarnings();
  // Info-Karten mit Netzbezug: nur nachladen, wenn beim Start bereits eingeschaltet (§20).
  if (enabledInfoModules.has('sat')) void refreshTles().then(() => rerender());
  if (enabledInfoModules.has('comfort')) void refreshComfortTemps(location).then(() => rerender());
  // Erinnerungen (§reminders): läuft nur, wenn zuvor aktiviert.
  initReminders({ getLocation: () => location, getTranslator: () => t, getLang: () => lang });

  if (!hasOnboarded()) {
    applyOnboardProfile(await showOnboarding(t, (geo) => setLocation(geo, 'gps')));
  }

  // Sekundentakt für den Zeiger; Ephemeriden nur bei Bedarf teuer (§8).
  window.setInterval(() => rerender(), 1000);
  // Wetter deutlich seltener aktualisieren (§8, §28).
  window.setInterval(() => void refreshWeather(), 15 * 60_000);
  window.setInterval(() => void refreshCivilWarnings(), 15 * 60_000);
  // Info-Karten mit Netzbezug ebenso — nur solange eingeschaltet (§20).
  window.setInterval(() => {
    if (enabledInfoModules.has('sat')) void refreshTles().then(() => rerender());
    if (enabledInfoModules.has('comfort')) void refreshComfortTemps(location).then(() => rerender());
  }, 15 * 60_000);
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
