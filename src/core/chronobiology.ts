/**
 * chronobiology — sozialer Jetlag & Chronotyp nach MCTQ (Spec §26, §2).
 *
 * Umsetzung der zweiten Hälfte des Alleinstellungsmerkmals: der soziale Jetlag
 * nach Roenneberg/Wittmann (Munich Chronotype Questionnaire), erhoben über vier
 * Zeitangaben. Zusammen mit dem Sonnenzeit-Versatz (time-engine) ergibt sich der
 * kombinierte Gesamtversatz (§26.3) — additiv, wie im Spec beschrieben.
 *
 * Regulatorisch (§5, §26.6): rein beschreibend, keine Diagnose, keine
 * Handlungsanweisung. Reine Berechnung; die Schlussfolgerung zieht der Nutzer.
 */

export interface SleepLog {
  /** Einschlafzeit an Arbeitstagen, "HH:MM". */
  workOnset: string;
  /** Aufwachzeit an Arbeitstagen, "HH:MM". */
  workWake: string;
  /** Einschlafzeit an freien Tagen, "HH:MM". */
  freeOnset: string;
  /** Aufwachzeit an freien Tagen, "HH:MM". */
  freeWake: string;
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h % 24) * 60 + (m || 0);
};

const wrap = (min: number): number => ((min % 1440) + 1440) % 1440;

interface Night {
  durationMin: number;
  midsleepMin: number; // Minuten seit Mitternacht
}

function night(onset: string, wake: string): Night {
  const o = toMin(onset);
  let w = toMin(wake);
  if (w <= o) w += 1440; // über Mitternacht
  const durationMin = w - o;
  return { durationMin, midsleepMin: wrap(o + durationMin / 2) };
}

/** Kürzeste (zirkuläre) Differenz zweier Tageszeiten in Minuten. */
function circularDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  return d > 720 ? 1440 - d : d;
}

export interface ChronoResult {
  /** Schlafmitte an freien Tagen (MSF), Minuten seit Mitternacht. */
  msfMin: number;
  /** Schlafkorrigierte Schlafmitte (MSFsc), Minuten seit Mitternacht. */
  msfScMin: number;
  /** Sozialer Jetlag (Betrag), Minuten. */
  socialJetlagMin: number;
  /** i18n-Schlüssel der Chronotyp-Einordnung. */
  chronotypeKey: string;
  /** Persönliches ideales Schlaffenster (aus MSFsc & Freitagsschlafdauer). */
  idealOnsetMin: number;
  idealWakeMin: number;
  sleepDurationFreeMin: number;
}

/**
 * Auswertung des Schlafprotokolls. Annahme: 5 Arbeits-, 2 freie Tage (MCTQ-
 * Standard). MSFsc korrigiert nur bei Ausschlafen an freien Tagen.
 */
export function analyzeSleep(log: SleepLog, workDays = 5): ChronoResult {
  const w = night(log.workOnset, log.workWake);
  const f = night(log.freeOnset, log.freeWake);
  const freeDays = 7 - workDays;

  const sdWeek = (w.durationMin * workDays + f.durationMin * freeDays) / 7;
  const msf = f.midsleepMin;
  // MSFsc nur korrigieren, wenn an freien Tagen länger geschlafen wird.
  const msfSc = f.durationMin > w.durationMin ? wrap(msf - (f.durationMin - sdWeek) / 2) : msf;

  const socialJetlagMin = Math.round(circularDiff(f.midsleepMin, w.midsleepMin));

  return {
    msfMin: Math.round(msf),
    msfScMin: Math.round(msfSc),
    socialJetlagMin,
    chronotypeKey: chronotypeKeyFromMsfSc(msfSc),
    idealOnsetMin: wrap(msfSc - f.durationMin / 2),
    idealWakeMin: wrap(msfSc + f.durationMin / 2),
    sleepDurationFreeMin: f.durationMin,
  };
}

/** Chronotyp-Bänderung nach MSFsc (Uhrzeit). Rein beschreibend (§26.6). */
function chronotypeKeyFromMsfSc(msfScMin: number): string {
  const h = msfScMin / 60;
  if (h < 2) return 'chrono.type.extremeEarly';
  if (h < 3) return 'chrono.type.early';
  if (h < 4) return 'chrono.type.slightEarly';
  if (h < 5) return 'chrono.type.intermediate';
  if (h < 6) return 'chrono.type.slightLate';
  if (h < 7) return 'chrono.type.late';
  return 'chrono.type.extremeLate';
}

/**
 * Kombinierter Gesamtversatz (§26.3): Sonnenzeit-Versatz und sozialer Jetlag
 * addieren sich in der Erfahrung. Beträge in Minuten.
 */
export function combinedOffset(solarOffsetMin: number, socialJetlagMin: number): number {
  return Math.abs(solarOffsetMin) + Math.abs(socialJetlagMin);
}

export const minutesToHHMM = (min: number): string => {
  const m = wrap(Math.round(min));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
