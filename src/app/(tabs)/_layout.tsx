import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/core/theme';
import { useSky } from '@/core/environment/SkyContext';

export default function TabsLayout() {
  const { typography } = useTheme();
  let sky = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sky = useSky();
  } catch {}

  const skyConfig = sky?.skyConfig;
  const activeColor = skyConfig?.tabBarActive || '#0284C7';
  const inactiveColor = skyConfig?.tabBarInactive || '#94A3B8';
  const barBg = skyConfig?.tabBarBg || 'rgba(255, 255, 255, 0.88)';
  const barBorder = skyConfig?.tabBarBorder || 'rgba(186, 230, 253, 0.4)';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: barBg,
          borderTopColor: barBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Streaks',
          tabBarIcon: ({ color, focused }) => {
            const iconColor = typeof color === 'string' ? color : inactiveColor;
            return <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={iconColor} />;
          },
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, focused }) => {
            const iconColor = typeof color === 'string' ? color : inactiveColor;
            return <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={iconColor} />;
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => {
            const iconColor = typeof color === 'string' ? color : inactiveColor;
            return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={iconColor} />;
          },
        }}
      />
    </Tabs>
  );
}
