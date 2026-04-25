import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { BACKGROUND_TASK_DAY_START } from '../constants/defaults';
import { loadAppData, saveAppDataImmediate } from '../storage/fileStorage';
import { runRulesEngine } from './rulesEngine';
import { scheduleAlarmsForWeek } from './scheduler';
import { todayDateString } from '../utils/dateUtils';

// ─── Shared rule-run helper ────────────────────────────────────────────────────

async function runAndPersist(trigger: Parameters<typeof runRulesEngine>[0], data: Awaited<ReturnType<typeof loadAppData>>) {
  const today = todayDateString();
  const { switchPresetActions } = await runRulesEngine(trigger, data);

  // Handle SWITCH_PRESET — creates an override for today so next reschedule picks it up
  if (switchPresetActions.length > 0 && switchPresetActions[0].presetId) {
    const sp = switchPresetActions[0];
    const idx = data.overrides.findIndex((o) => o.date === today);
    if (idx >= 0) {
      data.overrides[idx] = { ...data.overrides[idx], presetId: sp.presetId, reason: 'Auto-switched by rule' };
    } else {
      data.overrides.push({ id: Math.random().toString(36).slice(2), date: today, presetId: sp.presetId, reason: 'Auto-switched by rule' });
    }
  }
}

// ─── Main background task (runs ~every minute) ────────────────────────────────

TaskManager.defineTask(BACKGROUND_TASK_DAY_START, async () => {
  try {
    const data = await loadAppData();
    const today = todayDateString();
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const isMidnight = h === 0 && m === 0;

    if (isMidnight) {
      // Prune old overrides
      data.overrides = data.overrides.filter((o) => o.date >= today);

      // Reschedule the full week now that the day has rolled over
      await scheduleAlarmsForWeek(data);

      await runAndPersist('START_OF_DAY', data);
    }

    // Always run TIME_OF_DAY rules (engine filters by current time)
    await runAndPersist('TIME_OF_DAY', data);

    await saveAppDataImmediate(data);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('[BackgroundTask] error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerBackgroundTasks(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_DAY_START);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_DAY_START, {
        minimumInterval: 60, // 1 minute — OS may still throttle on battery
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (err) {
    console.error('[BackgroundTask] Registration error:', err);
  }
}
