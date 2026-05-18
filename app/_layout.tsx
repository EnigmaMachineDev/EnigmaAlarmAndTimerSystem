import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import RNAlarmModule from 'react-native-alarmageddon';
import { useAppStore } from '../src/store/useAppStore';
import { loadAppData } from '../src/storage/fileStorage';
import { loadRuntimeState } from '../src/storage/runtimeStorage';
import { setupNotificationChannels, requestNotificationPermissions, scheduleAlarmsForWeek, scheduleTimer } from '../src/engine/scheduler';
import { registerBackgroundTasks } from '../src/engine/backgroundTask';
import { todayDateString } from '../src/utils/dateUtils';

// alarmageddon emits the *schedule* id, which is the underlying alarm id with
// a date suffix like `_20251108` appended by the scheduler. Strip it to get
// back to the alarm id we can look up in the store.
function parseAlarmIdFromScheduleId(scheduleId: string): string {
  const m = scheduleId.match(/^(.*)_\d{8}$/);
  return m ? m[1] : scheduleId;
}

// Must import background task definitions so TaskManager registers them
import '../src/engine/backgroundTask';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrateRuntime = useAppStore((s) => s.hydrateRuntime);
  const pruneOldOverrides = useAppStore((s) => s.pruneOldOverrides);
  const markTimerDone = useAppStore((s) => s.markTimerDone);

  // Tracks whether the Zustand store has been hydrated from disk.
  const isHydratedRef = useRef(false);
  // Captures an alarm scheduleId that fires before hydration completes.
  const pendingScheduleIdRef = useRef<string | null>(null);

  useEffect(() => {
    function routeToRingingIfHeavySleeper(scheduleId: string) {
      const underlyingId = parseAlarmIdFromScheduleId(scheduleId);
      const alarm = useAppStore.getState().findAlarmById(underlyingId);
      if (alarm?.heavySleeperEnabled) {
        router.push({
          pathname: '/ringing',
          params: { scheduleId, alarmId: underlyingId, label: alarm.label ?? '' },
        });
      }
    }

    loadAppData().then(async (data) => {
      hydrate(data);
      pruneOldOverrides();
      // Schedule alarms for the full week on launch
      scheduleAlarmsForWeek(data);

      // Restore in-flight timer/stopwatch state so running/paused items
      // survive an app kill+relaunch. Running timers whose fire time has
      // already passed are marked done; future ones are re-scheduled with
      // the native module in case AlarmManager dropped them (e.g. reboot
      // before alarmageddon's boot receiver re-registered them).
      const runtime = await loadRuntimeState();
      hydrateRuntime(runtime);

      const today = useAppStore.getState().getResolvedDay(todayDateString());
      const now = Date.now();
      for (const active of Object.values(runtime.activeTimers)) {
        if (!active.running) continue;
        const timer = today.timers.find((t) => t.id === active.timerId);
        if (!timer) continue;
        const fireAt = active.startTimestamp + timer.durationSeconds * 1000;
        if (fireAt <= now) {
          markTimerDone(active.timerId);
        } else {
          scheduleTimer(timer, fireAt);
        }
      }

      // Mark the store as ready so the event listener can start routing.
      isHydratedRef.current = true;

      // Two race conditions can prevent the ringing screen from appearing:
      //
      // 1. Event-before-hydration: onAlarmStateChange fired while loadAppData
      //    was still in flight. The scheduleId was buffered — process it now.
      //
      // 2. Cold-start / dead bridge: the alarm fired while the app was killed.
      //    AlarmReceiver sets activeAlarmId and calls emitActiveAlarmId(), but
      //    the RN bridge wasn't initialised yet so the event was lost. The
      //    native activeAlarmId is still set — poll it once to catch up.
      if (pendingScheduleIdRef.current) {
        routeToRingingIfHeavySleeper(pendingScheduleIdRef.current);
        pendingScheduleIdRef.current = null;
      } else {
        try {
          const active = await RNAlarmModule.getCurrentAlarmPlaying();
          if (active?.activeAlarmId) {
            routeToRingingIfHeavySleeper(active.activeAlarmId);
          }
        } catch {
          // ignore — getCurrentAlarmPlaying is best-effort
        }
      }
    });
    setupNotificationChannels();
    requestNotificationPermissions();
    registerBackgroundTasks();

    // Listen for alarm fire events. Heavy Sleeper alarms route into a
    // dedicated full-screen "ringing" modal that requires a code to dismiss.
    const sub = RNAlarmModule.onAlarmStateChange((scheduleId) => {
      if (scheduleId) {
        console.log('[Alarm] Firing:', scheduleId);
        if (!isHydratedRef.current) {
          // Store not ready yet — buffer and handle after hydration.
          pendingScheduleIdRef.current = scheduleId;
          return;
        }
        routeToRingingIfHeavySleeper(scheduleId);
      } else {
        console.log('[Alarm] Stopped/dismissed');
        pendingScheduleIdRef.current = null;
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="preset/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="preset/new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="rule/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="rule/new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="override" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="customize" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen
          name="ringing"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
