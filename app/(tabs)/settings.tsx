import { useState } from 'react';
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
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { exportAppData, readImportFile, resetAppData, saveAppDataImmediate } from '../../src/storage/fileStorage';
import { Rule } from '../../src/types';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const rules = useAppStore((s) => s.rules);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const toggleRule = useAppStore((s) => s.toggleRule);
  const deleteRule = useAppStore((s) => s.deleteRule);
  const hydrate = useAppStore((s) => s.hydrate);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const store = useAppStore.getState();
      const path = await exportAppData(store);
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Enigma data' });
        updateSettings({ lastExportedAt: new Date().toISOString() });
      } else {
        Alert.alert('Sharing not available on this device');
      }
    } catch (err) {
      Alert.alert('Export failed', String(err));
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) { setImporting(false); return; }
      const file = result.assets[0];
      const imported = await readImportFile(file.uri);
      Alert.alert(
        'Import Data',
        'This will replace ALL current data. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              await saveAppDataImmediate(imported);
              hydrate(imported);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Import failed', String(err));
    } finally {
      setImporting(false);
    }
  }

  function handleFactoryReset() {
    Alert.alert(
      'Factory Reset',
      'Delete all presets, schedule, rules, and settings? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            const fresh = await resetAppData();
            hydrate(fresh);
          },
        },
      ]
    );
  }

  function formatLastExported() {
    if (!settings.lastExportedAt) return 'Never';
    const d = new Date(settings.lastExportedAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Time Settings */}
        <Text style={styles.sectionTitle}>Time</Text>
        <View style={styles.card}>
          <Row label="Day Start Time" value={settings.dayStartTime} onPress={() =>
            Alert.prompt('Day Start Time', 'Enter time in HH:MM format (24h)', (val) => {
              if (val && /^\d{2}:\d{2}$/.test(val)) updateSettings({ dayStartTime: val });
            }, 'plain-text', settings.dayStartTime)
          } />
          <Divider />
          <Row label="Evening Check Time" value={settings.eveningCheckTime} onPress={() =>
            Alert.prompt('Evening Check Time', 'Enter time in HH:MM format (24h)', (val) => {
              if (val && /^\d{2}:\d{2}$/.test(val)) updateSettings({ eveningCheckTime: val });
            }, 'plain-text', settings.eveningCheckTime)
          } />
          <Divider />
          <Row label="Default Snooze" value={`${settings.defaultSnoozeDurationMinutes} min`} onPress={() =>
            Alert.prompt('Default Snooze (minutes)', '', (val) => {
              const n = parseInt(val);
              if (!isNaN(n) && n > 0) updateSettings({ defaultSnoozeDurationMinutes: n });
            }, 'plain-text', String(settings.defaultSnoozeDurationMinutes))
          } />
        </View>

        {/* Display */}
        <Text style={styles.sectionTitle}>Display</Text>
        <View style={styles.card}>
          <SwitchRow
            label="12-hour format"
            value={settings.timeFormat === '12h'}
            onValueChange={(v) => updateSettings({ timeFormat: v ? '12h' : '24h' })}
          />
          <Divider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Theme</Text>
            <View style={styles.segmentRow}>
              {(['system', 'light', 'dark'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.segment, settings.theme === t && styles.segmentActive]}
                  onPress={() => updateSettings({ theme: t })}
                >
                  <Text style={[styles.segmentText, settings.theme === t && styles.segmentTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Rules */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rules</Text>
          <TouchableOpacity style={styles.addSmallBtn} onPress={() => router.push('/rule/new')}>
            <Text style={styles.addSmallBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {rules.length === 0 && (
            <View style={styles.emptyRules}>
              <Text style={styles.emptyRulesText}>No rules yet. Rules fire automatically based on your schedule.</Text>
              <TouchableOpacity onPress={() => router.push('/rule/new')}>
                <Text style={styles.emptyRulesLink}>Create a rule →</Text>
              </TouchableOpacity>
            </View>
          )}
          {rules.map((rule, i) => (
            <View key={rule.id}>
              {i > 0 && <Divider />}
              <RuleRow
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onEdit={() => router.push(`/rule/${rule.id}`)}
                onDelete={() => {
                  Alert.alert('Delete Rule', `Delete "${rule.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteRule(rule.id) },
                  ]);
                }}
              />
            </View>
          ))}
        </View>

        {/* Data */}
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleExport} disabled={exporting}>
            <Text style={styles.rowLabel}>Export Data</Text>
            <Text style={styles.rowValue}>{exporting ? 'Exporting…' : '↑ Share'}</Text>
          </TouchableOpacity>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Last Exported</Text>
            <Text style={styles.rowValue}>{formatLastExported()}</Text>
          </View>
          <Divider />
          <TouchableOpacity style={styles.row} onPress={handleImport} disabled={importing}>
            <Text style={styles.rowLabel}>Import Data</Text>
            <Text style={styles.rowValue}>{importing ? 'Picking…' : '↓ Pick File'}</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleFactoryReset}>
          <Text style={styles.dangerBtnText}>Factory Reset</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value}</Text>
        {onPress && <Text style={styles.rowChevron}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
        thumbColor={Colors.text}
      />
    </View>
  );
}

function RuleRow({ rule, onToggle, onEdit, onDelete }: { rule: Rule; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.ruleRow}>
      <TouchableOpacity style={styles.ruleMain} onPress={onEdit} activeOpacity={0.7}>
        <View>
          <Text style={styles.ruleName}>{rule.name}</Text>
          <Text style={styles.ruleTrigger}>{rule.trigger}</Text>
        </View>
        <View style={styles.ruleActions}>
          <Switch
            value={rule.enabled}
            onValueChange={onToggle}
            trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
            thumbColor={Colors.text}
          />
          <TouchableOpacity onPress={onDelete} style={styles.deleteRuleBtn}>
            <Text style={styles.deleteRuleBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, marginBottom: 8 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  rowLabel: { fontSize: 15, color: Colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 15, color: Colors.textSecondary },
  rowChevron: { fontSize: 18, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  segmentRow: { flexDirection: 'row', gap: 4 },
  segment: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: Colors.surfaceAlt },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.text, fontWeight: '600' },
  addSmallBtn: { backgroundColor: Colors.primary, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  addSmallBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  emptyRules: { padding: 16 },
  emptyRulesText: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  emptyRulesLink: { color: Colors.primary, marginTop: 8, fontSize: 14 },
  ruleRow: { paddingHorizontal: 14, paddingVertical: 10 },
  ruleMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleName: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  ruleTrigger: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteRuleBtn: { padding: 4 },
  deleteRuleBtnText: { fontSize: 18 },
  dangerBtn: {
    backgroundColor: Colors.error + '22',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  dangerBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
