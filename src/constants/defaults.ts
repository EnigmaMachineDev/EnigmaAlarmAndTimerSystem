import { AppData, Settings, Schedule } from '../types';

export const CURRENT_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  dayStartTime: '06:00',
  eveningCheckTime: '20:00',
  defaultSnoozeDurationMinutes: 10,
  timeFormat: '12h',
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
  '#4a8c4a', // forest green (primary)
  '#6abf6a', // bright spirit green
  '#2d5a2d', // deep accent green
  '#81c784', // soft mint
  '#7986cb', // grace blue
  '#e57373', // courage red
  '#f59e0b', // amber
  '#4db6ac', // teal
  '#a0897a', // warm bark
  '#90a4ae', // steel blue-grey
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
export const BACKGROUND_TASK_EVENING_CHECK = 'ENIGMA_EVENING_CHECK_TASK';
