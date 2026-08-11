/**
 * App (nativ) — Web-freies Shell für iOS/Android. Nutzt dieselbe geteilte
 * Berechnungsebene wie das Web-Target (Spec §6.3) und zeigt den Kern des
 * Alleinstellungsmerkmals: den Sonnenzeit-Versatz (§2, §26.1 A).
 */

import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Dial } from './src/Dial';
import { useSky } from './src/useSky';
import { useLocation } from './src/useLocation';
import { createTranslator, azimuthDirKey, type Lang } from '../src/i18n';

function fmtTime(d: Date, withSeconds = false): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  }).format(d);
}

export default function App(): React.JSX.Element {
  // Default-Locale de (Spec §15); Umschaltung im Header, Persistenz später
  // über AsyncStorage.
  const [lang, setLang] = useState<Lang>('de');
  const [planetsOn, setPlanetsOn] = useState(false);
  const { location } = useLocation();
  const t = useMemo(() => createTranslator(lang), [lang]);
  const sky = useSky(location, planetsOn);

  const { palette, offset, sun } = sky;
  const solarClock = new Date(sky.now.getTime() - offset.minutes * 60_000);

  const offsetLine =
    Math.abs(offset.minutes) < 2
      ? t('offset.exact')
      : offset.minutes > 0
        ? t('offset.ahead', { m: fmtDuration(offset.minutes, t) })
        : t('offset.behind', { m: fmtDuration(offset.minutes, t) });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar style={sky.nightness > 0.5 ? 'light' : 'dark'} />

      <View style={styles.topbar}>
        <View>
          <Text style={[styles.brand, { color: palette.text }]}>{t('app.title')}</Text>
          <Text style={[styles.tag, { color: palette.textDim }]}>{t('app.tagline')}</Text>
        </View>
        <View style={styles.actions}>
          <Chip label={lang === 'de' ? 'EN' : 'DE'} onPress={() => setLang(lang === 'de' ? 'en' : 'de')} palette={palette} />
          <Chip label={t('layer.planets')} active={planetsOn} onPress={() => setPlanetsOn((v) => !v)} palette={palette} />
        </View>
      </View>

      <View style={styles.stage}>
        <Dial state={sky} location={location} />

        <View style={styles.readout}>
          <Text style={[styles.label, { color: palette.textDim }]}>{t('dial.legalTime')}</Text>
          <Text style={[styles.time, { color: palette.text }]}>{fmtTime(sky.now, true)}</Text>
          <Text style={[styles.solar, { color: palette.accent }]}>
            {t('dial.solarTime')} {fmtTime(solarClock)}
          </Text>
          <Text style={[styles.offset, { color: palette.text }]}>{offsetLine}</Text>
          <Text style={[styles.explain, { color: palette.textDim }]}>
            {t('offset.explain', { noon: fmtTime(offset.solarNoon) })}
          </Text>
        </View>

        {sun && (
          <Text style={[styles.sky, { color: palette.textDim }]}>
            {t('object.sun')} {Math.round(sun.horizontal.elevation)}° · {t(azimuthDirKey(sun.horizontal.azimuth))}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function fmtDuration(totalMin: number, t: ReturnType<typeof createTranslator>): string {
  const m = Math.abs(totalMin);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h === 0 ? `${min} ${t('unit.min')}` : `${h} ${t('unit.hour')} ${min} ${t('unit.min')}`;
}

function Chip({
  label,
  onPress,
  active,
  palette,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  palette: { text: string; textDim: string; secondary: string };
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: palette.textDim },
        active ? { backgroundColor: palette.secondary } : null,
      ]}
    >
      <Text style={{ color: active ? '#fff' : palette.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  brand: { fontSize: 20, fontWeight: '600' },
  tag: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  readout: { alignItems: 'center', gap: 2 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  time: { fontSize: 40, fontVariant: ['tabular-nums'], fontWeight: '500' },
  solar: { fontSize: 16, fontVariant: ['tabular-nums'] },
  offset: { fontSize: 15, fontWeight: '500', marginTop: 10, textAlign: 'center' },
  explain: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  sky: { fontSize: 13, marginTop: 8 },
});
