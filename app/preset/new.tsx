import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { PRESET_COLORS, PRESET_ICONS } from '../../src/constants/defaults';
import { generateId } from '../../src/utils/uuid';
import { Alarm, Timer, Stopwatch } from '../../src/types';
import { AlarmEditor } from '../../src/components/AlarmEditor';
import { TimerEditor } from '../../src/components/TimerEditor';
import { StopwatchEditor } from '../../src/components/StopwatchEditor';

export default function NewPresetScreen() {
  const router = useRouter();
  const addPreset = useAppStore((s) => s.addPreset);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this preset.');
      return;
    }
    addPreset({
      id: generateId(),
      name: name.trim(),
      color,
      icon,
      alarms,
      timers,
      stopwatches,
    });
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.navBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Preset</Text>
        <TouchableOpacity onPress={handleSave} style={styles.navSaveBtn}>
          <Text style={styles.navSaveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Name */}
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Office Day"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
        />

        {/* Color */}
        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorRow}>
          {PRESET_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {/* Icon */}
        <Text style={styles.fieldLabel}>Icon</Text>
        <TouchableOpacity style={styles.iconPickerBtn} onPress={() => setIconPickerVisible(true)}>
          <Text style={styles.iconPickerSelected}>{icon}</Text>
          <Text style={styles.iconPickerChange}>Change icon ›</Text>
        </TouchableOpacity>

        {/* Alarms */}
        <AlarmEditor alarms={alarms} onChange={setAlarms} />

        {/* Timers */}
        <TimerEditor timers={timers} onChange={setTimers} />

        {/* Stopwatches */}
        <StopwatchEditor stopwatches={stopwatches} onChange={setStopwatches} />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Icon Picker Modal */}
      <Modal visible={iconPickerVisible} transparent animationType="slide" onRequestClose={() => setIconPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIconPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Icon</Text>
            <FlatList
              data={PRESET_ICONS}
              numColumns={5}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.iconOption, icon === item && styles.iconOptionSelected]}
                  onPress={() => { setIcon(item); setIconPickerVisible(false); }}
                >
                  <Text style={styles.iconOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navBtn: { padding: 4 },
  navBtnText: { color: Colors.textSecondary, fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  navSaveBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  navSaveBtnText: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 20 },
  textInput: { backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchSelected: { borderWidth: 3, borderColor: Colors.text },
  iconPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.border },
  iconPickerSelected: { fontSize: 28 },
  iconPickerChange: { color: Colors.primary, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12, maxHeight: '60%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  iconOption: { flex: 1, alignItems: 'center', justifyContent: 'center', margin: 6, padding: 10, borderRadius: 10, backgroundColor: Colors.surfaceAlt },
  iconOptionSelected: { borderWidth: 2, borderColor: Colors.primary },
  iconOptionText: { fontSize: 22 },
});
