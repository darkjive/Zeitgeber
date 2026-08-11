/**
 * App (nativ) — Shell für iOS/Android. Nutzt dieselbe geteilte
 * Berechnungsebene wie das Web-Target (Spec §6.3) und bietet drei Ansichten
 * (Zifferblatt, Himmelskarte, Liste) plus Layer-Umschalter.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Dial } from './src/Dial';
import { SkyMap } from './src/SkyMap';
import { ObjectList } from './src/ObjectList';
import { ModuleSheet } from './src/ModuleSheet';
import { useSky, type Layers } from './src/useSky';
import { useLocation } from './src/useLocation';
import { createTranslator, azimuthDirKey, type Lang } from '../src/i18n';

type ViewId = 'dial' | 'map' | 'list';

function fmtTime(d: Date, withSeconds = false): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  }).format(d);
}

export default function App(): React.JSX.Element {
  const [lang, setLang] = useState<Lang>('de');
  const [view, setView] = useState<ViewId>('dial');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [layers, setLayers] = useState<Layers>({ planets: false, stars: false, deepSky: false });
  const { location } = useLocation();
  const t = useMemo(() => createTranslator(lang), [lang]);
  const sky = useSky(location, layers);

  const { palette, offset, sun } = sky;
  const solarClock = new Date(sky.now.getTime() - offset.minutes * 60_000);
  const toggle = (k: keyof Layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const offsetLine =
    Math.abs(offset.minutes) < 2
      ? t('offset.exact')
      : offset.minutes > 0
        ? t('offset.ahead', { m: fmtDuration(offset.minutes, t) })
        : t('offset.behind', { m: fmtDuration(offset.minutes, t) });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
      <StatusBar style={sky.nightness > 0.5 ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topbar}>
          <View>
            <Text style={[styles.brand, { color: palette.text }]}>{t('app.title')}</Text>
            <Text style={[styles.tag, { color: palette.textDim }]}>{t('app.tagline')}</Text>
          </View>
          <Chip label={lang === 'de' ? 'EN' : 'DE'} onPress={() => setLang(lang === 'de' ? 'en' : 'de')} palette={palette} />
        </View>

        <View style={styles.seg}>
          {(['dial', 'map', 'list'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[styles.segBtn, view === v ? { backgroundColor: palette.accent } : null]}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === v }}
            >
              <Text style={{ color: view === v ? palette.onAccent : palette.textDim, fontSize: 13 }}>
                {t(`view.${v}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.layers}>
          <Chip label={t('layer.planets')} active={layers.planets} onPress={() => toggle('planets')} palette={palette} />
          <Chip label={t('layer.stars')} active={layers.stars} onPress={() => toggle('stars')} palette={palette} />
          <Chip label={t('layer.deepsky')} active={layers.deepSky} onPress={() => toggle('deepSky')} palette={palette} />
          <Chip label={t('modules.button')} onPress={() => setSheetOpen(true)} palette={palette} />
        </View>

        <View style={styles.stage}>
          {view === 'dial' && <Dial state={sky} location={location} />}
          {view === 'map' && <SkyMap state={sky} />}
          {view === 'list' && <ObjectList state={sky} t={t} />}
        </View>

        {view !== 'list' && (
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
            {sun && (
              <Text style={[styles.sky, { color: palette.textDim }]}>
                {t('object.sun')} {Math.round(sun.horizontal.elevation)}° · {t(azimuthDirKey(sun.horizontal.azimuth))}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <ModuleSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} location={location} now={sky.now} t={t} palette={palette} />
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
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, { borderColor: palette.textDim }, active ? { backgroundColor: palette.secondary } : null]}
    >
      <Text style={{ color: active ? '#fff' : palette.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', paddingTop: 8 },
  brand: { fontSize: 20, fontWeight: '600' },
  tag: { fontSize: 12 },
  seg: { flexDirection: 'row', alignSelf: 'center', marginTop: 14, borderRadius: 999, padding: 2, gap: 2 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  layers: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  stage: { alignItems: 'center', justifyContent: 'center', marginTop: 16, minHeight: 320 },
  readout: { alignItems: 'center', gap: 2, marginTop: 12 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  time: { fontSize: 40, fontVariant: ['tabular-nums'], fontWeight: '500' },
  solar: { fontSize: 16, fontVariant: ['tabular-nums'] },
  offset: { fontSize: 15, fontWeight: '500', marginTop: 10, textAlign: 'center' },
  explain: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  sky: { fontSize: 13, marginTop: 8 },
});
