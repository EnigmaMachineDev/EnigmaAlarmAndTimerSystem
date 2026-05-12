# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # installs deps AND runs patch-package (postinstall hook)
npm start            # expo start --dev-client  (requires a custom dev client build, NOT Expo Go)
npm run android      # expo run:android (local debug build)

# EAS cloud builds
eas build --platform android --profile development   # dev client APK (internal distribution)
eas build --platform android --profile preview       # preview APK (internal distribution, no dev client)
eas build --platform android --profile production    # production AAB (for Play Store)

# Local preview APK without EAS servers
eas build --platform android --profile preview --local
```

This app requires a **custom dev client** — `expo start` without `--dev-client` will not work because `react-native-alarmageddon` is a native module that is not included in Expo Go.

iOS entries exist in `app.json` and `eas.json` but the app is Android-only in practice; no iOS builds are being produced.

## patch-package and why it exists

`patch-package` runs automatically via the `postinstall` npm hook after every `npm install`. The patch at `patches/react-native-alarmageddon+2.1.1.patch` adds a `requireDismissCode` parameter to the native Kotlin `AlarmModule` and `AlarmReceiver` classes. When this flag is set:

- The heads-up notification's **Stop** and **Snooze** action buttons are hidden, so the alarm cannot be one-tap dismissed from the notification shade.
- The wake-lock and auto-stop timer are extended from 60 seconds to 30 minutes, giving the user time to type the dismiss code.
- The `dismissCodeRequired` state is threaded through snooze re-scheduling so it persists across snooze cycles.

If you delete `node_modules` and reinstall without patch-package running, Heavy Sleeper Mode will silently break (alarms will be dismissible from the notification).

## Architecture

### File layout (Expo Router)

```
app/
  _layout.tsx          # Root Stack — app init, alarm event listener, hydration
  (tabs)/
    _layout.tsx        # Bottom tab bar (Today, Presets, Schedule, Rules, Settings)
    index.tsx          # Today tab — resolved alarms/timers/stopwatches for today
    presets.tsx
    schedule.tsx
    rules.tsx
    settings.tsx
  preset/[id].tsx      # modal — edit existing preset
  preset/new.tsx       # modal — create preset
  rule/[id].tsx        # modal — edit existing rule
  rule/new.tsx         # modal — create rule
  override.tsx         # modal — set a day override
  customize.tsx        # modal — add/remove/modify alarms for a specific date
  ringing.tsx          # fullScreenModal — Heavy Sleeper dismiss-code screen
src/
  store/useAppStore.ts
  engine/scheduler.ts
  engine/rulesEngine.ts
  engine/backgroundTask.ts
  storage/fileStorage.ts
  storage/runtimeStorage.ts
  storage/migrations.ts
  types/index.ts
  constants/defaults.ts
```

The root `_layout.tsx` Stack owns all navigation. Tabs are `(tabs)` as the default screen; everything else is pushed as a modal on top of the tab stack. The `ringing` screen is `presentation: 'fullScreenModal'` with `gestureEnabled: false` so it cannot be swiped away.

## State — Zustand store (`src/store/useAppStore.ts`)

Single store exported as `useAppStore`. The store holds:

- **Persisted app data** (written to `appdata.json` via fileStorage): `version`, `settings`, `presets`, `schedule`, `overrides`, `dayCustomizations`, `rules`, `ruleAlarms`
- **Runtime timer/stopwatch state** (written to `runtimeState.json` via runtimeStorage): `activeTimers`, `activeStopwatches`, `completedTimers`

Both write paths are **debounced**: `saveAppData` debounces at 500 ms; `saveRuntimeState` debounces at 250 ms. All store mutations call the appropriate persist helper synchronously before returning.

Key selectors:
- `getResolvedDay(date)` — resolves a `ResolvedDay` for a given ISO date string by merging preset → customization → rule-alarm layers. This is the single source of truth for what alarms/timers/stopwatches are active on any given day.
- `findAlarmById(alarmId)` — searches presets, dayCustomizations, and ruleAlarms. Used by the ringing screen to look up `heavySleeperEnabled` when the native module fires an alarm event.

## Storage layer

**`fileStorage.ts`** — persists `AppData` to `<documentDirectory>/appdata.json`. On load it runs `isValidAppData` (schema check) then `migrate` (version bump loop). Export strips `ruleAlarms` (they are regenerated on next launch) and sets `lastExportedAt`.

**`runtimeStorage.ts`** — persists timer/stopwatch state to `<documentDirectory>/runtimeState.json`. This file is intentionally separate from `appdata.json` so it is not subject to data migrations and can be wiped without data loss.

## Engine layer

### `scheduler.ts`

Uses `react-native-alarmageddon` (AlarmManager, bypasses DND, fires full-screen intent) for alarms and timers; `expo-notifications` for informational/rule notifications.

**Alarm schedule ID format**: `${alarmId}_${YYYYMMDD}` — e.g. `abc123_20251108`. The native module emits this full `scheduleId` on fire; the root layout strips the `_YYYYMMDD` suffix with `parseAlarmIdFromScheduleId` to recover the alarm ID for store lookup.

**Timer schedule ID format**: `timer_${timerId}` — prefixed so `listAlarms` cleanup can skip them when cancelling week alarms.

`scheduleAlarmsForWeek(data)` is the main entry point. It:
1. Calls `evaluateRulesForWeek` to produce fresh rule alarms.
2. Calls `listAlarms()` on the native side and cancels every persisted alarm whose ID ends with one of the next-7-day suffixes (catches orphaned snoozed alarms from stale presets).
3. For each of the next 7 days, resolves the active preset (override → schedule → null), applies customization, appends rule alarms, and calls `scheduleAlarm` for each enabled alarm whose fire time is in the future.

Call `scheduleAlarmsForWeek` any time presets, schedule, overrides, customizations, or rules change. The store already does this in every relevant mutator.

### `rulesEngine.ts`

**`evaluateRulesForWeek(data)`** — called by `scheduleAlarmsForWeek` before every reschedule. Iterates enabled rules with `ADD_ALARM` actions across the next 7 days, evaluates conditions per-date, and deduplicates against preset alarms. Returns `RuleAlarm[]` (not stored back to the Zustand store — only used in-memory during scheduling).

**`runRulesEngine(trigger, data)`** — called by the background task. Handles `SEND_NOTIFICATION` and `SWITCH_PRESET` actions for event-based triggers (`START_OF_DAY`, `TIME_OF_DAY`). Ignores `ADD_ALARM` (those are handled by `evaluateRulesForWeek`).

Condition evaluation note: `TIME_IS_BEFORE` / `TIME_IS_AFTER` conditions always return `true` in `evaluateConditionForDate` (used for pre-scheduling). They are meaningful only in `runRulesEngine` where the current clock time is known.

### `backgroundTask.ts`

Registers a single background fetch task (`ENIGMA_DAY_START_TASK`) with a 1-minute minimum interval (OS may throttle on battery). At midnight it prunes old overrides, reschedules the full week, and runs `START_OF_DAY` rules. Every invocation also runs `TIME_OF_DAY` rules (the engine filters by current minute). The task definition must be imported in `_layout.tsx` (via `import '../src/engine/backgroundTask'`) so `TaskManager` registers it at app start.

## Heavy Sleeper alarm flow

1. An alarm with `heavySleeperEnabled: true` is scheduled with `requireDismissCode: true` via the alarmageddon patch — this hides the notification's Stop/Snooze buttons and extends the auto-stop cap to 30 minutes.
2. When the alarm fires, `AlarmReceiver` calls `emitActiveAlarmId(scheduleId)`.
3. `RNAlarmModule.onAlarmStateChange` in `_layout.tsx` receives the `scheduleId`, calls `parseAlarmIdFromScheduleId` to strip the `_YYYYMMDD` suffix, looks up the alarm with `findAlarmById`, and if `heavySleeperEnabled` is true, pushes `router.push('/ringing', { scheduleId, alarmId, label })`.
4. `ringing.tsx` generates a fresh 20-character random code (`generateDismissCode`) on mount. The hardware Back button and swipe gestures are disabled. The screen vibrates in a loop. Stop/Snooze buttons only become active once the user's typed input exactly matches the displayed code.
5. On correct code entry, `RNAlarmModule.stopCurrentAlarm(scheduleId)` or `snoozeCurrentAlarm(scheduleId, minutes)` is called. If the native side stops the alarm by any other path (e.g. 30-minute safety auto-stop), `onAlarmStateChange` fires with `null` and the screen pops itself.

## Data migrations

Migrations live in `src/storage/migrations.ts`. `CURRENT_VERSION` is defined in `src/constants/defaults.ts`.

To add a migration:
1. Increment `CURRENT_VERSION` in `src/constants/defaults.ts`.
2. Add a new entry to the `migrations` record in `migrations.ts` keyed by the new version number. The function receives raw `any` and must return a transformed object; the `migrate` loop stamps `current.version = nextVersion` after each step.
3. Update `isValidAppData` if any formerly-required field is removed or renamed.

Existing migrations for reference: v2 removed `dayStartTime`/`eveningCheckTime` settings and backfilled `conditionLogic` on rules; v3 replaced `ephemeralAlarms` with `ruleAlarms: []`; v4 backfilled `heavySleeperEnabled: false` on all persisted alarms.

## Key types (`src/types/index.ts`)

| Type | Notes |
|---|---|
| `Alarm` | `id`, `label`, `time` ("HH:MM" 24h), `enabled`, `sound`, `snoozeDurationMinutes`, `origin`, `heavySleeperEnabled` |
| `Timer` | `id`, `label`, `durationSeconds`, `autoRestart`, `origin` |
| `Stopwatch` | `id`, `label`, `origin` |
| `Preset` | `id`, `name`, `color`, `icon`, `alarms[]`, `timers[]`, `stopwatches[]` |
| `Schedule` | `Record<DayKey, string \| null>` — maps Mon–Sun to a preset ID or null |
| `DayOverride` | `id`, `date` ("YYYY-MM-DD"), `presetId`, `reason` — completely replaces the scheduled preset for a date |
| `DayCustomization` | `id`, `date`, `addAlarms[]`, `removeAlarmIds[]`, `modifyAlarms[]`, `addTimers[]`, `removeTimerIds[]`, `addStopwatches[]`, `removeStopwatchIds[]` — applied on top of the preset layer (ignored when an override is active) |
| `Rule` | `id`, `name`, `enabled`, `trigger`, `triggerTime?`, `conditionLogic`, `conditions[]`, `actions[]` |
| `RuleAlarm` | `id`, `date`, `alarm`, `ruleId` — ephemeral; regenerated each week, not long-term persisted |
| `RuleCondition` | `type` (TODAY_PRESET_IS / TOMORROW_PRESET_IS / DAY_OF_WEEK_IS / TIME_IS_BEFORE / TIME_IS_AFTER), `value`, `negate?` |
| `RuleAction` | union of AddAlarmAction / AddTimerAction / SendNotificationAction / SwitchPresetAction |
| `ResolvedDay` | Output of `getResolvedDay` — `date`, `preset`, `isOverridden`, `isCustomized`, `alarms[]`, `timers[]`, `stopwatches[]` |
| `ActiveTimer` | Runtime only — `timerId`, `startTimestamp` (epoch ms), `pausedRemainingMs?`, `running` |
| `ActiveStopwatch` | Runtime only — `stopwatchId`, `startTimestamp`, `pausedElapsedMs?`, `running`, `laps[]` |
| `DayKey` | `'Mon' \| 'Tue' \| 'Wed' \| 'Thu' \| 'Fri' \| 'Sat' \| 'Sun'` |
| `Origin` | `'manual' \| 'preset' \| 'rule' \| 'customization'` |
