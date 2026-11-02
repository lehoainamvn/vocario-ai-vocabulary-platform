import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { WordbookScreen } from '../screens/WordbookScreen';
import { ArenaScreen } from '../screens/ArenaScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { TextExtractorScreen } from '../screens/TextExtractorScreen';
import { ClassroomScreen } from '../screens/ClassroomScreen';
import { VocarioTheme } from '../constants/theme';
import { getStoredToken } from '../api/client';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const T = {
  canvas: '#F8F6F1',
  surface: '#FFFFFF',
  border: '#E5DED3',
  brand: '#7D6853',
  muted: '#746B60',
};

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.surface,
          borderTopColor: T.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 6,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: T.brand,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
          paddingBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          tabBarLabel: 'Thu nạp AI',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="camera-alt" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wordbook"
        component={WordbookScreen}
        options={{
          tabBarLabel: 'Sổ từ vựng',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu-book" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Arena"
        component={ArenaScreen}
        options={{
          tabBarLabel: 'Đấu trường',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="emoji-events" size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getStoredToken();
      setInitialRoute(token ? 'MainTabs' : 'Auth');
    };
    checkAuth();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={T.brand} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Collection" component={CollectionScreen} />
      <Stack.Screen name="TextExtractor" component={TextExtractorScreen} />
      <Stack.Screen name="Classroom" component={ClassroomScreen} />
    </Stack.Navigator>
  );
};
