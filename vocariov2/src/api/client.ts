import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cấu hình URL linh hoạt: Tự động dùng localhost:8088 cho local dev, hoặc Render Production URL
export const PRODUCTION_API_URL = 'https://vocario-backend.onrender.com';
export const PRODUCTION_AI_URL = 'https://vocario-ai.onrender.com';

// Nếu là dev trên Android Emulator dùng 10.0.2.2:8088, Web/iOS dùng localhost:8088
// Đổi USE_PRODUCTION = true khi build APK preview kiểm thử trên thiết bị thật
export const USE_PRODUCTION = false;

export const API_BASE_URL = USE_PRODUCTION
  ? PRODUCTION_API_URL
  : Platform.select({
      android: 'http://10.0.2.2:8088',
      ios: 'http://localhost:8088',
      default: 'http://localhost:8088',
    });

// Alias for image URL construction
export const BASE_URL = API_BASE_URL;

export const AI_VISION_URL = USE_PRODUCTION
  ? PRODUCTION_AI_URL
  : Platform.select({
      android: 'http://10.0.2.2:8001',
      ios: 'http://localhost:8001',
      default: 'http://localhost:8001',
    });

const TOKEN_KEY = 'vocario_jwt_token';
const USER_ID_KEY = 'vocario_user_id';
const USERNAME_KEY = 'vocario_username';
const USER_KEY = 'vocario_user_data';

export const getStoredToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return (await AsyncStorage.getItem(TOKEN_KEY)) || (await AsyncStorage.getItem('vocario_auth_token'));
    }
    return (await SecureStore.getItemAsync(TOKEN_KEY)) || (await SecureStore.getItemAsync('vocario_auth_token'));
  } catch (_) {
    return null;
  }
};

export const getStoredUserId = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(USER_ID_KEY);
    }
    return await SecureStore.getItemAsync(USER_ID_KEY);
  } catch (_) {
    return null;
  }
};

export const getStoredUsername = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(USERNAME_KEY);
    }
    return await SecureStore.getItemAsync(USERNAME_KEY);
  } catch (_) {
    return null;
  }
};

export const setAuthData = async (token: string, userId?: string, username?: string, rawUser?: any): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem('vocario_auth_token', token);
      if (userId) await AsyncStorage.setItem(USER_ID_KEY, String(userId));
      if (username) await AsyncStorage.setItem(USERNAME_KEY, username);
      if (rawUser) await AsyncStorage.setItem(USER_KEY, JSON.stringify(rawUser));
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync('vocario_auth_token', token);
      if (userId) await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
      if (username) await SecureStore.setItemAsync(USERNAME_KEY, username);
      if (rawUser) await AsyncStorage.setItem(USER_KEY, JSON.stringify(rawUser));
    }
  } catch (_) {}
};

export const setStoredToken = async (token: string): Promise<void> => {
  await setAuthData(token);
};

export const removeStoredToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem('vocario_auth_token');
      await AsyncStorage.removeItem(USER_ID_KEY);
      await AsyncStorage.removeItem(USERNAME_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync('vocario_auth_token');
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(USERNAME_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (_) {}
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const userId = await getStoredUserId();
  if (userId) {
    config.params = config.params || {};
    if (!config.params.userId && !config.params.currentUserId) {
      config.params.userId = userId;
    }
  }
  return config;
});

