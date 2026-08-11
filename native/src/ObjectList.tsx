/**
 * ObjectList (nativ) — „Heute Nacht sichtbar" (Spec §24). Sortiert nach Höhe,
 * nur Objekte über dem Horizont. Nutzt die geteilten i18n-Helfer.
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CelestialObject } from '../../src/core/types';
import { azimuthDirKey, type Translator } from '../../src/i18n';
import type { SkyState } from './useSky';

const GLYPH: Record<string, string> = { sun: '☀', moon: '🌙', planet: '🪐', star: '★', dso: '✦', satellite: '🛰', aircraft: '✈' };

const name = (o: CelestialObject, t: Translator): string => (o.metadata?.name as string) ?? t(o.nameKey);

export function ObjectList({ state, t }: { state: SkyState; t: Translator }): React.JSX.Element {
  const { palette } = state;
  const visible = state.objects
    .filter((o) => o.horizontal.elevation > -0.833)
    .sort((a, b) => b.horizontal.elevation - a.horizontal.elevation);

  if (visible.length === 0) {
    return <Text style={[styles.empty, { color: palette.textDim }]}>{t('list.empty')}</Text>;
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      {visible.map((o, i) => {
        const dir = t(azimuthDirKey(o.horizontal.azimuth));
        const elev = Math.round(o.horizontal.elevation);
        const mag = o.magnitude != null ? ` · ${o.magnitude > 0 ? '+' : ''}${o.magnitude.toFixed(1)} mag` : '';
        return (
          <View key={i} style={[styles.row, { borderBottomColor: palette.textDim + '30' }]}>
            <Text style={styles.glyph}>{GLYPH[o.kind] ?? '•'}</Text>
            <Text style={[styles.name, { color: palette.text }]}>
              {name(o, t)}
              {o.metadata?.needsOptics ? <Text style={[styles.tag, { color: palette.textDim }]}>  {t('list.optics')}</Text> : null}
            </Text>
            <Text style={[styles.meta, { color: palette.textDim }]}>{`${elev}° · ${dir}${mag}`}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', maxHeight: 360 },
  content: { paddingVertical: 4 },
  empty: { textAlign: 'center', paddingVertical: 32, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  glyph: { width: 22, textAlign: 'center', fontSize: 15 },
  name: { flex: 1, fontSize: 15 },
  tag: { fontSize: 11 },
  meta: { fontVariant: ['tabular-nums'], fontSize: 12 },
});
