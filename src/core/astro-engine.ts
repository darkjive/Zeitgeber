/**
 * astro-engine — reine Ephemeriden-Mathematik, keine UI-Abhängigkeiten.
 *
 * Spec §6.3: Die Engine muss als eigenständiges Paket auslagerbar bleiben
 * (Voraussetzung für den Begleitdienst §34). Deshalb: ausschliesslich reine
 * Funktionen, kein DOM, kein State.
 *
 * Sonne: NOAA Solar Position Algorithm (Ableitung aus VSOP87-Reihen), genau
 * auf < 0,1° für Sichtbarkeitsfunktionen — deckt Spec §4 ab.
 * Mond: Schlyter-Näherung inkl. Hauptperturbationen (~1–2' Genauigkeit,
 * ausreichend für den Marker auf dem Zifferblatt).
 *
 * Validierung gegen NASA-JPL-Horizons erfolgt in den Unit-Tests (Spec §4).
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const mod360 = (x: number): number => ((x % 360) + 360) % 360;
const clamp = (x: number, lo = -1, hi = 1): number => Math.min(hi, Math.max(lo, x));

/** Julianisches Datum aus einem JS-Date (UTC-Zeitpunkt). */
export function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

const julianCentury = (jd: number): number => (jd - 2_451_545) / 36_525;

// --- Sonnen-Grundgrössen nach NOAA -----------------------------------------

const geomMeanLongSun = (t: number): number => mod360(280.46646 + t * (36_000.76983 + t * 0.0003032));
const geomMeanAnomalySun = (t: number): number => 357.52911 + t * (35_999.05029 - 0.0001537 * t);
const eccentricityEarthOrbit = (t: number): number => 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

function sunEqOfCenter(t: number): number {
  const m = geomMeanAnomalySun(t) * RAD;
  return (
    Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289
  );
}

const sunTrueLong = (t: number): number => geomMeanLongSun(t) + sunEqOfCenter(t);
const sunApparentLong = (t: number): number => sunTrueLong(t) - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * RAD);

function meanObliquityOfEcliptic(t: number): number {
  const sec = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  return 23 + (26 + sec / 60) / 60;
}
const obliquityCorrection = (t: number): number => meanObliquityOfEcliptic(t) + 0.00256 * Math.cos((125.04 - 1934.136 * t) * RAD);

function sunDeclination(t: number): number {
  const e = obliquityCorrection(t) * RAD;
  const lambda = sunApparentLong(t) * RAD;
  return Math.asin(Math.sin(e) * Math.sin(lambda)) * DEG;
}

/** Zeitgleichung in Minuten (echte Sonnenzeit − mittlere Sonnenzeit). */
export function equationOfTime(t: number): number {
  const eps = obliquityCorrection(t) * RAD;
  const l0 = geomMeanLongSun(t) * RAD;
  const e = eccentricityEarthOrbit(t);
  const m = geomMeanAnomalySun(t) * RAD;
  const y = Math.tan(eps / 2) ** 2;
  const etime =
    y * Math.sin(2 * l0) -
    2 * e * Math.sin(m) +
    4 * e * y * Math.sin(m) * Math.cos(2 * l0) -
    0.5 * y * y * Math.sin(4 * l0) -
    1.25 * e * e * Math.sin(2 * m);
  return etime * DEG * 4; // Minuten
}

/** Atmosphärische Refraktion (NOAA-Näherung), Grad, additiv zur Höhe. */
function refraction(elevDeg: number): number {
  if (elevDeg > 85) return 0;
  const te = Math.tan(elevDeg * RAD);
  let r: number;
  if (elevDeg > 5) r = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (elevDeg > -0.575) r = 1735 + elevDeg * (-518.2 + elevDeg * (103.4 + elevDeg * (-12.79 + elevDeg * 0.711)));
  else r = -20.772 / te;
  return r / 3600;
}

export interface HorizontalCoords {
  /** Höhe über dem Horizont, Grad (scheinbar, inkl. Refraktion). */
  elevation: number;
  /** Azimut, Grad, von Nord im Uhrzeigersinn (0 = N, 90 = O, 180 = S, 270 = W). */
  azimuth: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number; // Ost positiv
  label?: string;
}

/** Sonnenposition (Azimut, Höhe) für Zeitpunkt und Ort. */
export function sunPosition(date: Date, loc: GeoLocation): HorizontalCoords {
  const t = julianCentury(julianDay(date));
  const decl = sunDeclination(t);
  const eqTime = equationOfTime(t);

  const minutesUTC = (date.getTime() / 60_000) % 1440;
  const trueSolarTime = ((minutesUTC + eqTime + 4 * loc.longitude) % 1440 + 1440) % 1440;
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latR = loc.latitude * RAD;
  const declR = decl * RAD;
  const haR = hourAngle * RAD;

  const cosZenith = clamp(Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(haR));
  const zenith = Math.acos(cosZenith) * DEG;
  const elevation = 90 - zenith;

  let azimuth: number;
  const denom = Math.cos(latR) * Math.sin(zenith * RAD);
  if (Math.abs(denom) < 1e-9) {
    azimuth = loc.latitude > 0 ? 180 : 0;
  } else {
    const cosAz = clamp((Math.sin(latR) * Math.cos(zenith * RAD) - Math.sin(declR)) / denom);
    const az = Math.acos(cosAz) * DEG;
    azimuth = hourAngle > 0 ? mod360(az + 180) : mod360(540 - az);
  }

  return { elevation: elevation + refraction(elevation), azimuth };
}

// --- Sonnenereignisse (Auf-/Untergang, Dämmerung) --------------------------

export type SunEventAngle = -0.833 | -6 | -12 | -18;

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  civilDawn: Date | null;
  civilDusk: Date | null;
  nauticalDawn: Date | null;
  nauticalDusk: Date | null;
  astroDawn: Date | null;
  astroDusk: Date | null;
  /** Sonnenhöchststand über dem Horizont an diesem Tag, Grad. */
  noonElevation: number;
}

/**
 * Ereigniszeiten für den lokalen Kalendertag von `date` am Ort `loc`.
 * Null bedeutet Polartag/-nacht (Ereignis tritt nicht ein).
 */
export function sunTimes(date: Date, loc: GeoLocation): SunTimes {
  // Auf lokalen Sonnenmittag beziehen, um decl/eqTime konsistent zu wählen.
  const noonUTCguess = new Date(date);
  noonUTCguess.setUTCHours(12, 0, 0, 0);
  const tNoon = julianCentury(julianDay(noonUTCguess));
  const decl = sunDeclination(tNoon);
  const eqTime = equationOfTime(tNoon);

  const solarNoonUTCmin = 720 - 4 * loc.longitude - eqTime;
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const atMinutes = (min: number): Date => new Date(dayStart.getTime() + min * 60_000);

  const latR = loc.latitude * RAD;
  const declR = decl * RAD;
  const noonElevation = 90 - Math.abs(loc.latitude - decl);

  const eventTime = (angle: SunEventAngle, side: -1 | 1): Date | null => {
    const cosH = Math.cos((90 - angle) * RAD) / (Math.cos(latR) * Math.cos(declR)) - Math.tan(latR) * Math.tan(declR);
    if (cosH > 1 || cosH < -1) return null; // Polartag/-nacht für diese Zone
    const ha = Math.acos(clamp(cosH)) * DEG;
    return atMinutes(solarNoonUTCmin + side * 4 * ha);
  };

  return {
    solarNoon: atMinutes(solarNoonUTCmin),
    noonElevation,
    sunrise: eventTime(-0.833, -1),
    sunset: eventTime(-0.833, 1),
    civilDawn: eventTime(-6, -1),
    civilDusk: eventTime(-6, 1),
    nauticalDawn: eventTime(-12, -1),
    nauticalDusk: eventTime(-12, 1),
    astroDawn: eventTime(-18, -1),
    astroDusk: eventTime(-18, 1),
  };
}

/**
 * Scheinbare geozentrische Ekliptiklänge der Sonne (Grad, 0…360).
 * Grundlage für die exakten Zeitpunkte von Sonnenwenden und Tagundnacht-
 * gleichen (Jahreskreis, §32.2): 0° Frühling, 90° Sommer, 180° Herbst,
 * 270° Winter.
 */
export function sunEclipticLongitude(date: Date): number {
  return mod360(sunApparentLong(julianCentury(julianDay(date))));
}

/** Sonnendeklination für den lokalen Kalendertag (Grad). */
export function solarDeclination(date: Date): number {
  const noon = new Date(date);
  noon.setUTCHours(12, 0, 0, 0);
  return sunDeclination(julianCentury(julianDay(noon)));
}

/**
 * Zeitpunkt, zu dem die Sonne eine bestimmte Höhe erreicht (Grad, auch
 * negativ). `side` wählt Vormittag (rise) oder Nachmittag (set). Null bei
 * Polartag/-nacht. Grundlage für Gebetszeiten (Fajr/Isha/Asr, §32.1).
 */
export function sunTimeAtAltitude(date: Date, loc: GeoLocation, altitudeDeg: number, side: 'rise' | 'set'): Date | null {
  const noon = new Date(date);
  noon.setUTCHours(12, 0, 0, 0);
  const t = julianCentury(julianDay(noon));
  const decl = sunDeclination(t);
  const eqTime = equationOfTime(t);
  const solarNoonUTCmin = 720 - 4 * loc.longitude - eqTime;
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  const latR = loc.latitude * RAD;
  const declR = decl * RAD;
  const cosH = (Math.sin(altitudeDeg * RAD) - Math.sin(latR) * Math.sin(declR)) / (Math.cos(latR) * Math.cos(declR));
  if (cosH > 1 || cosH < -1) return null;
  const ha = Math.acos(clamp(cosH)) * DEG;
  return new Date(dayStart.getTime() + (solarNoonUTCmin + (side === 'set' ? 1 : -1) * 4 * ha) * 60_000);
}

// --- Mond (Schlyter) --------------------------------------------------------

export interface MoonInfo extends HorizontalCoords {
  /** Beleuchteter Anteil 0..1. */
  illumination: number;
  /** Alter im synodischen Zyklus, Tage (0 = Neumond, ~14.8 = Vollmond). */
  ageDays: number;
  /** Phasenname-Schlüssel für i18n. */
  phaseKey: string;
}

function gmst(date: Date): number {
  // Greenwich Mean Sidereal Time in Grad.
  const jd = julianDay(date);
  const d = jd - 2_451_545.0;
  return mod360(280.46061837 + 360.98564736629 * d);
}

/**
 * Äquatoriale (RA/Dec, J2000, Grad) → horizontale Koordinaten für Ort und Zeit.
 * Geteilte Basis für Fixstern- und Deep-Sky-Provider (Spec §4:
 * Koordinatentransformation über Greenwich Sidereal Time).
 */
export function equatorialToHorizontal(raDeg: number, decDeg: number, date: Date, loc: GeoLocation): HorizontalCoords {
  const lst = mod360(gmst(date) + loc.longitude);
  const ha = mod360(lst - raDeg) * RAD;
  const latR = loc.latitude * RAD;
  const decR = decDeg * RAD;
  const elev = Math.asin(clamp(Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(ha))) * DEG;
  const az = mod360(
    Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(decR) * Math.cos(latR)) * DEG + 180,
  );
  return { elevation: elev + refraction(elev), azimuth: az };
}

/** Länge des synodischen Monats in Tagen (Neumond → Neumond). */
export const SYNODIC_MONTH_DAYS = 29.530588853;

export interface FullMoonDistance {
  /** Ganze Tage bis zum nächsten bzw. seit dem letzten Vollmond, immer ≥ 0. */
  days: number;
  /** 'to' = der Vollmond steht bevor, 'since' = er liegt zurück. */
  direction: 'to' | 'since';
}

/**
 * Abstand zum Vollmond aus dem Mondalter (§17). Es gewinnt die nähere Seite:
 * kurz nach Vollmond zählt die Anzeige zurück, sonst vorwärts — das entspricht
 * dem, wie Menschen den Zyklus benennen.
 */
export function fullMoonDistance(ageDays: number): FullMoonDistance {
  const full = SYNODIC_MONTH_DAYS / 2;
  const cycle = (x: number): number => ((x % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const toNext = cycle(full - ageDays);
  const sinceLast = cycle(ageDays - full);
  // Beim exakten Halbzyklus können toNext/sinceLast durch Fließkomma-Rundung
  // um ein paar 1e-15 auseinanderliegen — Toleranz verhindert eine zufällige
  // Richtungswahl genau am Vollmond.
  return toNext <= sinceLast + 1e-9
    ? { days: Math.round(toNext), direction: 'to' }
    : { days: Math.round(sinceLast), direction: 'since' };
}

export function moonInfo(date: Date, loc: GeoLocation): MoonInfo {
  const d = julianDay(date) - 2_451_543.5;

  // Bahnelemente des Mondes.
  const N = (125.1228 - 0.0529538083 * d) * RAD;
  const i = 5.1454 * RAD;
  const w = (318.0634 + 0.1643573223 * d) * RAD;
  const a = 60.2666;
  const e = 0.054900;
  const M = mod360(115.3654 + 13.0649929509 * d) * RAD;

  // Exzentrische Anomalie (zwei Iterationen genügen bei e≈0.055).
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));

  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(y, x);

  let lon = Math.atan2(
    Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i),
    Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i),
  );
  let lat = Math.asin(Math.sin(v + w) * Math.sin(i));

  // Sonnenlänge für Perturbationen & Elongation.
  const ws = (282.9404 + 4.70935e-5 * d) * RAD;
  const Ms = mod360(356.0470 + 0.9856002585 * d) * RAD;
  const Ls = ws + Ms;
  const Lm = N + w + M;
  const D = Lm - Ls; // mittlere Elongation
  const F = Lm - N; // Argument der Breite

  // Hauptperturbationen in Länge/Breite (Grad → nach RAD).
  const dLon =
    -1.274 * Math.sin(M - 2 * D) +
    0.658 * Math.sin(2 * D) -
    0.186 * Math.sin(Ms) -
    0.059 * Math.sin(2 * M - 2 * D) -
    0.057 * Math.sin(M - 2 * D + Ms) +
    0.053 * Math.sin(M + 2 * D) +
    0.046 * Math.sin(2 * D - Ms) +
    0.041 * Math.sin(M - Ms) -
    0.035 * Math.sin(D) -
    0.031 * Math.sin(M + Ms) -
    0.015 * Math.sin(2 * F - 2 * D) +
    0.011 * Math.sin(M - 4 * D);
  const dLat =
    -0.173 * Math.sin(F - 2 * D) -
    0.055 * Math.sin(M - F - 2 * D) -
    0.046 * Math.sin(M + F - 2 * D) +
    0.033 * Math.sin(F + 2 * D) +
    0.017 * Math.sin(2 * M + F);
  lon += dLon * RAD;
  lat += dLat * RAD;

  // Ekliptik → Äquator.
  const ecl = (23.4393 - 3.563e-7 * d) * RAD;
  const xg = Math.cos(lon) * Math.cos(lat);
  const yg = Math.sin(lon) * Math.cos(lat);
  const zg = Math.sin(lat);
  const xe = xg;
  const ye = yg * Math.cos(ecl) - zg * Math.sin(ecl);
  const ze = yg * Math.sin(ecl) + zg * Math.cos(ecl);
  const ra = Math.atan2(ye, xe) * DEG;
  const dec = Math.atan2(ze, Math.hypot(xe, ye)) * DEG;

  // Äquator → Horizont.
  const lst = mod360(gmst(date) + loc.longitude);
  const ha = mod360(lst - ra) * RAD;
  const latR = loc.latitude * RAD;
  const decR = dec * RAD;
  const elev = Math.asin(clamp(Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(ha))) * DEG;
  const az = mod360(
    Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(decR) * Math.cos(latR)) * DEG + 180,
  );

  // Phase über Elongation.
  const elong = mod360((Lm - Ls) * DEG);
  const illumination = (1 - Math.cos(elong * RAD)) / 2;
  const ageDays = (elong / 360) * SYNODIC_MONTH_DAYS;

  return {
    elevation: elev + refraction(elev),
    azimuth: az,
    illumination,
    ageDays,
    phaseKey: phaseKeyFromAge(ageDays),
  };
}

function phaseKeyFromAge(age: number): string {
  const f = age / SYNODIC_MONTH_DAYS;
  if (f < 0.02 || f > 0.98) return 'moon.new';
  if (f < 0.23) return 'moon.waxingCrescent';
  if (f < 0.27) return 'moon.firstQuarter';
  if (f < 0.48) return 'moon.waxingGibbous';
  if (f < 0.52) return 'moon.full';
  if (f < 0.73) return 'moon.waningGibbous';
  if (f < 0.77) return 'moon.lastQuarter';
  return 'moon.waningCrescent';
}
