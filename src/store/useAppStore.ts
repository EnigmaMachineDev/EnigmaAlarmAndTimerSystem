import { create } from 'zustand';
import {
  AppData,
  Preset,
  Alarm,
  Timer,
  Stopwatch,
  Schedule,
  DayOverride,
  DayCustomization,
  RuleAlarm,
  Rule,
  Settings,
  DayKey,
  ResolvedDay,
  ResolvedDayAlarm,
  ResolvedDayTimer,
  ResolvedDayStopwatch,
  ActiveTimer,
  ActiveStopwatch,
  LapEntry,
} from '../types';
import { DEFAULT_APP_DATA } from '../constants/defaults';
import { saveAppData } from '../storage/fileStorage';
import { saveRuntimeState, RuntimeState } from '../storage/runtimeStorage';
import { todayDateString, getDayKey } from '../utils/dateUtils';
import { scheduleAlarmsForWeek, cancelAllAlarmsForDay, scheduleTimer, cancelTimer } from '../engine/scheduler';
import { generateId } from '../utils/uuid';

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppStore extends AppData {
  // Hydration
  hydrate: (data: AppData) => void;
  // Restores in-flight timer/stopwatch state loaded from runtimeState.json so
  // running/paused timers survive an app kill+relaunch.
  hydrateRuntime: (state: RuntimeState) => void;

  // Settings
  updateSettings: (patch: Partial<Settings>) => void;

  // Presets
  addPreset: (preset: Preset) => void;
  updatePreset: (id: string, patch: Partial<Preset>) => void;
  deletePreset: (id: string) => void;
  duplicatePreset: (id: string) => void;

  // Schedule
  setScheduleDay: (day: DayKey, presetId: string | null) => void;

  // Day Overrides
  addOverride: (override: DayOverride) => void;
  removeOverride: (id: string) => void;
  getOverrideForDate: (date: string) => DayOverride | undefined;

  // Day Customizations
  setCustomization: (customization: DayCustomization) => void;
  removeCustomization: (id: string) => void;
  getCustomizationForDate: (date: string) => DayCustomization | undefined;

  // Rules
  addRule: (rule: Rule) => void;
  updateRule: (id: string, patch: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;

  // Overrides
  pruneOldOverrides: () => void;

  // Resolved day selectors
  getResolvedDay: (date: string) => ResolvedDay;

  // Lookup an alarm by id across presets, customizations, and rule alarms.
  // Used by the "ringing" screen to determine whether Heavy Sleeper is on
  // when the native module emits an activeAlarmId event.
  findAlarmById: (alarmId: string) => Alarm | undefined;

  // Runtime timer/stopwatch state — persisted via runtimeStorage so running/
  // paused timers survive an app kill+relaunch (elapsed values computed from
  // epoch timestamps in each record).
  activeTimers: Record<string, ActiveTimer>;
  activeStopwatches: Record<string, ActiveStopwatch>;
  completedTimers: Record<string, boolean>;
  startTimer: (timerId: string) => void;
  pauseTimer: (timerId: string) => void;
  resumeTimer: (timerId: string) => void;
  resetTimer: (timerId: string) => void;
  markTimerDone: (timerId: string) => void;
  startStopwatch: (stopwatchId: string) => void;
  pauseStopwatch: (stopwatchId: string) => void;
  resumeStopwatch: (stopwatchId: string) => void;
  resetStopwatch: (stopwatchId: string) => void;
  lapStopwatch: (stopwatchId: string) => void;
}

// ─── Helper: persist after mutation ──────────────────────────────────────────

function persist(state: AppData) {
  saveAppData({
    version: state.version,
    settings: state.settings,
    presets: state.presets,
    schedule: state.schedule,
    overrides: state.overrides,
    dayCustomizations: state.dayCustomizations,
    rules: state.rules,
    ruleAlarms: state.ruleAlarms,
  });
}

// Persist only the runtime view of timers/stopwatches. Called after every
// mutator that touches activeTimers / activeStopwatches / completedTimers so
// the user's in-flight state survives the app being killed.
function persistRuntime(state: {
  activeTimers: Record<string, ActiveTimer>;
  activeStopwatches: Record<string, ActiveStopwatch>;
  completedTimers: Record<string, boolean>;
}) {
  saveRuntimeState({
    activeTimers: state.activeTimers,
    activeStopwatches: state.activeStopwatches,
    completedTimers: state.completedTimers,
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  ...DEFAULT_APP_DATA,

  activeTimers: {},
  activeStopwatches: {},
  completedTimers: {},

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrate: (data) => set({ ...data }),

  hydrateRuntime: (state) =>
    set({
      activeTimers: state.activeTimers,
      activeStopwatches: state.activeStopwatches,
      completedTimers: state.completedTimers,
    }),

  // ── Settings ───────────────────────────────────────────────────────────────
  updateSettings: (patch) =>
    set((s) => {
      const next = { ...s, settings: { ...s.settings, ...patch } };
      persist(next);
      return next;
    }),

  // ── Presets ────────────────────────────────────────────────────────────────
  addPreset: (preset) =>
    set((s) => {
      const next = { ...s, presets: [...s.presets, preset] };
      persist(next);
      return next;
    }),

  updatePreset: (id, patch) =>
    set((s) => {
      const next = {
        ...s,
        presets: s.presets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  deletePreset: (id) =>
    set((s) => {
      const deletedPreset = s.presets.find((p) => p.id === id);
      const next = {
        ...s,
        presets: s.presets.filter((p) => p.id !== id),
        schedule: Object.fromEntries(
          Object.entries(s.schedule).map(([day, pid]) => [day, pid === id ? null : pid])
        ) as Schedule,
        overrides: s.overrides.filter((o) => o.presetId !== id),
      };
      persist(next);
      // Cancel deleted preset's alarms across all 7 days before rescheduling,
      // since scheduleAlarmsForWeek only cancels alarms still in data.presets.
      if (deletedPreset) {
        (async () => {
          for (let offset = 0; offset < 7; offset++) {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            await cancelAllAlarmsForDay(deletedPreset.alarms, dateStr);
          }
          scheduleAlarmsForWeek(next);
        })();
      } else {
        scheduleAlarmsForWeek(next);
      }
      return next;
    }),

  duplicatePreset: (id) =>
    set((s) => {
      const source = s.presets.find((p) => p.id === id);
      if (!source) return s;
      const baseName = source.name.replace(/-copy-\d+$/, '');
      const copyPattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-copy-(\\d+)$`);
      const usedNumbers = s.presets
        .map((p) => { const m = p.name.match(copyPattern); return m ? parseInt(m[1], 10) : 0; })
        .filter((n) => n > 0);
      const nextNum = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
      const copy: Preset = {
        ...source,
        id: generateId(),
        name: `${baseName}-copy-${nextNum}`,
        alarms: source.alarms.map((a) => ({ ...a, id: generateId() })),
        timers: source.timers.map((t) => ({ ...t, id: generateId() })),
        stopwatches: source.stopwatches.map((sw) => ({ ...sw, id: generateId() })),
      };
      const next = { ...s, presets: [...s.presets, copy] };
      persist(next);
      return next;
    }),

  // ── Schedule ───────────────────────────────────────────────────────────────
  setScheduleDay: (day, presetId) =>
    set((s) => {
      const next = { ...s, schedule: { ...s.schedule, [day]: presetId } };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  // ── Overrides ──────────────────────────────────────────────────────────────
  addOverride: (override) =>
    set((s) => {
      const filtered = s.overrides.filter((o) => o.date !== override.date);
      const next = { ...s, overrides: [...filtered, override] };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  removeOverride: (id) =>
    set((s) => {
      const removed = s.overrides.find((o) => o.id === id);
      const next = { ...s, overrides: s.overrides.filter((o) => o.id !== id) };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  getOverrideForDate: (date) => get().overrides.find((o) => o.date === date),

  // ── Customizations ─────────────────────────────────────────────────────────
  setCustomization: (customization) =>
    set((s) => {
      const filtered = s.dayCustomizations.filter((c) => c.date !== customization.date);
      const next = { ...s, dayCustomizations: [...filtered, customization] };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  removeCustomization: (id) =>
    set((s) => {
      const next = {
        ...s,
        dayCustomizations: s.dayCustomizations.filter((c) => c.id !== id),
      };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  getCustomizationForDate: (date) =>
    get().dayCustomizations.find((c) => c.date === date),

  // ── Rules ──────────────────────────────────────────────────────────────────
  addRule: (rule) =>
    set((s) => {
      const next = { ...s, rules: [...s.rules, rule] };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  updateRule: (id, patch) =>
    set((s) => {
      const next = {
        ...s,
        rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  deleteRule: (id) =>
    set((s) => {
      const next = { ...s, rules: s.rules.filter((r) => r.id !== id) };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  toggleRule: (id) =>
    set((s) => {
      const next = {
        ...s,
        rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
      };
      persist(next);
      scheduleAlarmsForWeek(next);
      return next;
    }),

  pruneOldOverrides: () =>
    set((s) => {
      const today = todayDateString();
      const next = {
        ...s,
        overrides: s.overrides.filter((o) => o.date >= today),
      };
      persist(next);
      return next;
    }),

  // ── Resolved Day ───────────────────────────────────────────────────────────
  getResolvedDay: (date) => {
    const s = get();
    const dayKey = getDayKey(date);
    const override = s.overrides.find((o) => o.date === date);
    const customization = override
      ? undefined
      : s.dayCustomizations.find((c) => c.date === date);

    const presetId = override
      ? override.presetId
      : dayKey
      ? s.schedule[dayKey as DayKey]
      : null;

    const preset = presetId ? s.presets.find((p) => p.id === presetId) ?? null : null;

    let alarms: ResolvedDayAlarm[] = (preset?.alarms ?? []).map((a) => ({
      ...a,
      sourceLayer: 'preset' as const,
    }));
    let timers: ResolvedDayTimer[] = (preset?.timers ?? []).map((t) => ({
      ...t,
      sourceLayer: 'preset' as const,
    }));
    let stopwatches: ResolvedDayStopwatch[] = (preset?.stopwatches ?? []).map((sw) => ({
      ...sw,
      sourceLayer: 'preset' as const,
    }));

    // Apply customization layer
    if (customization) {
      alarms = alarms.filter((a) => !customization.removeAlarmIds.includes(a.id));
      alarms = alarms.map((a) => {
        const mod = customization.modifyAlarms.find((m) => m.id === a.id);
        return mod ? { ...a, ...mod, sourceLayer: 'customization' as const } : a;
      });
      alarms = [
        ...alarms,
        ...customization.addAlarms.map((a) => ({
          ...a,
          sourceLayer: 'customization' as const,
        })),
      ];
      timers = timers.filter((t) => !customization.removeTimerIds.includes(t.id));
      timers = [
        ...timers,
        ...customization.addTimers.map((t) => ({
          ...t,
          sourceLayer: 'customization' as const,
        })),
      ];
      stopwatches = stopwatches.filter(
        (sw) => !customization.removeStopwatchIds.includes(sw.id)
      );
      stopwatches = [
        ...stopwatches,
        ...customization.addStopwatches.map((sw) => ({
          ...sw,
          sourceLayer: 'customization' as const,
        })),
      ];
    }

    // Apply rule alarms layer (deduplicate by time+label against preset/customization alarms)
    const existingKeys = new Set(alarms.map((a) => `${a.time}|${a.label}`));
    const ruleAlarmItems: ResolvedDayAlarm[] = s.ruleAlarms
      .filter((ra) => ra.date === date)
      .filter((ra) => !existingKeys.has(`${ra.alarm.time}|${ra.alarm.label}`))
      .map((ra) => ({ ...ra.alarm, sourceLayer: 'rule' as const }));

    return {
      date,
      preset,
      isOverridden: !!override,
      isCustomized: !!customization,
      alarms: [...alarms, ...ruleAlarmItems],
      timers,
      stopwatches,
    };
  },

  // ── Alarm lookup ──────────────────────────────────────────────────────────
  // Searches every layer where an alarm can live: preset alarms, customization
  // addAlarms, and rule alarms. Returns the first match or undefined.
  findAlarmById: (alarmId) => {
    const s = get();
    for (const p of s.presets) {
      const found = p.alarms.find((a) => a.id === alarmId);
      if (found) return found;
    }
    for (const c of s.dayCustomizations) {
      const found = c.addAlarms.find((a) => a.id === alarmId);
      if (found) return found;
    }
    for (const ra of s.ruleAlarms) {
      if (ra.alarm.id === alarmId) return ra.alarm;
    }
    return undefined;
  },

  // ── Runtime Timer State ────────────────────────────────────────────────────
  startTimer: (timerId) => {
    const resolved = get().getResolvedDay(todayDateString());
    const timer = resolved.timers.find((t) => t.id === timerId);
    if (timer) scheduleTimer(timer, Date.now() + timer.durationSeconds * 1000);
    set((s) => {
      const { [timerId]: _removed, ...restCompleted } = s.completedTimers;
      const next = {
        completedTimers: restCompleted,
        activeTimers: {
          ...s.activeTimers,
          [timerId]: { timerId, startTimestamp: Date.now(), running: true },
        },
      };
      persistRuntime({ ...s, ...next });
      return next;
    });
  },

  pauseTimer: (timerId) => {
    cancelTimer(timerId);
    set((s) => {
      const active = s.activeTimers[timerId];
      if (!active || !active.running) return s;
      const resolved = get().getResolvedDay(todayDateString());
      const timer = resolved.timers.find((t) => t.id === timerId);
      const durationMs = timer ? timer.durationSeconds * 1000 : 0;
      const elapsed = Date.now() - active.startTimestamp;
      const remaining = durationMs - elapsed;
      const next = {
        activeTimers: {
          ...s.activeTimers,
          [timerId]: { ...active, running: false, pausedRemainingMs: Math.max(0, remaining) },
        },
      };
      persistRuntime({ ...s, ...next });
      return next;
    });
  },

  resumeTimer: (timerId) => {
    const active = get().activeTimers[timerId];
    const resolved = get().getResolvedDay(todayDateString());
    const timer = resolved.timers.find((t) => t.id === timerId);
    const remainingMs = active?.pausedRemainingMs ?? (timer ? timer.durationSeconds * 1000 : 0);
    if (timer) scheduleTimer(timer, Date.now() + remainingMs);
    set((s) => {
      const a = s.activeTimers[timerId];
      if (!a || a.running) return s;
      const r = a.pausedRemainingMs ?? 0;
      const next = {
        activeTimers: {
          ...s.activeTimers,
          [timerId]: {
            timerId,
            startTimestamp: Date.now() - (a.pausedRemainingMs != null
              ? (timer?.durationSeconds ?? 0) * 1000 - r
              : 0),
            running: true,
          },
        },
      };
      persistRuntime({ ...s, ...next });
      return next;
    });
  },

  resetTimer: (timerId) => {
    cancelTimer(timerId);
    set((s) => {
      const nextTimers = { ...s.activeTimers };
      delete nextTimers[timerId];
      const { [timerId]: _removed, ...restCompleted } = s.completedTimers;
      const next = { activeTimers: nextTimers, completedTimers: restCompleted };
      persistRuntime({ ...s, ...next });
      return next;
    });
  },

  markTimerDone: (timerId) => {
    cancelTimer(timerId);
    set((s) => {
      const nextTimers = { ...s.activeTimers };
      delete nextTimers[timerId];
      const next = {
        activeTimers: nextTimers,
        completedTimers: { ...s.completedTimers, [timerId]: true },
      };
      persistRuntime({ ...s, ...next });
      return next;
    });
  },

  startStopwatch: (stopwatchId) =>
    set((s) => {
      const next = {
        activeStopwatches: {
          ...s.activeStopwatches,
          [stopwatchId]: { stopwatchId, startTimestamp: Date.now(), running: true, laps: [] },
        },
      };
      persistRuntime({ ...s, ...next });
      return next;
    }),

  pauseStopwatch: (stopwatchId) =>
    set((s) => {
      const active = s.activeStopwatches[stopwatchId];
      if (!active || !active.running) return s;
      const totalElapsed = (active.pausedElapsedMs ?? 0) + (Date.now() - active.startTimestamp);
      const next = {
        activeStopwatches: {
          ...s.activeStopwatches,
          [stopwatchId]: { ...active, running: false, pausedElapsedMs: totalElapsed },
        },
      };
      persistRuntime({ ...s, ...next });
      return next;
    }),

  resumeStopwatch: (stopwatchId) =>
    set((s) => {
      const active = s.activeStopwatches[stopwatchId];
      if (!active || active.running) return s;
      const next = {
        activeStopwatches: {
          ...s.activeStopwatches,
          [stopwatchId]: { ...active, running: true, startTimestamp: Date.now(), pausedElapsedMs: active.pausedElapsedMs },
        },
      };
      persistRuntime({ ...s, ...next });
      return next;
    }),

  resetStopwatch: (stopwatchId) =>
    set((s) => {
      const nextStopwatches = { ...s.activeStopwatches };
      delete nextStopwatches[stopwatchId];
      const next = { activeStopwatches: nextStopwatches };
      persistRuntime({ ...s, ...next });
      return next;
    }),

  lapStopwatch: (stopwatchId) =>
    set((s) => {
      const active = s.activeStopwatches[stopwatchId];
      if (!active || !active.running) return s;
      const totalElapsed = (active.pausedElapsedMs ?? 0) + (Date.now() - active.startTimestamp);
      const lap: LapEntry = { index: active.laps.length + 1, elapsedMs: totalElapsed };
      const next = {
        activeStopwatches: {
          ...s.activeStopwatches,
          [stopwatchId]: { ...active, laps: [...active.laps, lap] },
        },
      };
      persistRuntime({ ...s, ...next });
      return next;
    }),
}));
