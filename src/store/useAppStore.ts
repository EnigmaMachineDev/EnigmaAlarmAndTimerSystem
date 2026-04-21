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
  EphemeralAlarm,
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
import { todayDateString, getDayKey } from '../utils/dateUtils';

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppStore extends AppData {
  // Hydration
  hydrate: (data: AppData) => void;

  // Settings
  updateSettings: (patch: Partial<Settings>) => void;

  // Presets
  addPreset: (preset: Preset) => void;
  updatePreset: (id: string, patch: Partial<Preset>) => void;
  deletePreset: (id: string) => void;

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

  // Ephemeral Alarms
  addEphemeralAlarm: (item: EphemeralAlarm) => void;
  markEphemeralFired: (id: string) => void;
  cleanupEphemeral: () => void;

  // Resolved day selectors
  getResolvedDay: (date: string) => ResolvedDay;

  // Runtime timer/stopwatch state (not persisted)
  activeTimers: Record<string, ActiveTimer>;
  activeStopwatches: Record<string, ActiveStopwatch>;
  startTimer: (timerId: string) => void;
  pauseTimer: (timerId: string) => void;
  resumeTimer: (timerId: string) => void;
  stopTimer: (timerId: string) => void;
  startStopwatch: (stopwatchId: string) => void;
  stopStopwatch: (stopwatchId: string) => void;
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
    ephemeralAlarms: state.ephemeralAlarms,
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  ...DEFAULT_APP_DATA,

  activeTimers: {},
  activeStopwatches: {},

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrate: (data) => set({ ...data }),

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
      return next;
    }),

  deletePreset: (id) =>
    set((s) => {
      const next = {
        ...s,
        presets: s.presets.filter((p) => p.id !== id),
        schedule: Object.fromEntries(
          Object.entries(s.schedule).map(([day, pid]) => [day, pid === id ? null : pid])
        ) as Schedule,
        overrides: s.overrides.filter((o) => o.presetId !== id),
      };
      persist(next);
      return next;
    }),

  // ── Schedule ───────────────────────────────────────────────────────────────
  setScheduleDay: (day, presetId) =>
    set((s) => {
      const next = { ...s, schedule: { ...s.schedule, [day]: presetId } };
      persist(next);
      return next;
    }),

  // ── Overrides ──────────────────────────────────────────────────────────────
  addOverride: (override) =>
    set((s) => {
      const filtered = s.overrides.filter((o) => o.date !== override.date);
      const next = { ...s, overrides: [...filtered, override] };
      persist(next);
      return next;
    }),

  removeOverride: (id) =>
    set((s) => {
      const next = { ...s, overrides: s.overrides.filter((o) => o.id !== id) };
      persist(next);
      return next;
    }),

  getOverrideForDate: (date) => get().overrides.find((o) => o.date === date),

  // ── Customizations ─────────────────────────────────────────────────────────
  setCustomization: (customization) =>
    set((s) => {
      const filtered = s.dayCustomizations.filter((c) => c.date !== customization.date);
      const next = { ...s, dayCustomizations: [...filtered, customization] };
      persist(next);
      return next;
    }),

  removeCustomization: (id) =>
    set((s) => {
      const next = {
        ...s,
        dayCustomizations: s.dayCustomizations.filter((c) => c.id !== id),
      };
      persist(next);
      return next;
    }),

  getCustomizationForDate: (date) =>
    get().dayCustomizations.find((c) => c.date === date),

  // ── Rules ──────────────────────────────────────────────────────────────────
  addRule: (rule) =>
    set((s) => {
      const next = { ...s, rules: [...s.rules, rule] };
      persist(next);
      return next;
    }),

  updateRule: (id, patch) =>
    set((s) => {
      const next = {
        ...s,
        rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      };
      persist(next);
      return next;
    }),

  deleteRule: (id) =>
    set((s) => {
      const next = { ...s, rules: s.rules.filter((r) => r.id !== id) };
      persist(next);
      return next;
    }),

  toggleRule: (id) =>
    set((s) => {
      const next = {
        ...s,
        rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
      };
      persist(next);
      return next;
    }),

  // ── Ephemeral Alarms ───────────────────────────────────────────────────────
  addEphemeralAlarm: (item) =>
    set((s) => {
      const next = { ...s, ephemeralAlarms: [...s.ephemeralAlarms, item] };
      persist(next);
      return next;
    }),

  markEphemeralFired: (id) =>
    set((s) => {
      const next = {
        ...s,
        ephemeralAlarms: s.ephemeralAlarms.map((e) =>
          e.id === id ? { ...e, fired: true } : e
        ),
      };
      persist(next);
      return next;
    }),

  cleanupEphemeral: () =>
    set((s) => {
      const today = todayDateString();
      const next = {
        ...s,
        ephemeralAlarms: s.ephemeralAlarms.filter(
          (e) => !e.fired && e.date >= today
        ),
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

    // Apply ephemeral layer
    const ephemeral = s.ephemeralAlarms.filter((e) => e.date === date && !e.fired);
    const ephemeralAlarmItems: ResolvedDayAlarm[] = ephemeral.map((e) => ({
      ...e.alarm,
      sourceLayer: 'ephemeral' as const,
    }));

    // Deduplicate ephemeral by time+label
    const existingKeys = new Set(alarms.map((a) => `${a.time}|${a.label}`));
    const uniqueEphemeral = ephemeralAlarmItems.filter(
      (e) => !existingKeys.has(`${e.time}|${e.label}`)
    );

    return {
      date,
      preset,
      isOverridden: !!override,
      isCustomized: !!customization,
      alarms: [...alarms, ...uniqueEphemeral],
      timers,
      stopwatches,
    };
  },

  // ── Runtime Timer State ────────────────────────────────────────────────────
  startTimer: (timerId) =>
    set((s) => ({
      activeTimers: {
        ...s.activeTimers,
        [timerId]: { timerId, startTimestamp: Date.now(), running: true },
      },
    })),

  pauseTimer: (timerId) =>
    set((s) => {
      const active = s.activeTimers[timerId];
      if (!active || !active.running) return s;
      const resolved = get().getResolvedDay(todayDateString());
      const timer = resolved.timers.find((t) => t.id === timerId);
      const durationMs = timer ? timer.durationSeconds * 1000 : 0;
      const elapsed = Date.now() - active.startTimestamp;
      const remaining = durationMs - elapsed;
      return {
        activeTimers: {
          ...s.activeTimers,
          [timerId]: { ...active, running: false, pausedRemainingMs: Math.max(0, remaining) },
        },
      };
    }),

  resumeTimer: (timerId) =>
    set((s) => {
      const active = s.activeTimers[timerId];
      if (!active || active.running) return s;
      const remaining = active.pausedRemainingMs ?? 0;
      return {
        activeTimers: {
          ...s.activeTimers,
          [timerId]: {
            timerId,
            startTimestamp: Date.now() - (active.pausedRemainingMs != null
              ? (get().getResolvedDay(todayDateString()).timers.find(t => t.id === timerId)?.durationSeconds ?? 0) * 1000 - remaining
              : 0),
            running: true,
          },
        },
      };
    }),

  stopTimer: (timerId) =>
    set((s) => {
      const next = { ...s.activeTimers };
      delete next[timerId];
      return { activeTimers: next };
    }),

  startStopwatch: (stopwatchId) =>
    set((s) => ({
      activeStopwatches: {
        ...s.activeStopwatches,
        [stopwatchId]: { stopwatchId, startTimestamp: Date.now(), running: true, laps: [] },
      },
    })),

  stopStopwatch: (stopwatchId) =>
    set((s) => {
      const next = { ...s.activeStopwatches };
      delete next[stopwatchId];
      return { activeStopwatches: next };
    }),

  lapStopwatch: (stopwatchId) =>
    set((s) => {
      const active = s.activeStopwatches[stopwatchId];
      if (!active) return s;
      const elapsedMs = Date.now() - active.startTimestamp;
      const lap: LapEntry = { index: active.laps.length + 1, elapsedMs };
      return {
        activeStopwatches: {
          ...s.activeStopwatches,
          [stopwatchId]: { ...active, laps: [...active.laps, lap] },
        },
      };
    }),
}));
