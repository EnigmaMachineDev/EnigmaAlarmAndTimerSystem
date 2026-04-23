import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/colors';
import { RuleCondition, ConditionType, ConditionLogic, DayKey } from '../types';
import { useAppStore } from '../store/useAppStore';
import { DAY_KEYS } from '../constants/defaults';
import { TimePicker } from './TimePicker';

interface Props {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
  conditionLogic: ConditionLogic;
  onLogicChange: (logic: ConditionLogic) => void;
}

const CONDITION_TYPES: { value: ConditionType; label: string; inputType: 'preset' | 'days' | 'time' }[] = [
  { value: 'TOMORROW_PRESET_IS', label: "Tomorrow's preset is", inputType: 'preset' },
  { value: 'TODAY_PRESET_IS', label: "Today's preset is", inputType: 'preset' },
  { value: 'DAY_OF_WEEK_IS', label: 'Day of week is', inputType: 'days' },
  { value: 'TIME_IS_BEFORE', label: 'Time is before', inputType: 'time' },
  { value: 'TIME_IS_AFTER', label: 'Time is after', inputType: 'time' },
];

export function RuleConditionBuilder({ conditions, onChange, conditionLogic, onLogicChange }: Props) {
  const presets = useAppStore((s) => s.presets);
  const [editing, setEditing] = useState<{ type: ConditionType; value: string | string[]; negate: boolean; index: number | null } | null>(null);
  const [typePickerVisible, setTypePickerVisible] = useState(false);

  function openNew() {
    setEditing({ type: 'TOMORROW_PRESET_IS', value: presets[0]?.id ?? '', negate: false, index: null });
  }

  function openEdit(condition: RuleCondition, index: number) {
    setEditing({ type: condition.type, value: condition.value, negate: condition.negate ?? false, index });
  }

  function save() {
    if (!editing) return;
    const newCondition: RuleCondition = { type: editing.type, value: editing.value, negate: editing.negate || undefined };
    if (editing.index === null) {
      onChange([...conditions, newCondition]);
    } else {
      onChange(conditions.map((c, i) => (i === editing.index ? newCondition : c)));
    }
    setEditing(null);
  }

  function remove(index: number) {
    onChange(conditions.filter((_, i) => i !== index));
  }

  function describeCondition(c: RuleCondition): string {
    const def = CONDITION_TYPES.find((t) => t.value === c.type);
    if (!def) return c.type;
    const prefix = c.negate ? 'NOT ' : '';
    if (def.inputType === 'preset') {
      const p = presets.find((pr) => pr.id === c.value);
      return `${prefix}${def.label}: ${p?.name ?? 'Unknown'}`;
    }
    if (def.inputType === 'days') {
      const days = Array.isArray(c.value) ? c.value : [c.value];
      return `${prefix}${def.label}: ${days.join(', ')}`;
    }
    return `${prefix}${def.label} ${c.value}`;
  }

  const editingDef = editing ? CONDITION_TYPES.find((t) => t.value === editing.type) : null;

  function toggleDay(day: DayKey) {
    if (!editing) return;
    const current = Array.isArray(editing.value) ? editing.value : [];
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setEditing({ ...editing, value: updated });
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Conditions</Text>
        <View style={styles.headerRight}>
          {/* AND / OR toggle */}
          <View style={styles.logicToggle}>
            <TouchableOpacity
              style={[styles.logicBtn, conditionLogic === 'AND' && styles.logicBtnActive]}
              onPress={() => onLogicChange('AND')}
            >
              <Text style={[styles.logicBtnText, conditionLogic === 'AND' && styles.logicBtnTextActive]}>AND</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logicBtn, conditionLogic === 'OR' && styles.logicBtnActive]}
              onPress={() => onLogicChange('OR')}
            >
              <Text style={[styles.logicBtnText, conditionLogic === 'OR' && styles.logicBtnTextActive]}>OR</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {conditions.length === 0 && (
        <Text style={styles.emptyText}>No conditions — rule fires on every trigger.</Text>
      )}

      {conditions.map((c, i) => (
        <View key={i} style={styles.conditionRow}>
          <TouchableOpacity style={styles.conditionMain} onPress={() => openEdit(c, i)}>
            {c.negate && <Text style={styles.negateTag}>NOT</Text>}
            <Text style={styles.conditionText}>{describeCondition(c)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(i)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editing?.index === null ? 'Add Condition' : 'Edit Condition'}
            </Text>
            {editing && (
              <ScrollView>
                {/* Type picker */}
                <Text style={styles.fieldLabel}>Type</Text>
                <TouchableOpacity style={styles.typeBtn} onPress={() => setTypePickerVisible(true)}>
                  <Text style={styles.typeBtnText}>
                    {CONDITION_TYPES.find((t) => t.value === editing.type)?.label ?? editing.type}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                {/* Value input based on type */}
                {editingDef?.inputType === 'preset' && (
                  <>
                    <Text style={styles.fieldLabel}>Preset</Text>
                    {presets.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.optionRow, editing.value === p.id && styles.optionRowSelected]}
                        onPress={() => setEditing({ ...editing, value: p.id })}
                      >
                        <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                        <Text style={styles.optionText}>{p.name}</Text>
                        {editing.value === p.id && <Text style={styles.check}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                    {presets.length === 0 && <Text style={styles.emptyText}>No presets yet.</Text>}
                  </>
                )}

                {editingDef?.inputType === 'days' && (
                  <>
                    <Text style={styles.fieldLabel}>Days</Text>
                    <View style={styles.dayGrid}>
                      {DAY_KEYS.map((d) => {
                        const selected = Array.isArray(editing.value) && editing.value.includes(d);
                        return (
                          <TouchableOpacity
                            key={d}
                            style={[styles.dayChip, selected && styles.dayChipSelected]}
                            onPress={() => toggleDay(d)}
                          >
                            <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{d}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {editingDef?.inputType === 'time' && (
                  <>
                    <Text style={styles.fieldLabel}>Time</Text>
                    <View style={styles.timePickerWrapper}>
                      <TimePicker
                        value={typeof editing.value === 'string' && editing.value ? editing.value : '22:00'}
                        onChange={(v) => setEditing({ ...editing, value: v })}
                      />
                    </View>
                  </>
                )}

                {/* NOT toggle */}
                <View style={styles.negateRow}>
                  <Text style={styles.negateLabel}>Negate condition (NOT)</Text>
                  <TouchableOpacity
                    style={[styles.negateToggle, editing.negate && styles.negateToggleActive]}
                    onPress={() => setEditing({ ...editing, negate: !editing.negate })}
                  >
                    <Text style={[styles.negateToggleText, editing.negate && styles.negateToggleTextActive]}>
                      {editing.negate ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

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
            {CONDITION_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.optionRow, editing?.type === t.value && styles.optionRowSelected]}
                onPress={() => {
                  if (editing) {
                    const defaultVal = t.inputType === 'preset' ? (presets[0]?.id ?? '') : t.inputType === 'days' ? [] : '22:00';
                    setEditing({ ...editing, type: t.value, value: defaultVal });
                  }
                  setTypePickerVisible(false);
                }}
              >
                <Text style={styles.optionText}>{t.label}</Text>
                {editing?.type === t.value && <Text style={styles.check}>✓</Text>}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logicToggle: { flexDirection: 'row', borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  logicBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceAlt },
  logicBtnActive: { backgroundColor: Colors.primary },
  logicBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  logicBtnTextActive: { color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  emptyText: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  conditionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, gap: 8 },
  conditionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  negateTag: { fontSize: 11, fontWeight: '700', color: Colors.error, backgroundColor: Colors.error + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  conditionText: { fontSize: 14, color: Colors.text, flex: 1 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: Colors.error, fontSize: 16 },
  timePickerWrapper: { marginBottom: 4 },
  negateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4 },
  negateLabel: { fontSize: 14, color: Colors.text },
  negateToggle: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  negateToggleActive: { backgroundColor: Colors.error + '33', borderColor: Colors.error },
  negateToggleText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  negateToggleTextActive: { color: Colors.error },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, maxHeight: '85%' },
  subModalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  typeBtnText: { fontSize: 15, color: Colors.text },
  chevron: { fontSize: 18, color: Colors.textMuted },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 4, backgroundColor: Colors.surfaceAlt, gap: 10 },
  optionRowSelected: { borderWidth: 1.5, borderColor: Colors.primary },
  optionText: { flex: 1, fontSize: 14, color: Colors.text },
  check: { fontSize: 18, color: Colors.primary },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dayChipSelected: { backgroundColor: Colors.primary },
  dayChipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  dayChipTextSelected: { color: Colors.text },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: Colors.text },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.text, fontWeight: '700' },
});
