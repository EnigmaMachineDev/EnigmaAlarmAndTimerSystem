import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import RNAlarmModule from 'react-native-alarmageddon';
import { useAppStore } from '../src/store/useAppStore';
import { loadAppData } from '../src/storage/fileStorage';
import { setupNotificationChannels, requestNotificationPermissions } from '../src/engine/scheduler';
import { registerBackgroundTasks } from '../src/engine/backgroundTask';

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

  useEffect(() => {
    loadAppData().then(hydrate);
    setupNotificationChannels();
    requestNotificationPermissions();
    registerBackgroundTasks();

    // Listen for alarm fire events (e.g. to navigate to a dismiss screen in future)
    const sub = RNAlarmModule.onAlarmStateChange((alarmId) => {
      if (alarmId) {
        console.log('[Alarm] Firing:', alarmId);
      } else {
        console.log('[Alarm] Stopped/dismissed');
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
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
