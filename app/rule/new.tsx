import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors } from '../../src/constants/colors';
import { generateId } from '../../src/utils/uuid';
import {
  RuleTrigger,
  ConditionType,
  ActionType,
  RuleCondition,
  RuleAction,
  AddAlarmAction,
  AddTimerAction,
  SendNotificationAction,
  SwitchPresetAction,
} from '../../src/types';
import { RuleConditionBuilder } from '../../src/components/RuleConditionBuilder';
import { RuleActionBuilder } from '../../src/components/RuleActionBuilder';

const TRIGGERS: { value: RuleTrigger; label: string; description: string }[] = [
  { value: 'START_OF_DAY', label: 'Start of Day', description: 'Fires at your configured day start time' },
  { value: 'END_OF_DAY', label: 'End of Day', description: 'Fires at your configured evening check time' },
  { value: 'PRESET_ACTIVATED', label: 'Preset Activated', description: 'Fires when a preset becomes active' },
  { value: 'PRESET_ASSIGNED', label: 'Preset Assigned', description: "Fires when tomorrow's preset is set or changed" },
];

export default function NewRuleScreen() {
  const router = useRouter();
  const addRule = useAppStore((s) => s.addRule);

  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<RuleTrigger>('START_OF_DAY');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [triggerPickerVisible, setTriggerPickerVisible] = useState(false);

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this rule.');
      return;
    }
    if (actions.length === 0) {
      Alert.alert('No actions', 'Please add at least one action.');
      return;
    }
    addRule({
      id: generateId(),
      name: name.trim(),
      enabled: true,
      trigger,
      conditions,
      actions,
    });
    router.back();
  }

  const selectedTrigger = TRIGGERS.find((t) => t.value === trigger)!;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.navBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Rule</Text>
        <TouchableOpacity onPress={handleSave} style={styles.navSaveBtn}>
          <Text style={styles.navSaveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.fieldLabel}>Rule Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Office Day Bedtime Prep"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
        />

        <Text style={styles.fieldLabel}>Trigger</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setTriggerPickerVisible(true)}>
          <View>
            <Text style={styles.pickerBtnValue}>{selectedTrigger.label}</Text>
            <Text style={styles.pickerBtnDesc}>{selectedTrigger.description}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <RuleConditionBuilder conditions={conditions} onChange={setConditions} />
        <RuleActionBuilder actions={actions} onChange={setActions} />

        <View style={styles.helpBox}>
          <Text style={styles.helpText}>
            All conditions are combined with AND logic. The rule fires its actions only when all conditions are true.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={triggerPickerVisible} transparent animationType="slide" onRequestClose={() => setTriggerPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTriggerPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Trigger</Text>
            {TRIGGERS.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.triggerRow, trigger === t.value && styles.triggerRowSelected]}
                onPress={() => { setTrigger(t.value); setTriggerPickerVisible(false); }}
              >
                <View style={styles.triggerInfo}>
                  <Text style={styles.triggerLabel}>{t.label}</Text>
                  <Text style={styles.triggerDesc}>{t.description}</Text>
                </View>
                {trigger === t.value && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
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
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  pickerBtnValue: { fontSize: 15, fontWeight: '600', color: Colors.text },
  pickerBtnDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted },
  helpBox: { backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginTop: 24 },
  helpText: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: Colors.surfaceAlt },
  triggerRowSelected: { borderWidth: 1.5, borderColor: Colors.primary },
  triggerInfo: { flex: 1 },
  triggerLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  triggerDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  check: { fontSize: 20, color: Colors.primary },
});
