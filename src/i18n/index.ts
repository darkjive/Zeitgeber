/**
 * i18n — DE/EN im MVP (Spec §15). Struktur von Beginn an mehrsprachenfähig,
 * keine fest verdrahteten Zeichenketten. Ein Namensraum-freier flacher
 * Schlüsselraum genügt für den MVP; Pluralisierung/Formate über Intl.
 */

export type Lang = 'de' | 'en';

type Dict = Record<string, string>;

const de: Dict = {
  'app.title': 'Sun Clock',
  'app.tagline': '12 Uhr ist fast nie Mittag.',

  'object.sun': 'Sonne',
  'object.moon': 'Mond',

  'zone.day': 'Tag',
  'zone.goldenHour': 'Goldene Stunde',
  'zone.civil': 'Bürgerliche Dämmerung',
  'zone.nautical': 'Nautische Dämmerung',
  'zone.astronomical': 'Astronomische Dämmerung',
  'zone.night': 'Nacht',

  'moon.new': 'Neumond',
  'moon.waxingCrescent': 'Zunehmende Sichel',
  'moon.firstQuarter': 'Erstes Viertel',
  'moon.waxingGibbous': 'Zunehmender Mond',
  'moon.full': 'Vollmond',
  'moon.waningGibbous': 'Abnehmender Mond',
  'moon.lastQuarter': 'Letztes Viertel',
  'moon.waningCrescent': 'Abnehmende Sichel',

  'dial.legalTime': 'Gesetzliche Zeit',
  'dial.solarTime': 'Sonnenzeit',
  'dial.solarNoon': 'Sonnenhöchststand',
  'dial.sunrise': 'Aufgang',
  'dial.sunset': 'Untergang',
  'dial.elevation': 'Höhe',
  'dial.azimuth': 'Azimut',
  'dial.polarDay': 'Polartag – die Sonne geht nicht unter',
  'dial.polarNight': 'Polarnacht – die Sonne geht nicht auf',

  'offset.title': 'Sonnenzeit-Versatz',
  'offset.ahead': 'Deine Uhr geht der Sonne {m} voraus.',
  'offset.behind': 'Deine Uhr liegt {m} hinter der Sonne.',
  'offset.exact': 'Deine Uhr trifft die Sonne fast genau.',
  'offset.explain': 'Gesetzlicher Mittag um 12:00, tatsächlicher Sonnenhöchststand um {noon}.',

  'a11y.dialState': 'Sonne bei {elev}° Höhe, {dir}, {time}. {zone}.',

  'loc.current': 'Standort',
  'loc.useGps': 'Standort ermitteln',
  'loc.manual': 'Ort suchen',
  'loc.placeholder': 'Stadt eingeben …',
  'loc.denied': 'Kein Standort – bitte Ort manuell wählen. Die Uhr läuft weiter.',
  'loc.notFound': 'Ort nicht gefunden.',

  'onboard.skip': 'Überspringen',
  'onboard.next': 'Weiter',
  'onboard.start': 'Los geht’s',
  'onboard.1.title': 'Diese Uhr zeigt die echte Sonne',
  'onboard.1.body': 'Keine gewohnte Uhr — das Zifferblatt folgt dem tatsächlichen Sonnenstand an deinem Ort.',
  'onboard.2.title': '12 Uhr ist selten echter Mittag',
  'onboard.2.body': 'Die Sonne steht je nach Ort und Datum deutlich vor oder nach 12:00 am höchsten. Genau das zeigt diese Uhr.',
  'onboard.3.title': 'Dein Standort bestimmt dein Zifferblatt',
  'onboard.3.body': 'Aus deinem Ort berechnen wir Auf- und Untergang, Dämmerung und den Sonnenzeit-Versatz — alles lokal auf dem Gerät.',
  'onboard.4.title': 'Was du sehen wirst',
  'onboard.4.body': 'Sonne und Mond, die Dämmerungszonen als Farbringe und den Versatz zwischen deiner Uhr und der Sonne.',

  'wall.enter': 'Wandmodus',
  'wall.exit': 'Wandmodus beenden',
  'wall.hint': 'Tippen für die volle Oberfläche',

  'settings.language': 'Sprache',
  'unit.min': 'Min',
  'unit.hour': 'h',

  'dir.N': 'Norden',
  'dir.NE': 'Nordosten',
  'dir.E': 'Osten',
  'dir.SE': 'Südosten',
  'dir.S': 'Süden',
  'dir.SW': 'Südwesten',
  'dir.W': 'Westen',
  'dir.NW': 'Nordwesten',
};

const en: Dict = {
  'app.title': 'Sun Clock',
  'app.tagline': '12 o’clock is almost never noon.',

  'object.sun': 'Sun',
  'object.moon': 'Moon',

  'zone.day': 'Day',
  'zone.goldenHour': 'Golden hour',
  'zone.civil': 'Civil twilight',
  'zone.nautical': 'Nautical twilight',
  'zone.astronomical': 'Astronomical twilight',
  'zone.night': 'Night',

  'moon.new': 'New moon',
  'moon.waxingCrescent': 'Waxing crescent',
  'moon.firstQuarter': 'First quarter',
  'moon.waxingGibbous': 'Waxing gibbous',
  'moon.full': 'Full moon',
  'moon.waningGibbous': 'Waning gibbous',
  'moon.lastQuarter': 'Last quarter',
  'moon.waningCrescent': 'Waning crescent',

  'dial.legalTime': 'Clock time',
  'dial.solarTime': 'Solar time',
  'dial.solarNoon': 'Solar noon',
  'dial.sunrise': 'Sunrise',
  'dial.sunset': 'Sunset',
  'dial.elevation': 'Altitude',
  'dial.azimuth': 'Azimuth',
  'dial.polarDay': 'Polar day – the sun does not set',
  'dial.polarNight': 'Polar night – the sun does not rise',

  'offset.title': 'Solar-time offset',
  'offset.ahead': 'Your clock runs {m} ahead of the sun.',
  'offset.behind': 'Your clock runs {m} behind the sun.',
  'offset.exact': 'Your clock matches the sun almost exactly.',
  'offset.explain': 'Clock noon at 12:00, actual solar noon at {noon}.',

  'a11y.dialState': 'Sun at {elev}° altitude, {dir}, {time}. {zone}.',

  'loc.current': 'Location',
  'loc.useGps': 'Detect location',
  'loc.manual': 'Search place',
  'loc.placeholder': 'Enter a city …',
  'loc.denied': 'No location – please pick a place manually. The clock keeps running.',
  'loc.notFound': 'Place not found.',

  'onboard.skip': 'Skip',
  'onboard.next': 'Next',
  'onboard.start': 'Get started',
  'onboard.1.title': 'This clock shows the real sun',
  'onboard.1.body': 'Not an ordinary clock — the dial follows the actual position of the sun at your location.',
  'onboard.2.title': '12 o’clock is rarely real noon',
  'onboard.2.body': 'Depending on place and date, the sun peaks well before or after 12:00. That is exactly what this clock reveals.',
  'onboard.3.title': 'Your location shapes your dial',
  'onboard.3.body': 'From your place we compute sunrise, sunset, twilight and the solar-time offset — all locally on the device.',
  'onboard.4.title': 'What you will see',
  'onboard.4.body': 'Sun and moon, the twilight zones as coloured rings, and the offset between your clock and the sun.',

  'wall.enter': 'Wall mode',
  'wall.exit': 'Exit wall mode',
  'wall.hint': 'Tap for the full interface',

  'settings.language': 'Language',
  'unit.min': 'min',
  'unit.hour': 'h',

  'dir.N': 'north',
  'dir.NE': 'north-east',
  'dir.E': 'east',
  'dir.SE': 'south-east',
  'dir.S': 'south',
  'dir.SW': 'south-west',
  'dir.W': 'west',
  'dir.NW': 'north-west',
};

const DICTS: Record<Lang, Dict> = { de, en };

const STORAGE_KEY = 'sunclock.lang';

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === 'de' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'de';
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function createTranslator(lang: Lang) {
  const dict = DICTS[lang];
  return (key: string, params?: Record<string, string | number>): string => {
    let s = dict[key] ?? DICTS.de[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

export type Translator = ReturnType<typeof createTranslator>;

/** Kompasspunkt-Schlüssel aus einem Azimut. */
export function azimuthDirKey(azimuth: number): string {
  const dirs = ['dir.N', 'dir.NE', 'dir.E', 'dir.SE', 'dir.S', 'dir.SW', 'dir.W', 'dir.NW'];
  return dirs[Math.round(azimuth / 45) % 8];
}
