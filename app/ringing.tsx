import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  BackHandler,
  AppState,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RNAlarmModule from 'react-native-alarmageddon';
import { Colors } from '../src/constants/colors';
import { generateDismissCode } from '../src/utils/dismissCode';
import { useAppStore } from '../src/store/useAppStore';

// Heavy Sleeper Mode "ringing" screen.
//
// Mounted by the root layout when the native alarmageddon module emits
// `activeAlarmId` for an alarm whose `heavySleeperEnabled` flag is true. The
// user must type a freshly-generated 20-character random code to call
// stopCurrentAlarm / snoozeCurrentAlarm — the native side is patched so the
// notification's Stop / Snooze action buttons are hidden in this mode.
//
// The screen is presented as a full-screen modal with gestures and the
// hardware Back button disabled, so it cannot be dismissed without entering
// the code.

export default function RingingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scheduleId?: string; alarmId?: string; label?: string }>();
  const scheduleId = params.scheduleId ?? '';
  const alarmId = params.alarmId ?? '';
  const label = params.label ?? '';

  const findAlarmById = useAppStore((s) => s.findAlarmById);
  const dismissCodeLength = useAppStore((s) => s.settings.dismissCodeLength);
  const alarm = alarmId ? findAlarmById(alarmId) : undefined;
  const snoozeMinutes = alarm?.snoozeDurationMinutes ?? 10;

  // Generate the dismiss code exactly once per mount. If the alarm fires
  // again later (e.g. after snooze) the screen will be re-mounted and a new
  // code will be generated automatically.
  const code = useMemo(() => generateDismissCode(dismissCodeLength), [dismissCodeLength]);

  const [input, setInput] = useState('');
  const [showError, setShowError] = useState(false);
  const [busy, setBusy] = useState<'stop' | 'snooze' | null>(null);
  const [now, setNow] = useState(() => new Date());

  const shake = useRef(new Animated.Value(0)).current;

  const matches = input === code;

  // Update the on-screen clock every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Block hardware Back button while ringing.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Gentle pulsing vibration to mirror the alarm.
  useEffect(() => {
    const PATTERN = [0, 600, 400];
    Vibration.vibrate(PATTERN, true);
    return () => Vibration.cancel();
  }, []);

  // If the native side stops the alarm for any reason (e.g. the 30-minute
  // safety auto-stop fires, or another path calls stopCurrentAlarm), close
  // this screen so the user isn't stuck on it.
  useEffect(() => {
    const sub = RNAlarmModule.onAlarmStateChange((activeId) => {
      if (activeId == null) {
        // Alarm stopped — leave the screen.
        if (router.canGoBack()) router.back();
      }
    });
    return () => sub.remove();
  }, [router]);

  // Re-check the active alarm whenever the app comes to the foreground; if it
  // has already been stopped natively we should leave.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        try {
          const active = await RNAlarmModule.getCurrentAlarmPlaying();
          if (!active && router.canGoBack()) router.back();
        } catch {
          // ignore
        }
      }
    });
    return () => sub.remove();
  }, [router]);

  function triggerShake() {
    setShowError(true);
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleStop() {
    if (!matches || busy) {
      triggerShake();
      return;
    }
    setBusy('stop');
    try {
      await RNAlarmModule.stopCurrentAlarm(scheduleId || alarmId);
    } catch (err) {
      console.warn('[Ringing] stopCurrentAlarm failed:', err);
    } finally {
      setBusy(null);
      if (router.canGoBack()) router.back();
    }
  }

  async function handleSnooze() {
    if (!matches || busy) {
      triggerShake();
      return;
    }
    setBusy('snooze');
    try {
      await RNAlarmModule.snoozeCurrentAlarm(scheduleId || alarmId, snoozeMinutes);
    } catch (err) {
      console.warn('[Ringing] snoozeCurrentAlarm failed:', err);
    } finally {
      setBusy(null);
      if (router.canGoBack()) router.back();
    }
  }

  const shakeTranslate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10],
  });

  const clockText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.clockText}>{clockText}</Text>
          {label ? <Text style={styles.labelText}>{label}</Text> : null}
          <Text style={styles.heavyTag}>HEAVY SLEEPER MODE</Text>
        </View>

        <View style={styles.codeBlock}>
          <Text style={styles.codeHelp}>
            Type the code below exactly to stop or snooze this alarm.
          </Text>
          <Text
            style={styles.codeText}
            selectable={false}
            accessibilityLabel="Dismiss code"
          >
            {code}
          </Text>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeTranslate }] }}>
          <TextInput
            style={[
              styles.input,
              showError && !matches ? styles.inputError : null,
              matches ? styles.inputOk : null,
            ]}
            value={input}
            onChangeText={(v) => {
              setInput(v);
              if (showError) setShowError(false);
            }}
            placeholder="Enter the code"
            placeholderTextColor={Colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            multiline={false}
            editable={!busy}
          />
        </Animated.View>

        {showError && !matches ? (
          <Text style={styles.errorText}>Incorrect — try again.</Text>
        ) : (
          <Text style={styles.errorText}> </Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.snoozeBtn,
              !matches || busy ? styles.buttonDisabled : null,
            ]}
            onPress={handleSnooze}
            disabled={!!busy}
          >
            <Text style={styles.buttonText}>
              {busy === 'snooze' ? 'Snoozing…' : `Snooze ${snoozeMinutes}m`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.stopBtn,
              !matches || busy ? styles.buttonDisabled : null,
            ]}
            onPress={handleStop}
            disabled={!!busy}
          >
            <Text style={styles.buttonText}>{busy === 'stop' ? 'Stopping…' : 'Stop'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 16 },
  clockText: { fontSize: 56, fontWeight: '700', color: Colors.text, letterSpacing: 1 },
  labelText: { fontSize: 18, color: Colors.textSecondary, marginTop: 4 },
  heavyTag: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Colors.warning,
    backgroundColor: Colors.warning + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  codeBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeHelp: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 10,
    textAlign: 'center',
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primaryLight,
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    color: Colors.text,
    fontFamily: 'monospace',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  inputError: { borderColor: Colors.error },
  inputOk: { borderColor: Colors.success },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 8,
    minHeight: 18,
    textAlign: 'center',
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  snoozeBtn: { backgroundColor: Colors.surfaceAlt },
  stopBtn: { backgroundColor: Colors.primary },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
});
