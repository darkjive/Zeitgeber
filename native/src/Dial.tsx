/**
 * Dial (nativ) — Zifferblatt mit react-native-svg. Geometrie identisch zum
 * Web-Target (Spec §22): 24-h-Zeitring mit Dämmerungszonen, Sonnenhöchststand-
 * Marker, Kompassring mit Sonne/Mond/Planeten, Zeiger auf die gesetzliche Zeit.
 *
 * Hinweis: Für die Produktion sieht Spec §6.2 GPU-Rendering über
 * @shopify/react-native-skia vor. react-native-svg dient hier als schlanker,
 * gut portierbarer Erstaufsatz; das Umstellen betrifft nur diese Datei.
 */

import React from 'react';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import type { GeoLocation } from '../../src/core/astro-engine';
import type { SkyState } from './useSky';

const SIZE = 320;
const C = SIZE / 2;
const R_TIME_OUT = 150;
const R_TIME_IN = 118;
const R_COMPASS = 92;

function polar(r: number, angleDeg: number): [number, number] {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function annularSector(rOut: number, rIn: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0o, y0o] = polar(rOut, a0);
  const [x1o, y1o] = polar(rOut, a1);
  const [x1i, y1i] = polar(rIn, a1);
  const [x0i, y0i] = polar(rIn, a0);
  return (
    `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} ` +
    `L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`
  );
}

const localHour = (date: Date | null, tz: number): number | null =>
  date ? (((date.getTime() + tz * 60_000) / 3_600_000) % 24 + 24) % 24 : null;

const hourToAngle = (h: number): number => ((h - 12) / 24) * 360;

interface DialProps {
  state: SkyState;
  location: GeoLocation;
}

export function Dial({ state }: DialProps): React.JSX.Element {
  const { palette, times, objects, tzOffsetMinutes: tz, now } = state;

  const zoneColor: Record<string, string> = {
    night: palette.ringNight,
    astronomical: palette.ringAstro,
    nautical: palette.ringNautical,
    civil: palette.ringCivil,
    day: palette.ringDay,
  };

  const b = {
    astroDawn: localHour(times.astroDawn, tz),
    nautDawn: localHour(times.nauticalDawn, tz),
    civilDawn: localHour(times.civilDawn, tz),
    sunrise: localHour(times.sunrise, tz),
    sunset: localHour(times.sunset, tz),
    civilDusk: localHour(times.civilDusk, tz),
    nautDusk: localHour(times.nauticalDusk, tz),
    astroDusk: localHour(times.astroDusk, tz),
  };

  const segs: Array<{ from: number; to: number; zone: string }> = [];
  const push = (from: number | null, to: number | null, zone: string) => {
    if (from == null || to == null || to <= from) return;
    segs.push({ from, to, zone });
  };
  if (times.sunrise && times.sunset) {
    push(0, b.astroDawn, 'night');
    push(b.astroDawn, b.nautDawn, 'astronomical');
    push(b.nautDawn, b.civilDawn, 'nautical');
    push(b.civilDawn, b.sunrise, 'civil');
    push(b.sunrise, b.sunset, 'day');
    push(b.sunset, b.civilDusk, 'civil');
    push(b.civilDusk, b.nautDusk, 'nautical');
    push(b.nautDusk, b.astroDusk, 'astronomical');
    push(b.astroDusk, 24, 'night');
  } else {
    segs.push({ from: 0, to: 24, zone: times.noonElevation > 0 ? 'day' : 'night' });
  }

  const solarNoonHour = localHour(times.solarNoon, tz);
  const nowHour = (((now.getTime() + tz * 60_000) / 3_600_000) % 24 + 24) % 24;
  const [hx, hy] = polar(R_TIME_OUT - 4, hourToAngle(nowHour));

  const planets = objects.filter((o) => o.kind === 'planet' && o.horizontal.elevation > -0.833);
  const sun = objects.find((o) => o.kind === 'sun');
  const moon = objects.find((o) => o.kind === 'moon');

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {segs.map((s, i) => (
        <Path key={`z${i}`} d={annularSector(R_TIME_OUT, R_TIME_IN, hourToAngle(s.from), hourToAngle(s.to))} fill={zoneColor[s.zone] ?? palette.ringNight} />
      ))}

      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
        const [x0, y0] = polar(R_TIME_OUT, hourToAngle(h));
        const [x1, y1] = polar(R_TIME_OUT - 8, hourToAngle(h));
        return <Line key={`t${h}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke={palette.textDim} strokeWidth={1} />;
      })}
      {[0, 6, 12, 18].map((h) => {
        const [lx, ly] = polar(R_TIME_OUT - 20, hourToAngle(h));
        return (
          <SvgText key={`l${h}`} x={lx} y={ly} fill={palette.text} fontSize={11} textAnchor="middle">
            {String(h).padStart(2, '0')}
          </SvgText>
        );
      })}

      {solarNoonHour != null &&
        (() => {
          const [sx, sy] = polar((R_TIME_OUT + R_TIME_IN) / 2, hourToAngle(solarNoonHour));
          const [nx, ny] = polar((R_TIME_OUT + R_TIME_IN) / 2, hourToAngle(12));
          return (
            <G>
              <Circle cx={nx} cy={ny} r={3} fill={palette.textDim} />
              <Circle cx={sx} cy={sy} r={8} fill={palette.accent} stroke={palette.bg} strokeWidth={2} />
            </G>
          );
        })()}

      <Circle cx={C} cy={C} r={R_COMPASS} fill="none" stroke={palette.textDim} strokeWidth={1} strokeDasharray="2 4" />

      {planets.map((p, i) => {
        const [px, py] = polar(R_COMPASS, p.horizontal.azimuth);
        return <Circle key={`p${i}`} cx={px} cy={py} r={3} fill={palette.secondary} opacity={0.9} />;
      })}

      {moon &&
        (() => {
          const above = moon.horizontal.elevation > -0.833;
          const [mx, my] = polar(R_COMPASS, moon.horizontal.azimuth);
          const illum = (moon.metadata?.illumination as number) ?? 0.5;
          return (
            <G opacity={above ? 1 : 0.3}>
              <Circle cx={mx} cy={my} r={7} fill={palette.secondary} />
              <Circle cx={mx - (1 - illum) * 7} cy={my} r={7} fill={palette.surface} opacity={0.55} />
            </G>
          );
        })()}

      {sun &&
        (() => {
          const above = sun.horizontal.elevation > -0.833;
          const [sx, sy] = polar(R_COMPASS, sun.horizontal.azimuth);
          return <Circle cx={sx} cy={sy} r={above ? 10 : 6} fill={palette.accent} opacity={above ? 1 : 0.35} />;
        })()}

      <Circle cx={C} cy={C} r={4} fill={palette.text} />
      <Line x1={C} y1={C} x2={hx} y2={hy} stroke={palette.text} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
