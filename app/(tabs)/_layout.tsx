import { Tabs } from 'expo-router';
import { Platform, Text, useColorScheme } from 'react-native';
import { Palette } from '../../constants/Colors';

export default function TabLayout() {
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';
  const currentTheme = isDark ? Palette.dark : Palette.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Nasconde la barra superiore nativa globally per evitare duplicati
        tabBarActiveTintColor: currentTheme.textPrimary,
        tabBarInactiveTintColor: currentTheme.textSecondary,
        tabBarStyle: {
          backgroundColor: currentTheme.surface, // Si fonde con la superficie principale
          borderTopColor: currentTheme.border,   // Bordo geometrico finissimo
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color, opacity: focused ? 1 : 0.6 }}>📖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Impostazioni',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color, opacity: focused ? 1 : 0.6 }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}

