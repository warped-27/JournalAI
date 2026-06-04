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
        tabBarActiveTintColor: '#00FF41',
        tabBarInactiveTintColor: '#888888',
        tabBarIconStyle: { minWidth: 60, width: 'auto' },
        tabBarStyle: {
          backgroundColor: '#000000', // Nero puro
          borderTopColor: '#00FF41',   // Bordo superiore verde neon
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: 'bold',
          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
          marginTop: 2,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'JOURNAL',
          tabBarIcon: ({ color, focused }) => (
            <Text 
              ellipsizeMode="clip"
              style={{ 
                fontSize: 14, 
                fontWeight: 'bold', 
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
                color: color,
                textAlign: 'center',
                flexWrap: 'nowrap',
              }}
            >
              [ J ]
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'IMPOSTAZIONI',
          tabBarIcon: ({ color, focused }) => (
            <Text 
              ellipsizeMode="clip"
              style={{ 
                fontSize: 14, 
                fontWeight: 'bold', 
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
                color: color,
                textAlign: 'center',
                flexWrap: 'nowrap',
              }}
            >
              [ O ]
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
