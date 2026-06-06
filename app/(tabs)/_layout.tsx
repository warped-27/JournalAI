import { Tabs } from 'expo-router';
import { NotesProvider } from '../../src/notes/NotesContext';

export default function TabsLayout() {
  return (
    <NotesProvider>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="index" />
      </Tabs>
    </NotesProvider>
  );
}
