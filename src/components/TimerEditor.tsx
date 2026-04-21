import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Timer } from '../types';
import { generateId } from '../utils/uuid';
import { formatDurationSeconds } from '../utils/dateUtils';

interface Props {
  timers: Timer[];
  onChange: (timers: Timer[]) => void;
}

const BLANK_TIMER: Omit<Timer, 'id'> = {
  label: '',
  durationSeconds: 1500,
  autoRestart: false,
  origin: 'preset',
};

export function TimerEditor({ timers, onChange }: Props) {
  const [editing, setEditing] = useState<Timer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [minutesStr, setMinutesStr] = useState('25');
  const [secondsStr, setSecondsStr] = useState('0');

  function openNew() {
    const t = { id: generateId(), ...BLANK_TIMER };
    setEditing(t);
    setIsNew(true);
    setMinutesStr('25');
    setSecondsStr('0');
  }

  function openEdit(timer: Timer) {
    setEditing({ ...timer });
    setIsNew(false);
    const m = Math.floor(timer.durationSeconds / 60);
    const s = timer.durationSeconds % 60;
    setMinutesStr(String(m));
    setSecondsStr(String(s));
  }

  function saveTimer() {
    if (!editing) return;
    const m = parseInt(minutesStr) || 0;
    const s = parseInt(secondsStr) || 0;
    const total = m * 60 + s;
    if (total <= 0) {
      Alert.alert('Invalid duration', 'Duration must be greater than 0.');
      return;
    }
    const final = { ...editing, durationSeconds: total };
    if (isNew) {
      onChange([...timers, final]);
    } else {
      onChange(timers.map((t) => (t.id === editing.id ? final : t)));
    }
    setEditing(null);
  }

  function deleteTimer(id: string) {
    Alert.alert('Remove Timer', 'Remove this timer from the preset?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(timers.filter((t) => t.id !== id)) },
    ]);
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Timers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {timers.length === 0 && (
        <Text style={styles.emptyText}>No timers. Tap + Add to create one.</Text>
      )}

      {timers.map((timer) => (
        <View key={timer.id} style={styles.itemRow}>
          <TouchableOpacity style={styles.itemMain} onPress={() => openEdit(timer)}>
            <Text style={styles.itemLabel}>{timer.label || 'Untitled Timer'}</Text>
            <Text style={styles.itemDuration}>{formatDurationSeconds(timer.durationSeconds)}</Text>
            {timer.autoRestart && <Text style={styles.itemMeta}>Auto-restart</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteTimer(timer.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{isNew ? 'New Timer' : 'Edit Timer'}</Text>
            {editing && (
              <ScrollView>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Label</Text>
                  <TextInput
                    style={styles.input}
                    value={editing.label}
                    onChangeText={(v) => setEditing({ ...editing, label: v })}
                    placeholder="Morning Focus Block"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Duration</Text>
                  <View style={styles.durationRow}>
                    <View style={styles.durationField}>
                      <TextInput
                        style={styles.input}
                        value={minutesStr}
                        onChangeText={setMinutesStr}
                        keyboardType="number-pad"
                      />
                      <Text style={styles.durationUnit}>min</Text>
                    </View>
                    <Text style={styles.durationSep}>:</Text>
                    <View style={styles.durationField}>
                      <TextInput
                        style={styles.input}
                        value={secondsStr}
                        onChangeText={setSecondsStr}
                        keyboardType="number-pad"
                      />
                      <Text style={styles.durationUnit}>sec</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Auto-restart when done</Text>
                  <Switch
                    value={editing.autoRestart}
                    onValueChange={(v) => setEditing({ ...editing, autoRestart: v })}
                    trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
                    thumbColor={Colors.text}
                  />
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveTimer}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  emptyText: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, gap: 8 },
  itemMain: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemDuration: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  itemMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: Colors.error, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: Colors.text },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durationField: { flex: 1 },
  durationUnit: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  durationSep: { fontSize: 24, color: Colors.textMuted, paddingBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  switchLabel: { fontSize: 15, color: Colors.text },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.text, fontWeight: '700' },
});
