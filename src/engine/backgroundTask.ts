import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { BACKGROUND_TASK_DAY_START, BACKGROUND_TASK_EVENING_CHECK } from '../constants/defaults';
import { loadAppData, saveAppDataImmediate } from '../storage/fileStorage';
import { runRulesEngine } from './rulesEngine';
import { scheduleAlarmsForDay, sendImmediateNotification } from './scheduler';
import { todayDateString } from '../utils/dateUtils';
import { getDayKey } from '../utils/dateUtils';
import { DayKey } from '../types';

// ─── Day Start Task ───────────────────────────────────────────────────────────

TaskManager.defineTask(BACKGROUND_TASK_DAY_START, async () => {
  try {
    const data = await loadAppData();
    const today = todayDateString();

    // Determine active preset
    const override = data.overrides.find((o) => o.date === today);
    const dayKey = getDayKey(today) as DayKey;
    const presetId = override ? override.presetId : data.schedule[dayKey];
    const preset = data.presets.find((p) => p.id === presetId);

    // Send "active preset" notification
    if (preset) {
      const alarmCount = preset.alarms.filter((a) => a.enabled).length;
      await sendImmediateNotification(
        `${preset.name} is active`,
        `${alarmCount} alarm${alarmCount !== 1 ? 's' : ''} scheduled for today`
      );
    } else {
      await sendImmediateNotification('No preset for today', 'Open Enigma to assign a preset.');
    }

    // Run START_OF_DAY rules
    const { ephemeralAlarms: newEphemeral, switchPresetActions } = await runRulesEngine(
      'START_OF_DAY',
      data
    );

    // Handle SWITCH_PRESET actions (take the first one)
    if (switchPresetActions.length > 0 && switchPresetActions[0].presetId) {
      const sp = switchPresetActions[0];
      const existingOverrideIdx = data.overrides.findIndex((o) => o.date === today);
      if (existingOverrideIdx >= 0) {
        data.overrides[existingOverrideIdx] = {
          ...data.overrides[existingOverrideIdx],
          presetId: sp.presetId,
          reason: 'Auto-switched by rule',
        };
      } else {
        data.overrides.push({
          id: Math.random().toString(36).slice(2),
          date: today,
          presetId: sp.presetId,
          reason: 'Auto-switched by rule',
        });
      }
    }

    // Merge new ephemeral alarms (dedup already handled in rulesEngine)
    data.ephemeralAlarms = [...data.ephemeralAlarms, ...newEphemeral];

    // Clean up fired/past ephemeral
    data.ephemeralAlarms = data.ephemeralAlarms.filter(
      (e) => !e.fired && e.date >= today
    );

    // Schedule alarm notifications for today
    if (preset) {
      await scheduleAlarmsForDay(preset.alarms, today);
    }

    await saveAppDataImmediate(data);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('[BackgroundTask] Day start error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Evening Check Task ───────────────────────────────────────────────────────

TaskManager.defineTask(BACKGROUND_TASK_EVENING_CHECK, async () => {
  try {
    const data = await loadAppData();

    const { ephemeralAlarms: newEphemeral } = await runRulesEngine('END_OF_DAY', data);

    data.ephemeralAlarms = [...data.ephemeralAlarms, ...newEphemeral];
    await saveAppDataImmediate(data);

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('[BackgroundTask] Evening check error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerBackgroundTasks(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_DAY_START);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_DAY_START, {
        minimumInterval: 60 * 60, // 1 hour minimum (OS may throttle further)
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }

    const isEveningRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_EVENING_CHECK);
    if (!isEveningRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_EVENING_CHECK, {
        minimumInterval: 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (err) {
    console.error('[BackgroundTask] Registration error:', err);
  }
}
