/**
 * SkyMap (nativ) — 2D-Himmelskarte mit react-native-svg (Spec §24).
 * Azimutal-äquidistante Projektion, identisch zum Web-Target: Zenit Mitte,
 * Horizont Rand, Nord oben / Ost links. Zeigt alle Objekte über dem Horizont.
 */

import React from 'react';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import type { CelestialObject } from '../../src/core/types';
import type { SkyState } from './useSky';

const SIZE = 320;
const C = SIZE / 2;
const R = 142;

function project(elevation: number, azimuth: number): [number, number] {
  const r = ((90 - elevation) / 90) * R;
  const a = azimuth * (Math.PI / 180);
  return [C - r * Math.sin(a), C - r * Math.cos(a)];
}

const objName = (o: CelestialObject): string => (o.metadata?.name as string) ?? o.kind;

export function SkyMap({ state }: { state: SkyState }): React.JSX.Element {
  const { palette, nightness, objects } = state;
  const visible = objects.filter((o) => o.horizontal.elevation > 0);
  const order: Record<string, number> = { star: 0, dso: 0, planet: 1, satellite: 1, aircraft: 1, moon: 2, sun: 3 };
  visible.sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1));

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle cx={C} cy={C} r={R} fill={nightness > 0.5 ? palette.ringNight : palette.ringDay} opacity={0.3} />
      {[30, 60].map((alt) => (
        <Circle key={alt} cx={C} cy={C} r={((90 - alt) / 90) * R} fill="none" stroke={palette.textDim} strokeWidth={0.75} strokeDasharray="2 5" opacity={0.6} />
      ))}
      <Circle cx={C} cy={C} r={R} fill="none" stroke={palette.textDim} strokeWidth={1.25} />

      {([['N', 0], ['O', 90], ['S', 180], ['W', 270]] as const).map(([dir, az]) => {
        const [x, y] = project(-4, az);
        return (
          <SvgText key={dir} x={x} y={y} fill={palette.text} fontSize={12} fontWeight="600" textAnchor="middle">
            {dir}
          </SvgText>
        );
      })}
      <Circle cx={C} cy={C} r={1.5} fill={palette.textDim} />

      {visible.map((o, i) => {
        const [x, y] = project(o.horizontal.elevation, o.horizontal.azimuth);
        if (o.kind === 'star') {
          const rad = Math.max(0.8, 2.6 - (o.magnitude ?? 2) * 0.7);
          return <Circle key={i} cx={x} cy={y} r={rad} fill={palette.text} opacity={0.85} />;
        }
        if (o.kind === 'dso') {
          return <Circle key={i} cx={x} cy={y} r={3} fill="none" stroke={palette.secondary} strokeWidth={1.2} opacity={0.8} />;
        }
        if (o.kind === 'sun') {
          return (
            <G key={i}>
              <Circle cx={x} cy={y} r={8} fill={palette.accent} />
              <SvgText x={x + 10} y={y} fill={palette.text} fontSize={10}>{objName(o)}</SvgText>
            </G>
          );
        }
        if (o.kind === 'moon') {
          const illum = (o.metadata?.illumination as number) ?? 0.5;
          return (
            <G key={i}>
              <Circle cx={x} cy={y} r={7} fill={palette.secondary} />
              <Circle cx={x - (1 - illum) * 7} cy={y} r={7} fill={palette.surface} opacity={0.55} />
            </G>
          );
        }
        return (
          <G key={i}>
            <Circle cx={x} cy={y} r={4} fill={palette.secondary} />
            <SvgText x={x + 9} y={y} fill={palette.textDim} fontSize={10}>{objName(o)}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
