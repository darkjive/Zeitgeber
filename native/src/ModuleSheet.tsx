/**
 * ModuleSheet (nativ) — Modul-Menü + Fähigkeits-Panels als Modal (Spec §11.5,
 * §7.4). Portiert die lesbaren Panels des Web-Targets auf React Native; die
 * Rechenlogik kommt unverändert aus der geteilten Core-Ebene.
 */

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GeoLocation } from '../../src/core/astro-engine';
import type { Palette } from '../../src/core/theme-engine';
import { goldenBlueWindows, moonlightForecast, sunDirection, usableLight } from '../../src/core/outdoor';
import { showerOverview } from '../../src/core/meteor-showers';
import { nextWheelEvent, wheelOfYear } from '../../src/core/wheel-of-year';
import { METHODS, prayerTimes, type AsrMadhab } from '../../src/core/prayer-times';
import { azimuthDirKey, type Translator } from '../../src/i18n';

const fmtT = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
const range = (a: Date | null, b: Date | null): string => (a && b ? `${fmtT(a)} – ${fmtT(b)}` : '—');

interface PanelProps {
  location: GeoLocation;
  now: Date;
  t: Translator;
  palette: Palette;
}

function Rows({ rows, palette }: { rows: [string, string][]; palette: Palette }): React.JSX.Element {
  return (
    <View>
      {rows.map(([k, v], i) => (
        <View key={i} style={[styles.row, { borderBottomColor: palette.textDim + '28' }]}>
          <Text style={[styles.rowK, { color: palette.text }]}>{k}</Text>
          <Text style={[styles.rowV, { color: palette.textDim }]}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Note({ children, palette }: { children: string; palette: Palette }): React.JSX.Element {
  return <Text style={[styles.note, { color: palette.textDim }]}>{children}</Text>;
}

function OutdoorPanel({ location, now, t, palette }: PanelProps): React.JSX.Element {
  const light = usableLight(now, location);
  const w = goldenBlueWindows(now, location);
  const moon = moonlightForecast(now, location);
  const dir = sunDirection(now, location);
  const lightText =
    light.state === 'night'
      ? t('outdoor.dark')
      : light.state.startsWith('polar')
        ? t(light.state === 'polar-day' ? 'outdoor.polarDay' : 'outdoor.polarNight')
        : t('outdoor.remaining', {
            dur: light.minutes >= 90 ? `${Math.round(light.minutes / 60)} ${t('unit.hour')}` : `${light.minutes} ${t('unit.min')}`,
          });
  return (
    <View>
      <Text style={[styles.hero, { color: palette.text }]}>{lightText}</Text>
      <Rows
        palette={palette}
        rows={[
          [t('outdoor.morningGolden'), range(w.morningGolden.start, w.morningGolden.end)],
          [t('outdoor.eveningGolden'), range(w.eveningGolden.start, w.eveningGolden.end)],
          [t('outdoor.eveningBlue'), range(w.eveningBlue.start, w.eveningBlue.end)],
          [t('outdoor.moonlight'), `${t(`outdoor.moon.${moon.level}`)} · ${Math.round(moon.illumination * 100)} %`],
          [t('outdoor.direction'), dir.above ? `${t('outdoor.sunIn')} ${t(azimuthDirKey(dir.azimuth))}` : t('outdoor.sunDown')],
        ]}
      />
      <Note palette={palette}>{t('outdoor.note')}</Note>
    </View>
  );
}

function MeteorsPanel({ location, now, t, palette }: PanelProps): React.JSX.Element {
  const list = showerOverview(now, location).slice(0, 5);
  return (
    <View>
      {list.map((s, i) => (
        <View key={i} style={[styles.row, { borderBottomColor: palette.textDim + '28' }]}>
          <Text style={[styles.rowK, { color: palette.text }]}>
            {t(s.shower.key)}
            {s.active ? <Text style={{ color: palette.accent }}>  {t('meteor.active')}</Text> : null}
          </Text>
          <Text style={[styles.rowV, { color: palette.textDim }]}>
            {s.daysToPeak === 0 ? t('meteor.peakToday') : t('meteor.peakIn', { days: String(Math.abs(s.daysToPeak)) })} · ZHR ~{s.shower.zhr}
          </Text>
        </View>
      ))}
      <Note palette={palette}>{t('meteor.note')}</Note>
    </View>
  );
}

function WheelPanel({ now, t, palette }: PanelProps): React.JSX.Element {
  const events = wheelOfYear(now.getUTCFullYear());
  const next = nextWheelEvent(now);
  return (
    <View>
      {events.map((e, i) => {
        const isNext = e.key === next.key && e.date.getUTCFullYear() === next.date.getUTCFullYear();
        return (
          <View key={i} style={[styles.row, { borderBottomColor: palette.textDim + '28' }, isNext ? { backgroundColor: palette.accent + '22' } : null]}>
            <Text style={[styles.rowK, { color: palette.text }]}>{t(e.key)}</Text>
            <Text style={[styles.rowV, { color: palette.textDim }]}>
              {new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(e.date)}
            </Text>
          </View>
        );
      })}
      <Note palette={palette}>{t('wheel.note')}</Note>
    </View>
  );
}

function PrayerPanel({ location, now, t, palette }: PanelProps): React.JSX.Element {
  const [methodId, setMethodId] = useState(METHODS[0].id);
  const [madhab, setMadhab] = useState<AsrMadhab>('standard');
  const method = METHODS.find((m) => m.id === methodId) ?? METHODS[0];
  const p = prayerTimes(now, location, method, madhab);
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {METHODS.map((m) => (
          <Pressable key={m.id} onPress={() => setMethodId(m.id)} style={[styles.pill, { borderColor: palette.textDim }, methodId === m.id ? { backgroundColor: palette.secondary } : null]}>
            <Text style={{ color: methodId === m.id ? '#fff' : palette.text, fontSize: 12 }}>{m.id}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['standard', 'hanafi'] as const).map((mz) => (
          <Pressable key={mz} onPress={() => setMadhab(mz)} style={[styles.pill, { borderColor: palette.textDim }, madhab === mz ? { backgroundColor: palette.secondary } : null]}>
            <Text style={{ color: madhab === mz ? '#fff' : palette.text, fontSize: 12 }}>{t(`prayer.${mz}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Rows
        palette={palette}
        rows={[
          [t('prayer.fajr'), fmtT(p.fajr)],
          [t('prayer.sunrise'), fmtT(p.sunrise)],
          [t('prayer.dhuhr'), fmtT(p.dhuhr)],
          [t('prayer.asr'), fmtT(p.asr)],
          [t('prayer.maghrib'), fmtT(p.maghrib)],
          [t('prayer.isha'), fmtT(p.isha)],
        ]}
      />
      <Note palette={palette}>{method.source}. {t('prayer.disclaimer')}</Note>
    </View>
  );
}

const PANELS: { key: string; glyph: string; labelKey: string; titleKey: string; Comp: (p: PanelProps) => React.JSX.Element }[] = [
  { key: 'outdoor', glyph: '🧭', labelKey: 'outdoor.button', titleKey: 'outdoor.title', Comp: OutdoorPanel },
  { key: 'meteors', glyph: '☄️', labelKey: 'meteor.button', titleKey: 'meteor.title', Comp: MeteorsPanel },
  { key: 'wheel', glyph: '☀', labelKey: 'wheel.button', titleKey: 'wheel.title', Comp: WheelPanel },
  { key: 'prayer', glyph: '🕌', labelKey: 'prayer.button', titleKey: 'prayer.title', Comp: PrayerPanel },
];

export function ModuleSheet({
  visible,
  onClose,
  location,
  now,
  t,
  palette,
}: {
  visible: boolean;
  onClose: () => void;
  location: GeoLocation;
  now: Date;
  t: Translator;
  palette: Palette;
}): React.JSX.Element {
  const [active, setActive] = useState<string | null>(null);
  const current = PANELS.find((p) => p.key === active);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: palette.surface }]} onPress={() => {}}>
          <View style={styles.cardHead}>
            {current ? (
              <Pressable onPress={() => setActive(null)}>
                <Text style={[styles.back, { color: palette.accent }]}>‹ {t('modules.title')}</Text>
              </Pressable>
            ) : (
              <Text style={[styles.title, { color: palette.text }]}>{t('modules.title')}</Text>
            )}
            <Pressable onPress={onClose} accessibilityLabel={t('modules.close')}>
              <Text style={[styles.close, { color: palette.textDim }]}>✕</Text>
            </Pressable>
          </View>

          {current ? (
            <ScrollView style={{ maxHeight: 460 }}>
              <Text style={[styles.title, { color: palette.text, marginBottom: 10 }]}>{t(current.titleKey)}</Text>
              <current.Comp location={location} now={now} t={t} palette={palette} />
            </ScrollView>
          ) : (
            <View style={styles.grid}>
              {PANELS.map((p) => (
                <Pressable key={p.key} onPress={() => setActive(p.key)} style={[styles.item, { borderColor: palette.textDim }]}>
                  <Text style={styles.itemGlyph}>{p.glyph}</Text>
                  <Text style={[styles.itemLabel, { color: palette.text }]}>{t(p.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', paddingHorizontal: 20 },
  card: { borderRadius: 24, padding: 22 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  back: { fontSize: 15 },
  close: { fontSize: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  item: { width: '31%', borderWidth: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 6 },
  itemGlyph: { fontSize: 24 },
  itemLabel: { fontSize: 12, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowK: { fontSize: 14, flex: 1 },
  rowV: { fontSize: 13, fontVariant: ['tabular-nums'], textAlign: 'right' },
  hero: { fontSize: 20, fontWeight: '600', marginBottom: 14 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
});
