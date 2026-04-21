import { AppData, Settings, Schedule } from '../types';

export const CURRENT_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  dayStartTime: '06:00',
  eveningCheckTime: '20:00',
  defaultSnoozeDurationMinutes: 9,
  timeFormat: '12h',
  theme: 'system',
  lastExportedAt: null,
};

export const DEFAULT_SCHEDULE: Schedule = {
  Mon: null,
  Tue: null,
  Wed: null,
  Thu: null,
  Fri: null,
  Sat: null,
  Sun: null,
};

export const DEFAULT_APP_DATA: AppData = {
  version: CURRENT_VERSION,
  settings: DEFAULT_SETTINGS,
  presets: [],
  schedule: DEFAULT_SCHEDULE,
  overrides: [],
  dayCustomizations: [],
  rules: [],
  ephemeralAlarms: [],
};

export const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export const PRESET_ICONS = [
  'briefcase',
  'home',
  'coffee',
  'sun',
  'moon',
  'star',
  'heart',
  'zap',
  'book',
  'music',
  'car',
  'dumbbell',
  'laptop',
  'calendar',
  'clock',
];

export const ALARM_SOUNDS = [
  { id: 'default', label: 'Default' },
  { id: 'gentle', label: 'Gentle' },
  { id: 'digital', label: 'Digital' },
  { id: 'chime', label: 'Chime' },
];

export const NOTIFICATION_CHANNEL_ALARM = 'alarm';
export const NOTIFICATION_CHANNEL_DEFAULT = 'default';

export const BACKGROUND_TASK_DAY_START = 'ENIGMA_DAY_START_TASK';
export const BACKGROUND_TASK_EVENING_CHECK = 'ENIGMA_EVENING_CHECK_TASK';
