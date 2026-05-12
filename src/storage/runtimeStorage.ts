import * as FileSystem from 'expo-file-system/legacy';
import { ActiveTimer, ActiveStopwatch } from '../types';

// ─── Runtime state persistence ───────────────────────────────────────────────
// Saves only the *runtime* view of in-flight timers and stopwatches (running or
// paused) and the manual-done flags. Kept in a separate JSON file from
// appdata.json so it doesn't interact with the schema-versioned app data
// migrations — this file can be wiped at any time without losing user data.
//
// The UI computes remaining/elapsed values from epoch timestamps stored in the
// records, so a running timer or stopwatch resumes correctly across an app
// kill+relaunch.

export interface RuntimeState {
  activeTimers: Record<string, ActiveTimer>;
  activeStopwatches: Record<string, ActiveStopwatch>;
  completedTimers: Record<string, boolean>;
}

const EMPTY_RUNTIME_STATE: RuntimeState = {
  activeTimers: {},
  activeStopwatches: {},
  completedTimers: {},
};

const FILE_PATH = `${FileSystem.documentDirectory}runtimeState.json`;

let writeTimer: ReturnType<typeof setTimeout> | null = null;

export async function loadRuntimeState(): Promise<RuntimeState> {
  try {
    const info = await FileSystem.getInfoAsync(FILE_PATH);
    if (!info.exists) return EMPTY_RUNTIME_STATE;

    const raw = await FileSystem.readAsStringAsync(FILE_PATH, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(raw);

    return {
      activeTimers: (parsed && typeof parsed.activeTimers === 'object' && parsed.activeTimers) || {},
      activeStopwatches: (parsed && typeof parsed.activeStopwatches === 'object' && parsed.activeStopwatches) || {},
      completedTimers: (parsed && typeof parsed.completedTimers === 'object' && parsed.completedTimers) || {},
    };
  } catch (err) {
    console.error('[RuntimeStorage] Failed to load runtimeState.json:', err);
    return EMPTY_RUNTIME_STATE;
  }
}

async function writeImmediate(state: RuntimeState): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(state), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    console.error('[RuntimeStorage] Failed to write runtimeState.json:', err);
  }
}

export function saveRuntimeState(state: RuntimeState): void {
  // Debounced write so rapid lap presses or scrubs don't hammer the disk.
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeImmediate(state);
    writeTimer = null;
  }, 250);
}
