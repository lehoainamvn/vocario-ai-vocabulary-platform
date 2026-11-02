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

const TOKEN_KEY = 'vocario_auth_token';
const USER_KEY = 'vocario_user_data';

export const getStoredToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (_) {
    return null;
  }
};

export const setStoredToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (_) {}
};

export const removeStoredToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
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
  return config;
});

