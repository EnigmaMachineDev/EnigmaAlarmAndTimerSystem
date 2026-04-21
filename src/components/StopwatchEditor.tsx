import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Stopwatch } from '../types';
import { generateId } from '../utils/uuid';

interface Props {
  stopwatches: Stopwatch[];
  onChange: (stopwatches: Stopwatch[]) => void;
}

export function StopwatchEditor({ stopwatches, onChange }: Props) {
  const [editing, setEditing] = useState<Stopwatch | null>(null);
  const [isNew, setIsNew] = useState(false);

  function openNew() {
    setEditing({ id: generateId(), label: '', origin: 'preset' });
    setIsNew(true);
  }

  function openEdit(sw: Stopwatch) {
    setEditing({ ...sw });
    setIsNew(false);
  }

  function save() {
    if (!editing) return;
    if (isNew) {
      onChange([...stopwatches, editing]);
    } else {
      onChange(stopwatches.map((s) => (s.id === editing.id ? editing : s)));
    }
    setEditing(null);
  }

  function deleteSw(id: string) {
    Alert.alert('Remove Stopwatch', 'Remove this stopwatch from the preset?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange(stopwatches.filter((s) => s.id !== id)) },
    ]);
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Stopwatches</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {stopwatches.length === 0 && (
        <Text style={styles.emptyText}>No stopwatches. Tap + Add to create one.</Text>
      )}

      {stopwatches.map((sw) => (
        <View key={sw.id} style={styles.itemRow}>
          <TouchableOpacity style={styles.itemMain} onPress={() => openEdit(sw)}>
            <Text style={styles.itemLabel}>{sw.label || 'Untitled Stopwatch'}</Text>
            <Text style={styles.itemMeta}>Counts up · Manual start · Lap support</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteSw(sw.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{isNew ? 'New Stopwatch' : 'Edit Stopwatch'}</Text>
            {editing && (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Label</Text>
                  <TextInput
                    style={styles.input}
                    value={editing.label}
                    onChangeText={(v) => setEditing({ ...editing, label: v })}
                    placeholder="e.g. Commute"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={save}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
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
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: Colors.text, fontWeight: '700' },
});
