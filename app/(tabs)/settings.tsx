import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { exportAppData, readImportFile, resetAppData, saveAppDataImmediate } from '../../src/storage/fileStorage';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const hydrate = useAppStore((s) => s.hydrate);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);
  const [snoozeInput, setSnoozeInput] = useState(String(settings.defaultSnoozeDurationMinutes));

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
          <TouchableOpacity style={styles.row} onPress={() => { setSnoozeInput(String(settings.defaultSnoozeDurationMinutes)); setSnoozeModalVisible(true); }}>
            <Text style={styles.rowLabel}>Default Snooze</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{settings.defaultSnoozeDurationMinutes} min</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SwitchRow
            label="12-hour format"
            value={settings.timeFormat === '12h'}
            onValueChange={(v) => updateSettings({ timeFormat: v ? '12h' : '24h' })}
          />
          <Divider />
          <TouchableOpacity style={styles.row} onPress={async () => {
            const { status } = await Notifications.requestPermissionsAsync();
            Alert.alert('Notification Permission', status === 'granted' ? 'Notifications are enabled.' : 'Permission denied — enable in Android Settings > Apps > Enigma > Notifications.');
          }}>
            <Text style={styles.rowLabel}>Notification Permission</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>Check</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <Divider />
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              Alarms use Android AlarmManager for reliable wake-from-sleep firing with full-screen intent. Ensure Battery Optimization is disabled for Enigma in Android Settings → Apps → Enigma → Battery.
            </Text>
          </View>
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

      {/* Snooze edit modal */}
      <Modal visible={snoozeModalVisible} transparent animationType="slide" onRequestClose={() => setSnoozeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Default Snooze (minutes)</Text>
            <TextInput
              style={styles.modalInput}
              value={snoozeInput}
              onChangeText={setSnoozeInput}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSnoozeModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={() => {
                const n = parseInt(snoozeInput);
                if (!isNaN(n) && n > 0) updateSettings({ defaultSnoozeDurationMinutes: n });
                setSnoozeModalVisible(false);
              }}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  dangerBtn: {
    backgroundColor: Colors.error + '22',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  dangerBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
  timePickerRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  infoRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  modalInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 24, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  modalSaveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalSaveText: { color: Colors.text, fontWeight: '700' },
});
