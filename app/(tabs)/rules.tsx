import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { Rule } from '../../src/types';
import { formatTime } from '../../src/utils/dateUtils';

export default function RulesScreen() {
  const router = useRouter();
  const rules = useAppStore((s) => s.rules);
  const toggleRule = useAppStore((s) => s.toggleRule);
  const deleteRule = useAppStore((s) => s.deleteRule);

  function handleDelete(rule: Rule) {
    Alert.alert('Delete Rule', `Delete "${rule.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRule(rule.id) },
    ]);
  }

  const use12h = useAppStore((s) => s.settings.timeFormat === '12h');

  const TRIGGER_LABELS: Record<string, string> = {
    START_OF_DAY: 'Start of Day (midnight)',
    END_OF_DAY: 'End of Day (midnight)',
    TIME_OF_DAY: 'Time of Day',
    PRESET_ACTIVATED: 'Preset Activated',
    PRESET_ASSIGNED: 'Preset Assigned',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Rules</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/rule/new')}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {rules.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="git-branch-outline" size={48} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No rules yet</Text>
            <Text style={styles.emptySubtitle}>
              Rules fire automatically based on triggers and conditions — e.g. add a bedtime alarm when tomorrow is a work day.
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/rule/new')}>
              <Text style={styles.createBtnText}>Create Rule</Text>
            </TouchableOpacity>
          </View>
        )}

        {rules.map((rule) => (
          <TouchableOpacity
            key={rule.id}
            style={[styles.ruleCard, !rule.enabled && styles.ruleCardDisabled]}
            onPress={() => router.push(`/rule/${rule.id}`)}
            activeOpacity={0.75}
          >
            <View style={styles.ruleCardInner}>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <View style={styles.ruleMeta}>
                  <View style={styles.triggerChip}>
                    <Ionicons name="flash-outline" size={11} color={Colors.primary} />
                    <Text style={styles.triggerChipText}>
                      {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                      {rule.trigger === 'TIME_OF_DAY' && rule.triggerTime ? ` @ ${formatTime(rule.triggerTime, use12h)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.conditionCount}>
                    {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                    {rule.conditions.length > 0 ? ` (${rule.conditionLogic ?? 'AND'})` : ''}
                  </Text>
                  <Text style={styles.actionCount}>
                    {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.ruleRight}>
                <Switch
                  value={rule.enabled}
                  onValueChange={() => toggleRule(rule.id)}
                  trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
                  thumbColor={Colors.text}
                />
                <TouchableOpacity onPress={() => handleDelete(rule)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}

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
  addBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  createBtn: { marginTop: 24, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { color: Colors.text, fontWeight: '600', fontSize: 15 },
  ruleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    overflow: 'hidden',
  },
  ruleCardDisabled: { borderLeftColor: Colors.border, opacity: 0.6 },
  ruleCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  ruleInfo: { flex: 1, marginRight: 8 },
  ruleName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  ruleMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  triggerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  triggerChipText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  conditionCount: { fontSize: 12, color: Colors.textMuted },
  actionCount: { fontSize: 12, color: Colors.textMuted },
  ruleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: { padding: 4 },
});
