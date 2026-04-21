import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { Colors } from '../src/constants/colors';
import { todayDateString, dateStringForDaysFromNow } from '../src/utils/dateUtils';
import { generateId } from '../src/utils/uuid';
import { Preset } from '../src/types';

export default function OverrideScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate = params.date ?? todayDateString();
  const isTomorrow = targetDate === dateStringForDaysFromNow(1);
  const isToday = targetDate === todayDateString();

  const presets = useAppStore((s) => s.presets);
  const addOverride = useAppStore((s) => s.addOverride);
  const removeOverride = useAppStore((s) => s.removeOverride);
  const getOverrideForDate = useAppStore((s) => s.getOverrideForDate);
  const getCustomizationForDate = useAppStore((s) => s.getCustomizationForDate);

  const existingOverride = getOverrideForDate(targetDate);
  const existingCustomization = getCustomizationForDate(targetDate);

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(existingOverride?.presetId ?? null);
  const [reason, setReason] = useState(existingOverride?.reason ?? '');

  function handleSave() {
    if (!selectedPresetId) {
      Alert.alert('Select a preset', 'Please choose a preset to assign to this day.');
      return;
    }
    if (existingCustomization) {
      Alert.alert(
        'Customization exists',
        'A day customization already exists for this date. A full override will ignore it. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Override Anyway', onPress: doSave },
        ]
      );
    } else {
      doSave();
    }
  }

  function doSave() {
    if (!selectedPresetId) return;
    addOverride({
      id: existingOverride?.id ?? generateId(),
      date: targetDate,
      presetId: selectedPresetId,
      reason: reason.trim(),
    });
    router.back();
  }

  function handleRemove() {
    if (!existingOverride) return;
    Alert.alert('Remove Override', 'This will revert to the scheduled preset for this day.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removeOverride(existingOverride.id); router.back(); } },
    ]);
  }

  const title = isToday ? "Switch Today's Preset" : isTomorrow ? "Switch Tomorrow's Preset" : `Override ${targetDate}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.navBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{title}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.navSaveBtn}>
          <Text style={styles.navSaveBtnText}>{existingOverride ? 'Update' : 'Set'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.fieldLabel}>Choose Preset</Text>
        {presets.length === 0 && (
          <View style={styles.emptyPresets}>
            <Text style={styles.emptyPresetsText}>No presets yet. Create one in the Presets tab first.</Text>
          </View>
        )}
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[styles.presetRow, selectedPresetId === preset.id && styles.presetRowSelected, { borderLeftColor: preset.color }]}
            onPress={() => setSelectedPresetId(preset.id)}
            activeOpacity={0.75}
          >
            <View style={styles.presetRowLeft}>
              <View style={[styles.colorDot, { backgroundColor: preset.color }]} />
              <Text style={styles.presetRowName}>{preset.name}</Text>
            </View>
            {selectedPresetId === preset.id && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Reason (optional)</Text>
        <TextInput
          style={styles.textInput}
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Unexpected office day"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
        />

        {existingOverride && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <Text style={styles.removeBtnText}>Remove Override</Text>
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
  navBtn: { padding: 4 },
  navBtnText: { color: Colors.textSecondary, fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, flexShrink: 1, textAlign: 'center' },
  navSaveBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  navSaveBtnText: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  emptyPresets: { backgroundColor: Colors.surface, borderRadius: 10, padding: 16 },
  emptyPresetsText: { color: Colors.textMuted, fontSize: 14 },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  presetRowSelected: { borderColor: Colors.primary, borderWidth: 1.5 },
  presetRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  presetRowName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  checkmark: { fontSize: 20, color: Colors.primary },
  textInput: { backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  removeBtn: { marginTop: 32, backgroundColor: Colors.error + '22', borderWidth: 1, borderColor: Colors.error, borderRadius: 12, padding: 14, alignItems: 'center' },
  removeBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
