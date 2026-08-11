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
  'object.mercury': 'Merkur',
  'object.venus': 'Venus',
  'object.mars': 'Mars',
  'object.jupiter': 'Jupiter',
  'object.saturn': 'Saturn',
  'object.uranus': 'Uranus',
  'object.neptune': 'Neptun',
  'object.star': 'Stern',

  'layer.planets': 'Planeten',
  'layer.stars': 'Sterne',
  'view.dial': 'Zifferblatt',
  'view.list': 'Liste',
  'view.map': 'Karte',

  'time.now': 'Jetzt',
  'time.travel': 'Zeitreise',
  'time.dayBack': '−1 T',
  'time.hourBack': '−1 h',
  'time.hourFwd': '+1 h',
  'time.dayFwd': '+1 T',
  'share.button': 'Teilen',
  'share.brand': 'Sun Clock · 12 Uhr ist fast nie Mittag',

  'solar.button': 'Solar',
  'solar.title': 'Solarertrag (Geometrie)',
  'solar.azimuth': 'Ausrichtung',
  'solar.tilt': 'Neigung',
  'solar.window': 'Ertragsfenster',
  'solar.peak': 'Bestes Zeitfenster',
  'solar.summerWinter': 'Sommer/Winter',
  'solar.note': 'Reine Geometrie- und Einstrahlungsberechnung, keine Ertragsangabe in kWh (hängt von Modul, Wechselrichter, Verschmutzung und Wetter ab).',
  'solar.close': 'Schließen',

  'prayer.button': 'Gebetszeiten',
  'prayer.title': 'Gebetszeiten',
  'prayer.method': 'Berechnungsmethode',
  'prayer.madhab': 'Asr-Rechtsschule',
  'prayer.standard': 'Standard (Schāfiʿī u. a.)',
  'prayer.hanafi': 'Hanafitisch',
  'prayer.fajr': 'Fadschr',
  'prayer.sunrise': 'Schurūq (Aufgang)',
  'prayer.dhuhr': 'Dhuhr',
  'prayer.asr': 'ʿAsr',
  'prayer.maghrib': 'Maghrib',
  'prayer.isha': 'ʿIschāʾ',
  'prayer.ramadan': 'Ramadan: Suhur bis {suhur}, Iftar um {iftar}.',
  'prayer.sourceLine': 'Methode: {source}.',
  'prayer.disclaimer': 'Reine Zeitangabe, keine Deutung. Berechnete Zeiten vor verbindlicher Nutzung mit einem lokalen Gebetszeitenplan abgleichen.',
  'prayer.close': 'Schließen',

  'chrono.button': 'Rhythmus',
  'chrono.title': 'Dein Rhythmus',
  'chrono.intro': 'Vier Zeitangaben genügen. Alles bleibt lokal auf dem Gerät.',
  'chrono.onset': 'Einschlafen',
  'chrono.wake': 'Aufwachen',
  'chrono.workdays': 'Arbeitstage',
  'chrono.freedays': 'Freie Tage',
  'chrono.chronotype': 'Chronotyp',
  'chrono.socialJetlag': 'Sozialer Jetlag',
  'chrono.combined': 'Gesamtversatz',
  'chrono.explain': 'Sonnenzeit-Versatz {solar} und sozialer Jetlag {sjl} addieren sich. Dein Körper-Schlaffenster liegt bei {ideal}.',
  'chrono.disclaimer': 'Beschreibende Werte nach dem Munich Chronotype Questionnaire (Roenneberg/Wittmann). Keine Diagnose, keine Empfehlung.',
  'chrono.delete': 'Löschen',
  'chrono.export': 'Export',
  'chrono.close': 'Schließen',
  'chrono.type.extremeEarly': 'Extremer Frühtyp',
  'chrono.type.early': 'Frühtyp',
  'chrono.type.slightEarly': 'Leichter Frühtyp',
  'chrono.type.intermediate': 'Normaltyp',
  'chrono.type.slightLate': 'Leichter Spättyp',
  'chrono.type.late': 'Spättyp',
  'chrono.type.extremeLate': 'Extremer Spättyp',

  'outdoor.button': 'Outdoor',
  'outdoor.title': 'Outdoor & Survival',
  'outdoor.usableLight': 'Restlicht',
  'outdoor.remaining': 'Noch {dur} brauchbares Licht',
  'outdoor.dark': 'Kein Tageslicht mehr',
  'outdoor.polarDay': 'Polartag – durchgehend hell',
  'outdoor.polarNight': 'Polarnacht – kein Tageslicht',
  'outdoor.morningGolden': 'Goldene Stunde morgens',
  'outdoor.eveningGolden': 'Goldene Stunde abends',
  'outdoor.morningBlue': 'Blaue Stunde morgens',
  'outdoor.eveningBlue': 'Blaue Stunde abends',
  'outdoor.moonlight': 'Mondlicht',
  'outdoor.moon.dark': 'dunkel',
  'outdoor.moon.dim': 'gedämpft',
  'outdoor.moon.bright': 'hell',
  'outdoor.direction': 'Himmelsrichtung',
  'outdoor.sunIn': 'Sonne im',
  'outdoor.sunDown': 'Sonne unter dem Horizont',
  'outdoor.note': 'Alle Werte funktionieren offline und ohne Kompass. Die Himmelsrichtung ergibt sich aus dem Sonnenstand.',
  'outdoor.close': 'Schließen',

  'map.a11y': 'Himmelskarte: {count} Objekte über dem Horizont, darunter {objects}. Hellster Stern: {star}.',

  'list.empty': 'Gerade ist nichts über dem Horizont.',
  'list.optics': 'nur mit Optik',

  'weather.title': 'Beobachtung',
  'weather.good': 'gut',
  'weather.fair': 'mäßig',
  'weather.poor': 'schlecht',
  'weather.clouds': 'Bewölkung',
  'weather.stamp': 'Stand {time}',
  'weather.offline': 'Wetter offline',

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
  'object.mercury': 'Mercury',
  'object.venus': 'Venus',
  'object.mars': 'Mars',
  'object.jupiter': 'Jupiter',
  'object.saturn': 'Saturn',
  'object.uranus': 'Uranus',
  'object.neptune': 'Neptune',
  'object.star': 'Star',

  'layer.planets': 'Planets',
  'layer.stars': 'Stars',
  'view.dial': 'Dial',
  'view.list': 'List',
  'view.map': 'Map',

  'time.now': 'Now',
  'time.travel': 'Time travel',
  'time.dayBack': '−1 d',
  'time.hourBack': '−1 h',
  'time.hourFwd': '+1 h',
  'time.dayFwd': '+1 d',
  'share.button': 'Share',
  'share.brand': 'Sun Clock · 12 o’clock is almost never noon',

  'solar.button': 'Solar',
  'solar.title': 'Solar yield (geometry)',
  'solar.azimuth': 'Orientation',
  'solar.tilt': 'Tilt',
  'solar.window': 'Yield window',
  'solar.peak': 'Best window',
  'solar.summerWinter': 'Summer/winter',
  'solar.note': 'Pure geometry and incidence calculation — no yield in kWh (depends on module, inverter, soiling and weather).',
  'solar.close': 'Close',

  'prayer.button': 'Prayer times',
  'prayer.title': 'Prayer times',
  'prayer.method': 'Calculation method',
  'prayer.madhab': 'Asr school',
  'prayer.standard': 'Standard (Shafiʿi et al.)',
  'prayer.hanafi': 'Hanafi',
  'prayer.fajr': 'Fajr',
  'prayer.sunrise': 'Sunrise (Shuruq)',
  'prayer.dhuhr': 'Dhuhr',
  'prayer.asr': 'Asr',
  'prayer.maghrib': 'Maghrib',
  'prayer.isha': 'Isha',
  'prayer.ramadan': 'Ramadan: Suhur until {suhur}, Iftar at {iftar}.',
  'prayer.sourceLine': 'Method: {source}.',
  'prayer.disclaimer': 'Times only, no interpretation. Verify computed times against a local prayer timetable before relying on them.',
  'prayer.close': 'Close',

  'chrono.button': 'Rhythm',
  'chrono.title': 'Your rhythm',
  'chrono.intro': 'Four times are enough. Everything stays local on the device.',
  'chrono.onset': 'Fall asleep',
  'chrono.wake': 'Wake up',
  'chrono.workdays': 'Work days',
  'chrono.freedays': 'Free days',
  'chrono.chronotype': 'Chronotype',
  'chrono.socialJetlag': 'Social jetlag',
  'chrono.combined': 'Total offset',
  'chrono.explain': 'Solar-time offset {solar} and social jetlag {sjl} add up. Your body’s sleep window is {ideal}.',
  'chrono.disclaimer': 'Descriptive values per the Munich Chronotype Questionnaire (Roenneberg/Wittmann). No diagnosis, no recommendation.',
  'chrono.delete': 'Delete',
  'chrono.export': 'Export',
  'chrono.close': 'Close',
  'chrono.type.extremeEarly': 'Extreme early type',
  'chrono.type.early': 'Early type',
  'chrono.type.slightEarly': 'Slight early type',
  'chrono.type.intermediate': 'Intermediate type',
  'chrono.type.slightLate': 'Slight late type',
  'chrono.type.late': 'Late type',
  'chrono.type.extremeLate': 'Extreme late type',

  'outdoor.button': 'Outdoor',
  'outdoor.title': 'Outdoor & survival',
  'outdoor.usableLight': 'Usable light',
  'outdoor.remaining': '{dur} of usable light left',
  'outdoor.dark': 'No more daylight',
  'outdoor.polarDay': 'Polar day – daylight around the clock',
  'outdoor.polarNight': 'Polar night – no daylight',
  'outdoor.morningGolden': 'Golden hour, morning',
  'outdoor.eveningGolden': 'Golden hour, evening',
  'outdoor.morningBlue': 'Blue hour, morning',
  'outdoor.eveningBlue': 'Blue hour, evening',
  'outdoor.moonlight': 'Moonlight',
  'outdoor.moon.dark': 'dark',
  'outdoor.moon.dim': 'dim',
  'outdoor.moon.bright': 'bright',
  'outdoor.direction': 'Direction',
  'outdoor.sunIn': 'Sun in the',
  'outdoor.sunDown': 'Sun below the horizon',
  'outdoor.note': 'All values work offline and without a compass. Direction is derived from the sun’s position.',
  'outdoor.close': 'Close',

  'map.a11y': 'Sky map: {count} objects above the horizon, including {objects}. Brightest star: {star}.',

  'list.empty': 'Nothing above the horizon right now.',
  'list.optics': 'optics only',

  'weather.title': 'Observing',
  'weather.good': 'good',
  'weather.fair': 'fair',
  'weather.poor': 'poor',
  'weather.clouds': 'Cloud cover',
  'weather.stamp': 'as of {time}',
  'weather.offline': 'Weather offline',

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
