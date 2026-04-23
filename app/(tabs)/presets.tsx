import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { todayDateString } from '../../src/utils/dateUtils';
import { Preset } from '../../src/types';

export default function PresetsScreen() {
  const router = useRouter();
  const presets = useAppStore((s) => s.presets);
  const deletePreset = useAppStore((s) => s.deletePreset);
  const getResolvedDay = useAppStore((s) => s.getResolvedDay);

  const todayResolved = getResolvedDay(todayDateString());
  const todayPresetId = todayResolved.preset?.id;

  function handleDelete(preset: Preset) {
    Alert.alert(
      'Delete Preset',
      `Delete "${preset.name}"? This will unassign it from any scheduled days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePreset(preset.id),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Presets</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/preset/new')}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {presets.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={48} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No presets yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first preset — a named bundle of alarms, timers, and stopwatches.
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/preset/new')}>
              <Text style={styles.createBtnText}>Create Preset</Text>
            </TouchableOpacity>
          </View>
        )}

        {presets.map((preset) => {
          const isActive = preset.id === todayPresetId;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[styles.presetCard, { borderLeftColor: preset.color }]}
              onPress={() => router.push(`/preset/${preset.id}`)}
              onLongPress={() => handleDelete(preset)}
              activeOpacity={0.75}
            >
              <View style={styles.presetCardInner}>
                <View style={[styles.presetIconBox, { backgroundColor: preset.color + '33' }]}>
                  <Ionicons name={preset.icon as any} size={22} color={preset.color} />
                </View>
                <View style={styles.presetInfo}>
                  <View style={styles.presetNameRow}>
                    <Text style={styles.presetName}>{preset.name}</Text>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Today</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.presetMeta}>
                    <View style={styles.metaChip}>
                      <Ionicons name="alarm-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.metaChipText}>{preset.alarms.length}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="timer-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.metaChipText}>{preset.timers.length}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="stopwatch-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.metaChipText}>{preset.stopwatches.length}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  createBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createBtnText: { color: Colors.text, fontWeight: '600', fontSize: 15 },
  presetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  presetCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  presetInfo: { flex: 1 },
  presetNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  presetName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  activeBadge: {
    backgroundColor: Colors.primary + '33',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  presetIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  presetMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaChipText: { fontSize: 12, color: Colors.textMuted },
});
