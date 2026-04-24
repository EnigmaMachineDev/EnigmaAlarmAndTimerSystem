import * as Notifications from 'expo-notifications';
import RNAlarmModule from 'react-native-alarmageddon';
import { Platform } from 'react-native';
import { Alarm, AppData, DayKey } from '../types';
import { NOTIFICATION_CHANNEL_DEFAULT } from '../constants/defaults';
import { todayDateString, getDayKey } from '../utils/dateUtils';

// ─── General notification channel (rules, info) ───────────────────────────────

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_DEFAULT, {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // Request alarm-specific permissions (USE_EXACT_ALARM / SCHEDULE_EXACT_ALARM)
    const alarmGranted = await RNAlarmModule.ensurePermissions();
    if (!alarmGranted) return false;

    // Also request notification display permissions (Android 13+)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.error('[Scheduler] Permission request error:', err);
    return false;
  }
}

// ─── Alarm scheduling via AlarmManager (bypasses DND, full-screen intent) ─────

// Stable ID derived from alarm id + date so we can cancel by the same id later
function alarmScheduleId(alarmId: string, date: string): string {
  return `${alarmId}_${date.replace(/-/g, '')}`;
}

export async function scheduleAlarm(alarm: Alarm, date: string): Promise<boolean> {
  try {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    // Build the target time using local date components to avoid UTC offset issues
    const [year, month, day] = date.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

    if (scheduledDate.getTime() <= Date.now()) return false;

    await RNAlarmModule.scheduleAlarm({
      id: alarmScheduleId(alarm.id, date),
      datetimeISO: scheduledDate.toISOString(),
      title: alarm.label || 'Alarm',
      body: alarm.label ? alarm.label : `Scheduled for ${alarm.time}`,
      snoozeEnabled: true,
      snoozeInterval: alarm.snoozeDurationMinutes,
    });

    console.log(`[Scheduler] Scheduled alarm "${alarm.label || alarm.time}" for ${scheduledDate.toLocaleString()}`);
    return true;
  } catch (err) {
    console.error('[Scheduler] Failed to schedule alarm:', err);
    return false;
  }
}

// ─── Schedule all alarms for today from the resolved day ─────────────────────
// Call this on app launch and whenever the active preset or overrides change.

export async function scheduleAlarmsForToday(data: AppData): Promise<void> {
  const today = todayDateString();
  const override = data.overrides.find((o) => o.date === today);
  const dayKey = getDayKey(today) as DayKey;
  const presetId = override ? override.presetId : data.schedule[dayKey];
  const preset = data.presets.find((p) => p.id === presetId);

  if (!preset) {
    console.log('[Scheduler] No preset for today — nothing to schedule');
    return;
  }

  // Also include any ephemeral alarms for today
  const ephemeralAlarms = data.ephemeralAlarms
    .filter((e) => e.date === today && !e.fired)
    .map((e) => e.alarm);

  const allAlarms = [...preset.alarms, ...ephemeralAlarms];
  let scheduled = 0;
  for (const alarm of allAlarms) {
    if (!alarm.enabled) continue;
    const ok = await scheduleAlarm(alarm, today);
    if (ok) scheduled++;
  }
  console.log(`[Scheduler] scheduleAlarmsForToday: ${scheduled} alarm(s) scheduled for preset "${preset.name}"`);
}

export async function cancelAlarm(alarmId: string, date: string): Promise<void> {
  try {
    await RNAlarmModule.cancelAlarm(alarmScheduleId(alarmId, date));
  } catch (err) {
    console.error('[Scheduler] Failed to cancel alarm:', err);
  }
}

export async function cancelAllAlarmsForDay(alarms: Alarm[], date: string): Promise<void> {
  for (const alarm of alarms) {
    await cancelAlarm(alarm.id, date);
  }
}

export async function scheduleAlarmsForDay(alarms: Alarm[], date: string): Promise<void> {
  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    await scheduleAlarm(alarm, date);
  }
}

// ─── General (non-alarm) notifications via expo-notifications ─────────────────

export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' && { channelId: NOTIFICATION_CHANNEL_DEFAULT }),
      },
      trigger: null,
    });
  } catch (err) {
    console.error('[Scheduler] Failed to send notification:', err);
  }
}
