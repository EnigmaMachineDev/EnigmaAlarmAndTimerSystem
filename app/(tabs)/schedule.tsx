import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { DAY_KEYS, DAY_LABELS } from '../../src/constants/defaults';
import { DayKey, Preset } from '../../src/types';
import { todayDateString, getDayKey } from '../../src/utils/dateUtils';

export default function ScheduleScreen() {
  const router = useRouter();
  const presets = useAppStore((s) => s.presets);
  const schedule = useAppStore((s) => s.schedule);
  const overrides = useAppStore((s) => s.overrides);
  const dayCustomizations = useAppStore((s) => s.dayCustomizations);
  const setScheduleDay = useAppStore((s) => s.setScheduleDay);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);

  const todayKey = getDayKey(todayDateString());

  function openPicker(day: DayKey) {
    setSelectedDay(day);
    setPickerVisible(true);
  }

  function assignPreset(presetId: string | null) {
    if (selectedDay) {
      setScheduleDay(selectedDay, presetId);
    }
    setPickerVisible(false);
    setSelectedDay(null);
  }

  function getUpcomingOverrideForDay(dayKey: DayKey): string | null {
    const today = todayDateString();
    const upcoming = overrides
      .filter((o) => o.date >= today && getDayKey(o.date) === dayKey)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming.length > 0 ? upcoming[0].presetId : null;
  }

  function hasCustomizationForDay(dayKey: DayKey): boolean {
    const today = todayDateString();
    return dayCustomizations.some(
      (c) => c.date >= today && getDayKey(c.date) === dayKey
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <Text style={styles.headerSub}>Tap a day to change its preset</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Weekly grid */}
        {DAY_KEYS.map((day) => {
          const presetId = schedule[day];
          const preset = presets.find((p) => p.id === presetId);
          const isToday = day === todayKey;
          const overridePresetId = getUpcomingOverrideForDay(day);
          const overridePreset = presets.find((p) => p.id === overridePresetId);
          const hasCustom = hasCustomizationForDay(day);

          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayRow, isToday && styles.dayRowToday]}
              onPress={() => openPicker(day)}
              activeOpacity={0.75}
            >
              <View style={styles.dayLabel}>
                <Text style={[styles.dayAbbr, isToday && styles.dayAbbrToday]}>{day}</Text>
                <Text style={[styles.dayFull, isToday && styles.dayFullToday]}>
                  {DAY_LABELS[day]}
                </Text>
                {isToday && <View style={styles.todayDot} />}
              </View>

              <View style={styles.dayRight}>
                {hasCustom && <Text style={styles.customIcon}>✏️</Text>}
                {overridePreset ? (
                  <View style={styles.overrideChip}>
                    <View style={[styles.colorDot, { backgroundColor: overridePreset.color }]} />
                    <Text style={styles.overrideChipText}>{overridePreset.name}</Text>
                    <Text style={styles.overrideLabel}> (override)</Text>
                  </View>
                ) : preset ? (
                  <View style={styles.presetChip}>
                    <View style={[styles.colorDot, { backgroundColor: preset.color }]} />
                    <Text style={styles.presetChipText}>{preset.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.unassigned}>Unassigned</Text>
                )}
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Upcoming overrides */}
        {overrides.filter((o) => o.date >= todayDateString()).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Overrides</Text>
            {overrides
              .filter((o) => o.date >= todayDateString())
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((o) => {
                const p = presets.find((pr) => pr.id === o.presetId);
                return (
                  <View key={o.id} style={styles.overrideRow}>
                    <View>
                      <Text style={styles.overrideDate}>{o.date}</Text>
                      {o.reason ? <Text style={styles.overrideReason}>{o.reason}</Text> : null}
                    </View>
                    {p ? (
                      <View style={styles.presetChip}>
                        <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                        <Text style={styles.presetChipText}>{p.name}</Text>
                      </View>
                    ) : (
                      <Text style={styles.unassigned}>Deleted preset</Text>
                    )}
                  </View>
                );
              })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Preset Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {selectedDay ? `Assign preset — ${DAY_LABELS[selectedDay]}` : 'Assign preset'}
            </Text>

            <FlatList
              data={[{ id: null, name: 'Unassigned', color: Colors.textMuted, icon: '' } as any, ...presets]}
              keyExtractor={(item) => item.id ?? 'null'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => assignPreset(item.id)}
                >
                  {item.id ? (
                    <View style={[styles.pickerColorDot, { backgroundColor: item.color }]} />
                  ) : (
                    <View style={[styles.pickerColorDot, styles.pickerColorDotEmpty]} />
                  )}
                  <Text style={styles.pickerRowText}>{item.name}</Text>
                  {item.id && schedule[selectedDay!] === item.id && (
                    <Text style={styles.pickerCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 320 }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.customizeBtn}
                onPress={() => {
                  setPickerVisible(false);
                  router.push('/customize');
                }}
              >
                <Text style={styles.customizeBtnText}>✏️ Customize a specific date instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  dayRowToday: { borderWidth: 1.5, borderColor: Colors.primary },
  dayLabel: { width: 70 },
  dayAbbr: { fontSize: 16, fontWeight: '700', color: Colors.text },
  dayAbbrToday: { color: Colors.primary },
  dayFull: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  dayFullToday: { color: Colors.primaryLight },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  dayRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  customIcon: { fontSize: 14 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  presetChipText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  overrideChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overrideChipText: { fontSize: 14, color: Colors.warning, fontWeight: '500' },
  overrideLabel: { fontSize: 11, color: Colors.textMuted },
  unassigned: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  chevron: { fontSize: 20, color: Colors.textMuted, marginLeft: 4 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  overrideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  overrideDate: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  overrideReason: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  pickerColorDot: { width: 16, height: 16, borderRadius: 8 },
  pickerColorDotEmpty: { backgroundColor: Colors.borderLight },
  pickerRowText: { flex: 1, fontSize: 16, color: Colors.text },
  pickerCheck: { fontSize: 18, color: Colors.primary },
  modalActions: { marginTop: 16 },
  customizeBtn: { alignItems: 'center', paddingVertical: 12 },
  customizeBtnText: { color: Colors.primary, fontSize: 14 },
});
