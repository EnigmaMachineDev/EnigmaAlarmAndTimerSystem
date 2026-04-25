import * as FileSystem from 'expo-file-system/legacy';
import { AppData } from '../types';
import { DEFAULT_APP_DATA } from '../constants/defaults';
import { migrate, isValidAppData } from './migrations';

const FILE_PATH = `${FileSystem.documentDirectory}appdata.json`;

let writeTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadAppData(): Promise<AppData> {
  try {
    const info = await FileSystem.getInfoAsync(FILE_PATH);
    if (!info.exists) {
      await saveAppDataImmediate(DEFAULT_APP_DATA);
      return DEFAULT_APP_DATA;
    }

    const raw = await FileSystem.readAsStringAsync(FILE_PATH, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = JSON.parse(raw);

    if (!isValidAppData(parsed)) {
      console.warn('[Storage] Invalid appdata.json — resetting to defaults');
      await saveAppDataImmediate(DEFAULT_APP_DATA);
      return DEFAULT_APP_DATA;
    }

    const migrated = migrate(parsed);
    return migrated;
  } catch (err) {
    console.error('[Storage] Failed to load appdata.json:', err);
    return DEFAULT_APP_DATA;
  }
}

export async function saveAppDataImmediate(data: AppData): Promise<void> {
  try {
    const json = JSON.stringify(data, null, 2);
    await FileSystem.writeAsStringAsync(FILE_PATH, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    console.error('[Storage] Failed to write appdata.json:', err);
  }
}

export function saveAppData(data: AppData): void {
  if (writeTimer) {
    clearTimeout(writeTimer);
  }
  writeTimer = setTimeout(() => {
    saveAppDataImmediate(data);
    writeTimer = null;
  }, 500);
}

export async function resetAppData(): Promise<AppData> {
  await saveAppDataImmediate(DEFAULT_APP_DATA);
  return DEFAULT_APP_DATA;
}

export async function exportAppData(data: AppData): Promise<string> {
  const exportData: AppData = {
    ...data,
    ruleAlarms: [],
    settings: {
      ...data.settings,
      lastExportedAt: new Date().toISOString(),
    },
  };
  const json = JSON.stringify(exportData, null, 2);
  const exportPath = `${FileSystem.cacheDirectory}enigma-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(exportPath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return exportPath;
}

export async function readImportFile(uri: string): Promise<AppData> {
  const raw = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const parsed = JSON.parse(raw);
  if (!isValidAppData(parsed)) {
    throw new Error('Invalid file: missing required fields');
  }
  const migrated = migrate(parsed);
  return migrated;
}
