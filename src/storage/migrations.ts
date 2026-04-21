import { AppData } from '../types';
import { CURRENT_VERSION, DEFAULT_SETTINGS, DEFAULT_SCHEDULE } from '../constants/defaults';

type MigrationFn = (data: any) => any;

const migrations: Record<number, MigrationFn> = {
  1: (data: any) => data, // baseline — no-op
};

export function migrate(data: any): AppData {
  let current = { ...data };

  while (current.version < CURRENT_VERSION) {
    const nextVersion = current.version + 1;
    const migrationFn = migrations[nextVersion];
    if (!migrationFn) {
      throw new Error(`No migration found for version ${nextVersion}`);
    }
    current = migrationFn(current);
    current.version = nextVersion;
  }

  return current as AppData;
}

export function isValidAppData(data: any): boolean {
  if (typeof data !== 'object' || data === null) return false;
  if (typeof data.version !== 'number') return false;
  if (!Array.isArray(data.presets)) return false;
  if (typeof data.schedule !== 'object') return false;
  if (!Array.isArray(data.overrides)) return false;
  if (!Array.isArray(data.rules)) return false;
  return true;
}
