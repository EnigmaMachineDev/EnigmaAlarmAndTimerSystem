export interface AlarmSound {
  id: string;
  label: string;
  // require() asset — null means use system default
  asset: number | null;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  {
    id: 'default',
    label: 'Default',
    asset: require('../../assets/sounds/alarm_default.wav'),
  },
];
