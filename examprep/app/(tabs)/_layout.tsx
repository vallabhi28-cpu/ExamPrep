import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

function TabIcon({ name, color }: { name: any; focused: boolean; color: string }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="storage"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'folder' : 'folder-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Quiz AI',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="zen"
        options={{
          title: 'Focus',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'hourglass' : 'hourglass-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Roadmap',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 74,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
});
