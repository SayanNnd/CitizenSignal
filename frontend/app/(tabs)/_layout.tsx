import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#e53935', headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: 'Map', tabBarLabel: 'Map' }} />
      <Tabs.Screen name="list" options={{ title: 'Issues', tabBarLabel: 'Issues' }} />
      <Tabs.Screen name="report" options={{ title: 'Report Issue', tabBarLabel: 'Report' }} />
    </Tabs>
  );
}

