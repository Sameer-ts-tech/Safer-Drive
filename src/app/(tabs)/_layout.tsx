import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          borderBottomWidth: 1.5,
          borderBottomColor: Colors.surface,
        },
        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: '800',
          fontSize: 18,
          fontFamily: 'System',
        },
        tabBarStyle: {
          backgroundColor: '#2A2120', // slightly darker than primary BG
          borderTopWidth: 1.5,
          borderTopColor: Colors.surface,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.vibrantCoral,
        tabBarInactiveTintColor: Colors.dustyRose,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          fontFamily: 'System',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Drive',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'car-sport' : 'car-sport-outline'} 
              size={size + 2} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Drive History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'analytics' : 'analytics-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? 'settings' : 'settings-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
