import { AppData, Settings, Schedule } from '../types';

export const CURRENT_VERSION = 7;

export const DEFAULT_SETTINGS: Settings = {
  defaultSnoozeDurationMinutes: 10,
  timeFormat: '12h',
  lastExportedAt: null,
  dismissCodeLength: 20,
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
  ruleAlarms: [],
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
  // Brand greens
  '#4a8c4a', '#6abf6a', '#2d5a2d', '#81c784',
  // Extended palette
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#f43f5e', '#64748b', '#78716c',
  '#0ea5e9', '#10b981', '#84cc16', '#a855f7',
  '#e11d48', '#059669', '#d946ef', '#f59e0b',
  '#06b6d4', '#7c3aed', '#dc2626', '#2563eb',
  // Original extras
  '#7986cb', '#e57373', '#4db6ac', '#a0897a', '#90a4ae',
];

export const PRESET_ICONS = [
  'briefcase-outline',
  'home-outline',
  'cafe-outline',
  'sunny-outline',
  'moon-outline',
  'star-outline',
  'heart-outline',
  'flash-outline',
  'book-outline',
  'musical-notes-outline',
  'car-outline',
  'barbell-outline',
  'laptop-outline',
  'calendar-outline',
  'alarm-outline',
  'airplane-outline',
  'bicycle-outline',
  'restaurant-outline',
  'fitness-outline',
  'school-outline',
] as const;

export type PresetIconName = typeof PRESET_ICONS[number];

export const ALARM_SOUNDS = [
  { id: 'default', label: 'Default' },
  { id: 'gentle', label: 'Gentle' },
  { id: 'digital', label: 'Digital' },
  { id: 'chime', label: 'Chime' },
];

export const NOTIFICATION_CHANNEL_ALARM = 'alarm';
export const NOTIFICATION_CHANNEL_DEFAULT = 'default';

export const BACKGROUND_TASK_DAY_START = 'ENIGMA_DAY_START_TASK';
