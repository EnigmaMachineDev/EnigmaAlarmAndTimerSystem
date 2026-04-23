import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { formatTime } from '../utils/dateUtils';

interface Props {
  value: string; // "HH:MM" 24h
  onChange: (value: string) => void;
  label?: string;
}

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function TimePicker({ value, onChange, label }: Props) {
  const use12h = useAppStore((s) => s.settings.timeFormat === '12h');
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState<Date>(timeStringToDate(value));

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (!selected) return;
    if (Platform.OS === 'android') {
      setShow(false);
      onChange(dateToTimeString(selected));
    } else {
      setPending(selected);
    }
  }

  function confirmIOS() {
    onChange(dateToTimeString(pending));
    setShow(false);
  }

  const displayLabel = formatTime(value, use12h);

  return (
    <View>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => { setPending(timeStringToDate(value)); setShow(true); }}
      >
        {label && <Text style={styles.label}>{label}</Text>}
        <Text style={styles.timeText}>{displayLabel}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Android: inline picker shown directly */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour={!use12h}
          display="default"
          onChange={handleChange}
        />
      )}

      {/* iOS: modal with confirm/cancel */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={styles.iosDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pending}
                mode="time"
                is24Hour={!use12h}
                display="spinner"
                onChange={handleChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  timeText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iosCancelText: { fontSize: 16, color: Colors.textSecondary },
  iosDoneText: { fontSize: 16, fontWeight: '700', color: Colors.primaryLight },
  iosPicker: { height: 200 },
});
