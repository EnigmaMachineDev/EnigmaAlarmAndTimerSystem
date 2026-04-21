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
import { Alarm } from '../types';
import { generateId } from '../utils/uuid';
import { formatTime } from '../utils/dateUtils';

interface Props {
  alarms: Alarm[];
  onChange: (alarms: Alarm[]) => void;
  use12h?: boolean;
}

const BLANK_ALARM: Omit<Alarm, 'id'> = {
  label: '',
  time: '07:00',
  enabled: true,
  sound: 'default',
  snoozeDurationMinutes: 9,
  origin: 'preset',
};

export function AlarmEditor({ alarms, onChange, use12h = true }: Props) {
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [isNew, setIsNew] = useState(false);

  function openNew() {
    setEditing({ id: generateId(), ...BLANK_ALARM });
    setIsNew(true);
  }

  function openEdit(alarm: Alarm) {
    setEditing({ ...alarm });
    setIsNew(false);
  }

  function saveAlarm() {
    if (!editing) return;
    if (!editing.time.match(/^\d{2}:\d{2}$/)) {
      Alert.alert('Invalid time', 'Please use HH:MM format (24h)');
      return;
    }
    if (isNew) {
      onChange([...alarms, editing]);
    } else {
      onChange(alarms.map((a) => (a.id === editing.id ? editing : a)));
    }
    setEditing(null);
  }

  function deleteAlarm(id: string) {
    Alert.alert('Remove Alarm', 'Remove this alarm from the preset?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(alarms.filter((a) => a.id !== id)) },
    ]);
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Alarms</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {alarms.length === 0 && (
        <Text style={styles.emptyText}>No alarms. Tap + Add to create one.</Text>
      )}

      {alarms.map((alarm) => (
        <View key={alarm.id} style={styles.itemRow}>
          <TouchableOpacity style={styles.itemMain} onPress={() => openEdit(alarm)}>
            <Text style={styles.itemTime}>{formatTime(alarm.time, use12h)}</Text>
            {alarm.label ? <Text style={styles.itemLabel}>{alarm.label}</Text> : null}
          </TouchableOpacity>
          <Switch
            value={alarm.enabled}
            onValueChange={(v) => onChange(alarms.map((a) => a.id === alarm.id ? { ...a, enabled: v } : a))}
            trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
            thumbColor={Colors.text}
          />
          <TouchableOpacity onPress={() => deleteAlarm(alarm.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{isNew ? 'New Alarm' : 'Edit Alarm'}</Text>
            {editing && (
              <ScrollView>
                <Field label="Time (HH:MM)">
                  <TextInput
                    style={styles.input}
                    value={editing.time}
                    onChangeText={(v) => setEditing({ ...editing, time: v })}
                    placeholder="07:00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </Field>
                <Field label="Label">
                  <TextInput
                    style={styles.input}
                    value={editing.label}
                    onChangeText={(v) => setEditing({ ...editing, label: v })}
                    placeholder="Wake up"
                    placeholderTextColor={Colors.textMuted}
                  />
                </Field>
                <Field label="Snooze (minutes)">
                  <TextInput
                    style={styles.input}
                    value={String(editing.snoozeDurationMinutes)}
                    onChangeText={(v) => setEditing({ ...editing, snoozeDurationMinutes: parseInt(v) || 9 })}
                    keyboardType="number-pad"
                  />
                </Field>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Enabled</Text>
                  <Switch
                    value={editing.enabled}
                    onValueChange={(v) => setEditing({ ...editing, enabled: v })}
                    trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
                    thumbColor={Colors.text}
                  />
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveAlarm}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
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
  itemTime: { fontSize: 18, fontWeight: '700', color: Colors.text },
  itemLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: Colors.error, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: Colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  switchLabel: { fontSize: 15, color: Colors.text },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.text, fontWeight: '700' },
});
