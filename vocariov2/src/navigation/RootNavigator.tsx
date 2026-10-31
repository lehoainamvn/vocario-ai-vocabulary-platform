import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { WordbookScreen } from '../screens/WordbookScreen';
import { ArenaScreen } from '../screens/ArenaScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { VocarioTheme } from '../constants/theme';

const Tab = createBottomTabNavigator();

export const RootNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FAF8F5',
          borderTopColor: '#E5DED3',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: VocarioTheme.colors.brand,
        tabBarInactiveTintColor: VocarioTheme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          tabBarLabel: 'Thu nạp AI',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="Wordbook"
        component={WordbookScreen}
        options={{
          tabBarLabel: 'Sổ từ vựng',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="Arena"
        component={ArenaScreen}
        options={{
          tabBarLabel: 'Đấu trường',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚡</Text>,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Bảng vàng',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

