import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm } from '../types';
import { NOTIFICATION_CHANNEL_ALARM, NOTIFICATION_CHANNEL_DEFAULT } from '../constants/defaults';

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ALARM, {
    name: 'Alarms',
    importance: Notifications.AndroidImportance.MAX,
    bypassDnd: true,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_DEFAULT, {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    android: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

export async function scheduleAlarmNotification(alarm: Alarm, date: string): Promise<string | null> {
  try {
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const scheduledDate = new Date(date + 'T00:00:00');
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Don't schedule alarms in the past
    if (scheduledDate.getTime() <= Date.now()) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.label || 'Alarm',
        body: `Alarm set for ${alarm.time}`,
        sound: true,
        data: { alarmId: alarm.id, date },
        ...(Platform.OS === 'android' && {
          channelId: NOTIFICATION_CHANNEL_ALARM,
          priority: Notifications.AndroidNotificationPriority.MAX,
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledDate,
      },
    });

    return notificationId;
  } catch (err) {
    console.error('[Scheduler] Failed to schedule alarm:', err);
    return null;
  }
}

export async function cancelAlarmNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.error('[Scheduler] Failed to cancel notification:', err);
  }
}

export async function cancelAllAlarmNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleAlarmsForDay(alarms: Alarm[], date: string): Promise<void> {
  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    await scheduleAlarmNotification(alarm, date);
  }
}

export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: NOTIFICATION_CHANNEL_DEFAULT }),
    },
    trigger: null,
  });
}
