import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { Colors } from '../src/constants/colors';
import { todayDateString } from '../src/utils/dateUtils';
import { generateId } from '../src/utils/uuid';
import { Alarm, Timer, Stopwatch, DayCustomization } from '../src/types';
import { AlarmEditor } from '../src/components/AlarmEditor';
import { TimerEditor } from '../src/components/TimerEditor';
import { StopwatchEditor } from '../src/components/StopwatchEditor';

export default function CustomizeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate = params.date ?? todayDateString();

  const getResolvedDay = useAppStore((s) => s.getResolvedDay);
  const setCustomization = useAppStore((s) => s.setCustomization);
  const removeCustomization = useAppStore((s) => s.removeCustomization);
  const getCustomizationForDate = useAppStore((s) => s.getCustomizationForDate);
  const getOverrideForDate = useAppStore((s) => s.getOverrideForDate);

  const override = getOverrideForDate(targetDate);
  const existing = getCustomizationForDate(targetDate);
  const resolved = getResolvedDay(targetDate);

  // We work with the *full* effective alarms/timers/stopwatches for this day,
  // then save the diff back as a customization.
  const [alarms, setAlarms] = useState<Alarm[]>(
    resolved.alarms.map((a) => ({ ...a, origin: 'customization' as const }))
  );
  const [timers, setTimers] = useState<Timer[]>(
    resolved.timers.map((t) => ({ ...t, origin: 'customization' as const }))
  );
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>(
    resolved.stopwatches.map((s) => ({ ...s, origin: 'customization' as const }))
  );

  const presetAlarmIds = new Set((resolved.preset?.alarms ?? []).map((a) => a.id));
  const presetTimerIds = new Set((resolved.preset?.timers ?? []).map((t) => t.id));
  const presetStopwatchIds = new Set((resolved.preset?.stopwatches ?? []).map((s) => s.id));

  function handleSave() {
    const addAlarms = alarms.filter((a) => !presetAlarmIds.has(a.id));
    const removeAlarmIds = [...presetAlarmIds].filter(
      (id) => !alarms.some((a) => a.id === id)
    );
    const modifyAlarms = alarms
      .filter((a) => presetAlarmIds.has(a.id))
      .map((a) => {
        const original = resolved.preset?.alarms.find((pa) => pa.id === a.id);
        if (!original) return null;
        const diff: Record<string, any> = { id: a.id };
        if (a.time !== original.time) diff.time = a.time;
        if (a.label !== original.label) diff.label = a.label;
        if (a.enabled !== original.enabled) diff.enabled = a.enabled;
        if (a.sound !== original.sound) diff.sound = a.sound;
        if (a.snoozeDurationMinutes !== original.snoozeDurationMinutes) diff.snoozeDurationMinutes = a.snoozeDurationMinutes;
        return Object.keys(diff).length > 1 ? diff : null;
      })
      .filter(Boolean) as any[];

    const addTimers = timers.filter((t) => !presetTimerIds.has(t.id));
    const removeTimerIds = [...presetTimerIds].filter(
      (id) => !timers.some((t) => t.id === id)
    );
    const addStopwatches = stopwatches.filter((s) => !presetStopwatchIds.has(s.id));
    const removeStopwatchIds = [...presetStopwatchIds].filter(
      (id) => !stopwatches.some((s) => s.id === id)
    );

    const hasChanges =
      addAlarms.length > 0 ||
      removeAlarmIds.length > 0 ||
      modifyAlarms.length > 0 ||
      addTimers.length > 0 ||
      removeTimerIds.length > 0 ||
      addStopwatches.length > 0 ||
      removeStopwatchIds.length > 0;

    if (!hasChanges) {
      if (existing) {
        Alert.alert('No changes', 'No customizations detected. Remove existing customization?', [
          { text: 'Keep', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => { removeCustomization(existing.id); router.back(); } },
        ]);
      } else {
        router.back();
      }
      return;
    }

    const customization: DayCustomization = {
      id: existing?.id ?? generateId(),
      date: targetDate,
      addAlarms,
      removeAlarmIds,
      modifyAlarms,
      addTimers,
      removeTimerIds,
      addStopwatches,
      removeStopwatchIds,
    };
    setCustomization(customization);
    router.back();
  }

  if (override) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Text style={styles.navBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Customize Day</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.blockScreen}>
          <Text style={styles.blockIcon}>⚠️</Text>
          <Text style={styles.blockTitle}>Override Active</Text>
          <Text style={styles.blockText}>
            A full preset override exists for {targetDate}. Remove the override first to apply per-item customizations.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.navBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Customize {targetDate === todayDateString() ? 'Today' : targetDate}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.navSaveBtn}>
          <Text style={styles.navSaveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {!resolved.preset && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>No preset assigned for this day. Customizations will only add items.</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.helpText}>
          Edit below to add, remove, or modify individual alarms, timers, and stopwatches for this date only. The preset itself won't change.
        </Text>

        <AlarmEditor alarms={alarms} onChange={setAlarms} />
        <TimerEditor timers={timers} onChange={setTimers} />
        <StopwatchEditor stopwatches={stopwatches} onChange={setStopwatches} />

        {existing && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => Alert.alert('Remove Customization', 'Revert to the preset for this day?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => { removeCustomization(existing.id); router.back(); } },
            ])}
          >
            <Text style={styles.removeBtnText}>Remove All Customizations</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navBtn: { padding: 4, minWidth: 60 },
  navBtnText: { color: Colors.textSecondary, fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, flexShrink: 1, textAlign: 'center' },
  navSaveBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, minWidth: 60, alignItems: 'center' },
  navSaveBtnText: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  warningBanner: { backgroundColor: Colors.warning + '22', borderBottomWidth: 1, borderBottomColor: Colors.warning + '44', paddingHorizontal: 16, paddingVertical: 10 },
  warningText: { color: Colors.warning, fontSize: 13 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  helpText: { fontSize: 13, color: Colors.textMuted, lineHeight: 18, marginBottom: 8 },
  removeBtn: { marginTop: 32, backgroundColor: Colors.error + '22', borderWidth: 1, borderColor: Colors.error, borderRadius: 12, padding: 14, alignItems: 'center' },
  removeBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
  blockScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  blockIcon: { fontSize: 48, marginBottom: 16 },
  blockTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  blockText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  backBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: Colors.text, fontWeight: '600' },
});
