import * as Notifications from 'expo-notifications';
import RNAlarmModule from 'react-native-alarmageddon';
import { Platform } from 'react-native';
import { Alarm, AppData, DayKey, DayCustomization, RuleAlarm } from '../types';
import { evaluateRulesForWeek } from './rulesEngine';
import { NOTIFICATION_CHANNEL_DEFAULT } from '../constants/defaults';
import { getDayKey } from '../utils/dateUtils';

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

// Format a Date as a local ISO string WITHOUT timezone suffix, as required by alarmageddon
// e.g. "2025-01-15T08:30:00" — NOT "2025-01-15T12:30:00.000Z"
function toLocalISOString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function scheduleAlarm(alarm: Alarm, date: string): Promise<boolean> {
  try {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

    if (scheduledDate.getTime() <= Date.now()) {
      console.log(`[Scheduler] Skipping past alarm "${alarm.label || alarm.time}" (${toLocalISOString(scheduledDate)})`);
      return false;
    }

    const datetimeISO = toLocalISOString(scheduledDate);
    await RNAlarmModule.scheduleAlarm({
      id: alarmScheduleId(alarm.id, date),
      datetimeISO,
      title: alarm.label || 'Alarm',
      body: alarm.label ? alarm.label : `Scheduled for ${alarm.time}`,
      snoozeEnabled: true,
      snoozeInterval: alarm.snoozeDurationMinutes,
    });

    console.log(`[Scheduler] Scheduled alarm "${alarm.label || alarm.time}" id=${alarmScheduleId(alarm.id, date)} at ${datetimeISO}`);
    return true;
  } catch (err) {
    console.error('[Scheduler] Failed to schedule alarm:', err);
    return false;
  }
}

// ─── Schedule all alarms for the next 7 days ─────────────────────────────────
// Call this on app launch and whenever presets, schedule, or overrides change.
// Each day resolves independently (override → schedule → null), so Mon/Work,
// Sat/Weekend etc. all get their correct alarms scheduled up front.
// AlarmManager persists across app close and device reboot for the full week.

export async function scheduleAlarmsForWeek(data: AppData): Promise<void> {
  // Regenerate rule alarms fresh for the week before scheduling
  const ruleAlarms: RuleAlarm[] = evaluateRulesForWeek(data);
  let totalScheduled = 0;

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Cancel all previously scheduled alarms for this date across every preset
    for (const p of data.presets) {
      await cancelAllAlarmsForDay(p.alarms, dateStr);
    }
    // Cancel customization-added alarms (not part of any preset)
    const dateCustomization = data.dayCustomizations.find((c) => c.date === dateStr);
    if (dateCustomization) {
      await cancelAllAlarmsForDay(dateCustomization.addAlarms, dateStr);
    }
    // Cancel previously scheduled rule alarms for this date
    const dateRuleAlarms = data.ruleAlarms.filter((ra) => ra.date === dateStr);
    await cancelAllAlarmsForDay(dateRuleAlarms.map((ra) => ra.alarm), dateStr);

    // Resolve which preset applies for this date
    const override = data.overrides.find((o) => o.date === dateStr);
    const dayKey = getDayKey(dateStr) as DayKey;
    const presetId = override ? override.presetId : data.schedule[dayKey];
    const preset = data.presets.find((p) => p.id === presetId);

    if (!preset) continue;

    // Apply customization layer (only when no override — same rule as getResolvedDay)
    const customization: DayCustomization | undefined = override
      ? undefined
      : data.dayCustomizations.find((c) => c.date === dateStr);

    let resolvedAlarms: Alarm[] = preset.alarms;
    if (customization) {
      resolvedAlarms = resolvedAlarms.filter((a) => !customization.removeAlarmIds.includes(a.id));
      resolvedAlarms = resolvedAlarms.map((a) => {
        const mod = customization.modifyAlarms.find((m) => m.id === a.id);
        return mod ? { ...a, ...mod } : a;
      });
      resolvedAlarms = [...resolvedAlarms, ...customization.addAlarms];
    }

    // Rule alarms for this date (freshly evaluated above)
    const dateNewRuleAlarms = ruleAlarms
      .filter((ra) => ra.date === dateStr)
      .map((ra) => ra.alarm);

    const allAlarms = [...resolvedAlarms, ...dateNewRuleAlarms];
    for (const alarm of allAlarms) {
      if (!alarm.enabled) continue;
      const ok = await scheduleAlarm(alarm, dateStr);
      if (ok) totalScheduled++;
    }
  }

  console.log(`[Scheduler] scheduleAlarmsForWeek: ${totalScheduled} alarm(s) scheduled across next 7 days`);
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
