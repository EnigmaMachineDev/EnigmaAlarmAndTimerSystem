import {
  AppData,
  RuleTrigger,
  RuleCondition,
  RuleAlarm,
  DayKey,
} from '../types';
import { getDayKey } from '../utils/dateUtils';
import { generateId } from '../utils/uuid';
import * as Notifications from 'expo-notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Evaluate a single condition against a specific date.
// TIME_IS_BEFORE / TIME_IS_AFTER are runtime-only checks — always true here
// since we are pre-scheduling, not reacting to the current moment.
function evaluateConditionForDate(condition: RuleCondition, data: AppData, date: string): boolean {
  // Compute tomorrow relative to `date`, not today
  const d = new Date(date + 'T12:00:00');
  const tomorrowDate = new Date(d);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

  switch (condition.type) {
    case 'TODAY_PRESET_IS': {
      const pid = getPresetIdForDate(data, date);
      return pid === condition.value;
    }
    case 'TOMORROW_PRESET_IS': {
      const pid = getPresetIdForDate(data, tomorrowStr);
      return pid === condition.value;
    }
    case 'DAY_OF_WEEK_IS': {
      const dayKey = getDayKey(date);
      const days = Array.isArray(condition.value) ? condition.value : [condition.value];
      return days.includes(dayKey);
    }
    case 'TIME_IS_BEFORE':
    case 'TIME_IS_AFTER':
      // Not meaningful for pre-scheduling; treat as passing so the alarm is included
      return true;
    default:
      return false;
  }
}

function evaluateConditionsForDate(
  conditions: RuleCondition[],
  logic: 'AND' | 'OR',
  data: AppData,
  date: string
): boolean {
  if (conditions.length === 0) return true;
  const results = conditions.map((c) => {
    const result = evaluateConditionForDate(c, data, date);
    return c.negate ? !result : result;
  });
  return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

// ─── Weekly rule alarm evaluation ─────────────────────────────────────────────
// Evaluates all enabled ADD_ALARM rules against each of the next 7 days and
// returns a fresh RuleAlarm[] list. Called before every scheduleAlarmsForWeek.

export function evaluateRulesForWeek(data: AppData): RuleAlarm[] {
  const result: RuleAlarm[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    for (const rule of data.rules) {
      if (!rule.enabled) continue;

      const conditionsMet = evaluateConditionsForDate(
        rule.conditions,
        rule.conditionLogic ?? 'AND',
        data,
        dateStr
      );
      if (!conditionsMet) continue;

      for (const action of rule.actions) {
        if (action.type !== 'ADD_ALARM') continue;

        // Deduplicate against preset alarms for this date
        const presetId = getPresetIdForDate(data, dateStr);
        const preset = data.presets.find((p) => p.id === presetId);
        if (preset?.alarms.some((a) => a.time === action.time && a.label === action.label)) continue;

        // Deduplicate against already collected rule alarms for this date
        if (result.some((ra) => ra.date === dateStr && ra.alarm.time === action.time && ra.alarm.label === action.label)) continue;

        result.push({
          id: generateId(),
          date: dateStr,
          ruleId: rule.id,
          alarm: {
            id: generateId(),
            label: action.label,
            time: action.time,
            enabled: true,
            sound: 'default',
            snoozeDurationMinutes: data.settings.defaultSnoozeDurationMinutes,
            origin: 'rule',
          },
        });
      }
    }
  }

  return result;
}

// ─── Event-based rule runner (SEND_NOTIFICATION, SWITCH_PRESET) ───────────────
// Still trigger-driven — runs in background task for START_OF_DAY / TIME_OF_DAY.
// ADD_ALARM actions are intentionally ignored here (handled by evaluateRulesForWeek).

export interface RulesEngineResult {
  switchPresetActions: Array<{ presetId: string }>;
}

export async function runRulesEngine(
  trigger: RuleTrigger,
  data: AppData
): Promise<RulesEngineResult> {
  const switchPresetActions: Array<{ presetId: string }> = [];
  const now = getCurrentTimeString();

  const enabledRules = data.rules.filter((r) => {
    if (!r.enabled) return false;
    if (r.trigger !== trigger) return false;
    if (r.trigger === 'TIME_OF_DAY') return r.triggerTime === now;
    return true;
  });

  for (const rule of enabledRules) {
    const conditionsMet = evaluateConditionsForDate(
      rule.conditions,
      rule.conditionLogic ?? 'AND',
      data,
      new Date().toISOString().slice(0, 10)
    );
    if (!conditionsMet) continue;

    for (const action of rule.actions) {
      switch (action.type) {
        case 'SEND_NOTIFICATION':
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Enigma Rule', body: action.message, sound: true },
            trigger: null,
          });
          break;
        case 'SWITCH_PRESET':
          switchPresetActions.push({ presetId: action.presetId });
          break;
      }
    }
  }

  return { switchPresetActions };
}
