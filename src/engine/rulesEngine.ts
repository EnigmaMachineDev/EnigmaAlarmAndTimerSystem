import {
  AppData,
  Rule,
  RuleTrigger,
  RuleCondition,
  RuleAction,
  EphemeralAlarm,
  DayKey,
} from '../types';
import { todayDateString, dateStringForDaysFromNow, getDayKey } from '../utils/dateUtils';
import { generateId } from '../utils/uuid';
import * as Notifications from 'expo-notifications';

function getCurrentTimeString(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getPresetIdForDate(data: AppData, date: string): string | null {
  const override = data.overrides.find((o) => o.date === date);
  if (override) return override.presetId;
  const dayKey = getDayKey(date) as DayKey;
  return data.schedule[dayKey] ?? null;
}

function evaluateCondition(condition: RuleCondition, data: AppData): boolean {
  const today = todayDateString();
  const tomorrow = dateStringForDaysFromNow(1);
  const now = getCurrentTimeString();

  switch (condition.type) {
    case 'TODAY_PRESET_IS': {
      const pid = getPresetIdForDate(data, today);
      return pid === condition.value;
    }
    case 'TOMORROW_PRESET_IS': {
      const pid = getPresetIdForDate(data, tomorrow);
      return pid === condition.value;
    }
    case 'DAY_OF_WEEK_IS': {
      const dayKey = getDayKey(today);
      const days = Array.isArray(condition.value) ? condition.value : [condition.value];
      return days.includes(dayKey);
    }
    case 'TIME_IS_BEFORE': {
      return typeof condition.value === 'string' && now < condition.value;
    }
    case 'TIME_IS_AFTER': {
      return typeof condition.value === 'string' && now > condition.value;
    }
    default:
      return false;
  }
}

function evaluateConditions(conditions: RuleCondition[], data: AppData): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, data));
}

async function dispatchAction(
  action: RuleAction,
  data: AppData,
  collectedEphemeral: EphemeralAlarm[]
): Promise<void> {
  const today = todayDateString();
  const tomorrow = dateStringForDaysFromNow(1);

  switch (action.type) {
    case 'ADD_ALARM': {
      const targetDate = action.tonightOnly ? today : today;
      // Deduplicate: skip if alarm with same time+label already exists for that date
      const existingEphemeral = [
        ...data.ephemeralAlarms,
        ...collectedEphemeral,
      ];
      const duplicate = existingEphemeral.some(
        (e) =>
          e.date === targetDate &&
          e.alarm.time === action.time &&
          e.alarm.label === action.label
      );
      if (duplicate) break;

      // Also deduplicate against preset alarms for today
      const presetId = getPresetIdForDate(data, targetDate);
      const preset = data.presets.find((p) => p.id === presetId);
      const presetDuplicate = preset?.alarms.some(
        (a) => a.time === action.time && a.label === action.label
      );
      if (presetDuplicate) break;

      collectedEphemeral.push({
        id: generateId(),
        date: targetDate,
        alarm: {
          id: generateId(),
          label: action.label,
          time: action.time,
          enabled: true,
          sound: 'default',
          snoozeDurationMinutes: data.settings.defaultSnoozeDurationMinutes,
          origin: 'rule',
        },
        ruleId: '',
        fired: false,
      });
      break;
    }

    case 'SEND_NOTIFICATION': {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Enigma Rule',
          body: action.message,
          sound: true,
        },
        trigger: null,
      });
      break;
    }

    case 'SWITCH_PRESET': {
      // This is handled by the caller mutating the store (we just signal the intent here)
      console.log('[Rules] SWITCH_PRESET action — presetId:', action.presetId);
      break;
    }

    case 'ADD_TIMER': {
      // Ephemeral timers are stored as notes only — the store handles queueing
      console.log('[Rules] ADD_TIMER action — label:', action.label);
      break;
    }
  }
}

export interface RulesEngineResult {
  ephemeralAlarms: EphemeralAlarm[];
  switchPresetActions: Array<{ presetId: string }>;
}

export async function runRulesEngine(
  trigger: RuleTrigger,
  data: AppData
): Promise<RulesEngineResult> {
  const collectedEphemeral: EphemeralAlarm[] = [];
  const switchPresetActions: Array<{ presetId: string }> = [];

  const enabledRules = data.rules.filter((r) => r.enabled && r.trigger === trigger);

  for (const rule of enabledRules) {
    const conditionsMet = evaluateConditions(rule.conditions, data);
    if (!conditionsMet) continue;

    for (const action of rule.actions) {
      if (action.type === 'SWITCH_PRESET') {
        switchPresetActions.push({ presetId: action.presetId });
      } else {
        await dispatchAction(action, data, collectedEphemeral);
      }
    }
  }

  // Tag each ephemeral alarm with ruleId (simplified: use first rule that produced it)
  return { ephemeralAlarms: collectedEphemeral, switchPresetActions };
}
