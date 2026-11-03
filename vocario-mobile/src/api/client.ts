import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cấu hình URL linh hoạt: Tự động dùng localhost:8088 cho local dev, hoặc Render Production URL
export const PRODUCTION_API_URL = 'https://vocario-backend.onrender.com';
export const PRODUCTION_AI_URL = 'https://vocario-ai.onrender.com';

// IP mạng LAN của máy tính chạy server (để điện thoại qua Expo Go gọi được vào máy tính)
export const DEV_MACHINE_IP = '192.168.1.2';

// Đổi USE_PRODUCTION = true nếu muốn điện thoại kết nối thẳng vào server Cloud Render (kể cả dùng 4G)
export const USE_PRODUCTION = false;

export const API_BASE_URL = USE_PRODUCTION
  ? PRODUCTION_API_URL
  : Platform.select({
    web: 'http://localhost:8088',
    ios: `http://${DEV_MACHINE_IP}:8088`,
    android: `http://${DEV_MACHINE_IP}:8088`,
    default: `http://${DEV_MACHINE_IP}:8088`,
  });

// Alias for image URL construction
export const BASE_URL = API_BASE_URL;

export const AI_VISION_URL = USE_PRODUCTION
  ? PRODUCTION_AI_URL
  : Platform.select({
    web: 'http://localhost:8001',
    ios: `http://${DEV_MACHINE_IP}:8001`,
    android: `http://${DEV_MACHINE_IP}:8001`,
    default: `http://${DEV_MACHINE_IP}:8001`,
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
    let id: string | null = null;
    if (Platform.OS === 'web') {
      id = await AsyncStorage.getItem(USER_ID_KEY);
    } else {
      id = await SecureStore.getItemAsync(USER_ID_KEY);
    }
    if (id && id.trim()) return id.trim();

    // Fallback 1: Trích xuất từ USER_KEY JSON đã lưu
    const rawUserStr = await AsyncStorage.getItem(USER_KEY);
    if (rawUserStr) {
      try {
        const u = JSON.parse(rawUserStr);
        const resolved = u.userId || u.id;
        if (resolved) {
          const resStr = String(resolved).trim();
          if (Platform.OS === 'web') {
            await AsyncStorage.setItem(USER_ID_KEY, resStr);
          } else {
            await SecureStore.setItemAsync(USER_ID_KEY, resStr);
          }
          return resStr;
        }
      } catch (_) {}
    }

    // Fallback 2: Trích xuất trực tiếp từ chuỗi Token "jwt_token_<uuid>"
    const token = await getStoredToken();
    if (token && token.startsWith('jwt_token_')) {
      const extracted = token.replace('jwt_token_', '').trim();
      if (extracted) {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(USER_ID_KEY, extracted);
        } else {
          await SecureStore.setItemAsync(USER_ID_KEY, extracted);
        }
        return extracted;
      }
    }
    return null;
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
  } catch (_) { }
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
  } catch (_) { }
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

