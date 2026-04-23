import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/colors';
import { RuleAction, ActionType } from '../types';
import { useAppStore } from '../store/useAppStore';
import { TimePicker } from './TimePicker';

interface Props {
  actions: RuleAction[];
  onChange: (actions: RuleAction[]) => void;
}

const ACTION_TYPES: { value: ActionType; label: string; description: string }[] = [
  { value: 'ADD_ALARM', label: 'Add Alarm', description: 'Adds an ephemeral alarm for tonight/today' },
  { value: 'ADD_TIMER', label: 'Add Timer', description: 'Queues an ephemeral timer in today\'s list' },
  { value: 'SEND_NOTIFICATION', label: 'Send Notification', description: 'Sends a push notification message' },
  { value: 'SWITCH_PRESET', label: 'Switch Preset', description: 'Auto-overrides a day\'s preset (advanced)' },
];

function blankAction(type: ActionType): RuleAction {
  switch (type) {
    case 'ADD_ALARM': return { type: 'ADD_ALARM', time: '22:00', label: '', tonightOnly: true };
    case 'ADD_TIMER': return { type: 'ADD_TIMER', label: '', durationSeconds: 1500 };
    case 'SEND_NOTIFICATION': return { type: 'SEND_NOTIFICATION', message: '' };
    case 'SWITCH_PRESET': return { type: 'SWITCH_PRESET', presetId: '' };
  }
}

function describeAction(action: RuleAction, presets: any[]): string {
  switch (action.type) {
    case 'ADD_ALARM': return `Add alarm at ${action.time}${action.label ? ` — "${action.label}"` : ''}`;
    case 'ADD_TIMER': {
      const m = Math.floor(action.durationSeconds / 60);
      const s = action.durationSeconds % 60;
      return `Add timer${action.label ? ` "${action.label}"` : ''} (${m > 0 ? `${m}m ` : ''}${s > 0 ? `${s}s` : ''})`;
    }
    case 'SEND_NOTIFICATION': return `Notify: "${action.message}"`;
    case 'SWITCH_PRESET': {
      const p = presets.find((pr: any) => pr.id === action.presetId);
      return `Switch preset → ${p?.name ?? 'Unknown'}`;
    }
  }
}

export function RuleActionBuilder({ actions, onChange }: Props) {
  const presets = useAppStore((s) => s.presets);
  const [editing, setEditing] = useState<{ action: RuleAction; index: number | null } | null>(null);
  const [typePickerVisible, setTypePickerVisible] = useState(false);

  function openNew() {
    setEditing({ action: blankAction('ADD_ALARM'), index: null });
  }

  function openEdit(action: RuleAction, index: number) {
    setEditing({ action: { ...action }, index });
  }

  function save() {
    if (!editing) return;
    if (editing.index === null) {
      onChange([...actions, editing.action]);
    } else {
      onChange(actions.map((a, i) => (i === editing.index ? editing.action : a)));
    }
    setEditing(null);
  }

  function remove(index: number) {
    onChange(actions.filter((_, i) => i !== index));
  }

  function updateAction(patch: Partial<RuleAction>) {
    if (!editing) return;
    setEditing({ ...editing, action: { ...editing.action, ...patch } as RuleAction });
  }

  const editingAction = editing?.action;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {actions.length === 0 && (
        <Text style={styles.emptyText}>No actions yet. Add at least one.</Text>
      )}

      {actions.map((action, i) => (
        <View key={i} style={styles.actionRow}>
          <TouchableOpacity style={styles.actionMain} onPress={() => openEdit(action, i)}>
            <Text style={styles.actionType}>{ACTION_TYPES.find((t) => t.value === action.type)?.label}</Text>
            <Text style={styles.actionDesc}>{describeAction(action, presets)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(i)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Edit/New Modal */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editing?.index === null ? 'Add Action' : 'Edit Action'}</Text>
            {editingAction && (
              <ScrollView>
                {/* Type picker */}
                <Text style={styles.fieldLabel}>Action Type</Text>
                <TouchableOpacity style={styles.typeBtn} onPress={() => setTypePickerVisible(true)}>
                  <Text style={styles.typeBtnText}>{ACTION_TYPES.find((t) => t.value === editingAction.type)?.label ?? editingAction.type}</Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                {/* ADD_ALARM fields */}
                {editingAction.type === 'ADD_ALARM' && (
                  <>
                    <Text style={styles.fieldLabel}>Time</Text>
                    <TimePicker
                      value={editingAction.time || '22:00'}
                      onChange={(v) => updateAction({ time: v } as any)}
                    />
                    <Text style={styles.fieldLabel}>Label</Text>
                    <TextInput
                      style={styles.input}
                      value={editingAction.label}
                      onChangeText={(v) => updateAction({ label: v } as any)}
                      placeholder="Bedtime"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Tonight only (ephemeral)</Text>
                      <Switch
                        value={editingAction.tonightOnly}
                        onValueChange={(v) => updateAction({ tonightOnly: v } as any)}
                        trackColor={{ false: Colors.alarmOff, true: Colors.alarmOn }}
                        thumbColor={Colors.text}
                      />
                    </View>
                  </>
                )}


                {/* ADD_TIMER fields */}
                {editingAction.type === 'ADD_TIMER' && (
                  <>
                    <Text style={styles.fieldLabel}>Label</Text>
                    <TextInput
                      style={styles.input}
                      value={editingAction.label}
                      onChangeText={(v) => updateAction({ label: v } as any)}
                      placeholder="Evening wind-down"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <View style={styles.durationRow}>
                      <View style={styles.durationField}>
                        <TextInput
                          style={styles.input}
                          value={String(Math.floor(editingAction.durationSeconds / 60))}
                          onChangeText={(v) => updateAction({ durationSeconds: (parseInt(v) || 0) * 60 + (editingAction.durationSeconds % 60) } as any)}
                          keyboardType="number-pad"
                        />
                        <Text style={styles.durationUnit}>min</Text>
                      </View>
                      <Text style={styles.durationSep}>:</Text>
                      <View style={styles.durationField}>
                        <TextInput
                          style={styles.input}
                          value={String(editingAction.durationSeconds % 60)}
                          onChangeText={(v) => updateAction({ durationSeconds: Math.floor(editingAction.durationSeconds / 60) * 60 + (parseInt(v) || 0) } as any)}
                          keyboardType="number-pad"
                        />
                        <Text style={styles.durationUnit}>sec</Text>
                      </View>
                    </View>
                  </>
                )}

                {/* SEND_NOTIFICATION fields */}
                {editingAction.type === 'SEND_NOTIFICATION' && (
                  <>
                    <Text style={styles.fieldLabel}>Message</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={editingAction.message}
                      onChangeText={(v) => updateAction({ message: v } as any)}
                      placeholder="Office tomorrow — pack your bag!"
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                  </>
                )}

                {/* SWITCH_PRESET fields */}
                {editingAction.type === 'SWITCH_PRESET' && (
                  <>
                    <Text style={styles.fieldLabel}>Preset</Text>
                    {presets.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.optionRow, editingAction.presetId === p.id && styles.optionRowSelected]}
                        onPress={() => updateAction({ presetId: p.id } as any)}
                      >
                        <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                        <Text style={styles.optionText}>{p.name}</Text>
                        {editingAction.presetId === p.id && <Text style={styles.check}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                    {presets.length === 0 && <Text style={styles.emptyText}>No presets yet.</Text>}
                  </>
                )}

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={save}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Type picker sub-modal */}
      <Modal visible={typePickerVisible} transparent animationType="fade" onRequestClose={() => setTypePickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypePickerVisible(false)}>
          <View style={styles.subModalSheet}>
            {ACTION_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.optionRow, editingAction?.type === t.value && styles.optionRowSelected]}
                onPress={() => {
                  if (editing) {
                    setEditing({ ...editing, action: blankAction(t.value) });
                  }
                  setTypePickerVisible(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionText}>{t.label}</Text>
                  <Text style={styles.optionDesc}>{t.description}</Text>
                </View>
                {editingAction?.type === t.value && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
  actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, gap: 8 },
  actionMain: { flex: 1 },
  actionType: { fontSize: 13, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  actionDesc: { fontSize: 14, color: Colors.text, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: Colors.error, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, maxHeight: '90%' },
  subModalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  typeBtnText: { fontSize: 15, color: Colors.text },
  chevron: { fontSize: 18, color: Colors.textMuted },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: Colors.text },
  multilineInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  switchLabel: { fontSize: 15, color: Colors.text },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 4, backgroundColor: Colors.surfaceAlt, gap: 10 },
  optionRowSelected: { borderWidth: 1.5, borderColor: Colors.primary },
  optionText: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  optionDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  check: { fontSize: 18, color: Colors.primary },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durationField: { flex: 1 },
  durationUnit: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  durationSep: { fontSize: 24, color: Colors.textMuted, paddingBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.text, fontWeight: '700' },
});
