// ─── Enums & Literals ────────────────────────────────────────────────────────

export type Origin = 'manual' | 'preset' | 'rule' | 'customization';

export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type TimeFormat = '12h' | '24h';

export type AppTheme = 'system' | 'light' | 'dark';

export type RuleTrigger =
  | 'START_OF_DAY'
  | 'END_OF_DAY'
  | 'PRESET_ACTIVATED'
  | 'PRESET_ASSIGNED';

export type ConditionType =
  | 'TOMORROW_PRESET_IS'
  | 'TODAY_PRESET_IS'
  | 'DAY_OF_WEEK_IS'
  | 'TIME_IS_BEFORE'
  | 'TIME_IS_AFTER';

export type ActionType =
  | 'ADD_ALARM'
  | 'ADD_TIMER'
  | 'SEND_NOTIFICATION'
  | 'SWITCH_PRESET';

// ─── Alarm ───────────────────────────────────────────────────────────────────

export interface Alarm {
  id: string;
  label: string;
  time: string; // "HH:MM" 24h
  enabled: boolean;
  sound: string;
  snoozeDurationMinutes: number;
  origin: Origin;
}

// ─── Timer ───────────────────────────────────────────────────────────────────

export interface Timer {
  id: string;
  label: string;
  durationSeconds: number;
  autoRestart: boolean;
  origin: Origin;
}

// ─── Stopwatch ───────────────────────────────────────────────────────────────

export interface Stopwatch {
  id: string;
  label: string;
  origin: Origin;
}

// ─── Preset ──────────────────────────────────────────────────────────────────

export interface Preset {
  id: string;
  name: string;
  color: string;
  icon: string;
  alarms: Alarm[];
  timers: Timer[];
  stopwatches: Stopwatch[];
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export type Schedule = Record<DayKey, string | null>; // presetId or null

// ─── Day Override ────────────────────────────────────────────────────────────

export interface DayOverride {
  id: string;
  date: string; // "YYYY-MM-DD"
  presetId: string;
  reason: string;
}

// ─── Day Customization ───────────────────────────────────────────────────────

export interface AlarmModification {
  id: string; // existing alarm id
  time?: string;
  label?: string;
  enabled?: boolean;
  sound?: string;
  snoozeDurationMinutes?: number;
}

export interface DayCustomization {
  id: string;
  date: string; // "YYYY-MM-DD"
  addAlarms: Alarm[];
  removeAlarmIds: string[];
  modifyAlarms: AlarmModification[];
  addTimers: Timer[];
  removeTimerIds: string[];
  addStopwatches: Stopwatch[];
  removeStopwatchIds: string[];
}

// ─── Ephemeral Alarm ─────────────────────────────────────────────────────────

export interface EphemeralAlarm {
  id: string;
  date: string; // "YYYY-MM-DD"
  alarm: Alarm;
  ruleId: string;
  fired: boolean;
}

// ─── Rules ───────────────────────────────────────────────────────────────────

export interface RuleCondition {
  type: ConditionType;
  value: string | string[]; // presetId, day list, or time string
}

export interface AddAlarmAction {
  type: 'ADD_ALARM';
  time: string;
  label: string;
  tonightOnly: boolean;
}

export interface AddTimerAction {
  type: 'ADD_TIMER';
  label: string;
  durationSeconds: number;
}

export interface SendNotificationAction {
  type: 'SEND_NOTIFICATION';
  message: string;
}

export interface SwitchPresetAction {
  type: 'SWITCH_PRESET';
  presetId: string;
}

export type RuleAction =
  | AddAlarmAction
  | AddTimerAction
  | SendNotificationAction
  | SwitchPresetAction;

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  dayStartTime: string; // "HH:MM"
  eveningCheckTime: string; // "HH:MM"
  defaultSnoozeDurationMinutes: number;
  timeFormat: TimeFormat;
  theme: AppTheme;
  lastExportedAt: string | null; // ISO timestamp or null
}

// ─── AppData (persisted file) ─────────────────────────────────────────────────

export interface AppData {
  version: number;
  settings: Settings;
  presets: Preset[];
  schedule: Schedule;
  overrides: DayOverride[];
  dayCustomizations: DayCustomization[];
  rules: Rule[];
  ephemeralAlarms: EphemeralAlarm[];
}

// ─── Runtime timer/stopwatch state (not persisted in appdata) ────────────────

export interface ActiveTimer {
  timerId: string;
  startTimestamp: number; // epoch ms when started
  pausedRemainingMs?: number; // set when paused
  running: boolean;
}

export interface LapEntry {
  index: number;
  elapsedMs: number;
}

export interface ActiveStopwatch {
  stopwatchId: string;
  startTimestamp: number; // epoch ms when started
  running: boolean;
  laps: LapEntry[];
}

// ─── Resolved day view ───────────────────────────────────────────────────────

export interface ResolvedDayAlarm extends Alarm {
  sourceLayer: 'preset' | 'customization' | 'ephemeral';
}

export interface ResolvedDayTimer extends Timer {
  sourceLayer: 'preset' | 'customization' | 'ephemeral';
}

export interface ResolvedDayStopwatch extends Stopwatch {
  sourceLayer: 'preset' | 'customization' | 'ephemeral';
}

export interface ResolvedDay {
  date: string;
  preset: Preset | null;
  isOverridden: boolean;
  isCustomized: boolean;
  alarms: ResolvedDayAlarm[];
  timers: ResolvedDayTimer[];
  stopwatches: ResolvedDayStopwatch[];
}
