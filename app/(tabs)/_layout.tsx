import { Tabs } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Today:    { active: 'sunny',          inactive: 'sunny-outline' },
  Presets:  { active: 'layers',         inactive: 'layers-outline' },
  Schedule: { active: 'calendar',       inactive: 'calendar-outline' },
  Settings: { active: 'settings',       inactive: 'settings-outline' },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons = TAB_ICONS[name];
  return (
    <View style={styles.tabIcon}>
      <Ionicons
        name={focused ? icons.active : icons.inactive}
        size={22}
        color={focused ? Colors.primaryLight : Colors.textSecondary}
      />
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelFocused]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="presets"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Presets" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Schedule" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  tabLabelFocused: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
});
