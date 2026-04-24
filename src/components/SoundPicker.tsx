import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { Colors } from '../constants/colors';
import { ALARM_SOUNDS, AlarmSound } from '../constants/sounds';

interface Props {
  value: string;
  onChange: (soundId: string) => void;
}

export function SoundPicker({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const currentSound = ALARM_SOUNDS.find((s) => s.id === value) ?? ALARM_SOUNDS[0];

  const previewSource = ALARM_SOUNDS.find((s) => s.id === previewingId)?.asset ?? null;
  const player = useAudioPlayer(previewSource ?? undefined);

  async function handlePreview(sound: AlarmSound) {
    if (previewingId === sound.id) {
      // Stop preview
      player.pause();
      setPreviewingId(null);
      return;
    }
    setPreviewingId(sound.id);
    // player source changes reactively via useAudioPlayer argument change,
    // but since we can't call hooks conditionally we trigger play after state settles
    setTimeout(() => {
      try {
        player.seekTo(0);
        player.play();
      } catch (_) {}
    }, 100);
  }

  function handleSelect(sound: AlarmSound) {
    player.pause();
    setPreviewingId(null);
    onChange(sound.id);
    setVisible(false);
  }

  function handleClose() {
    player.pause();
    setPreviewingId(null);
    setVisible(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <Ionicons name="musical-notes-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.triggerText}>{currentSound.label}</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Alarm Sound</Text>
            <Text style={styles.subtitle}>
              Tap a sound to preview. The alarm will play the selected tone.
            </Text>
            <FlatList
              data={ALARM_SOUNDS}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => {
                const isSelected = value === item.id;
                const isPreviewing = previewingId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.rowLeft}>
                      {isSelected
                        ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                        : <Ionicons name="ellipse-outline" size={20} color={Colors.textSecondary} />
                      }
                      <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                        {item.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => handlePreview(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isPreviewing ? 'stop-circle-outline' : 'play-circle-outline'}
                        size={24}
                        color={isPreviewing ? Colors.warning : Colors.primary}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerText: { flex: 1, fontSize: 15, color: Colors.text },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 12, color: Colors.textMuted, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  rowSelected: { backgroundColor: Colors.primary + '18' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontSize: 15, color: Colors.text },
  rowLabelSelected: { fontWeight: '700', color: Colors.primary },
  previewBtn: { padding: 4 },
  closeBtn: { marginTop: 12, backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  closeBtnText: { color: Colors.text, fontWeight: '600', fontSize: 15 },
});
