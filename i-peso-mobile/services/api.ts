import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8000;
const ANDROID_EMULATOR_HOST = '10.0.2.2';

function apiUrlForHost(host: string) {
  return `http://${host}:${API_PORT}/api`;
}

function normalizeApiUrl(value: unknown) {
  return String(value).trim().replace(/\/+$/, '');
}

function extractHost(value: string) {
  const candidate = value.trim();

  try {
    if (candidate.includes('://')) {
      return new URL(candidate).hostname;
    }
  } catch {
    return '';
  }

  return candidate.split(':')[0];
}

function computeBaseUrl() {
  // app.config.js passes EXPO_PUBLIC_API_URL into the native build config.
  // This is the required setting for a physical phone on the same Wi-Fi.
  const configuredApiUrl =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiBaseUrl ??
    (Constants as any).manifest2?.extra?.EXPO_PUBLIC_API_URL ??
    (Constants as any).manifest2?.extra?.apiBaseUrl ??
    (Constants as any).manifest?.extra?.EXPO_PUBLIC_API_URL ??
    (Constants as any).manifest?.extra?.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_URL;

  if (configuredApiUrl) {
    return normalizeApiUrl(configuredApiUrl);
  }

  // Development builds normally expose Metro's LAN address. Using it keeps
  // the app usable when a local .env file has not been created yet.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost;
  const metroHost = hostUri ? extractHost(String(hostUri)) : '';

  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return apiUrlForHost(metroHost);
  }

  // localhost inside an Android emulator refers to the emulator itself.
  if (Platform.OS === 'android') {
    return apiUrlForHost(ANDROID_EMULATOR_HOST);
  }

  return apiUrlForHost('localhost');
}

export const BASE_URL = computeBaseUrl();

console.log('========================================');
console.log('🔍 i-PESO API CONFIGURATION');
console.log('🔍 API BASE URL:', BASE_URL);
console.log('========================================');

const apiClient = axios.create({
  baseURL: BASE_URL,

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },

  timeout: 15000,
});

/**
 * Attach authentication token automatically.
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('ipeso_token');

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log(
        '➡️ API REQUEST:',
        config.method?.toUpperCase(),
        `${config.baseURL}${config.url}`,
      );
    } catch (error) {
      console.log('⚠️ Could not read authentication token:', error);
    }

    return config;
  },

  (error) => {
    console.log('❌ REQUEST INTERCEPTOR ERROR:', error);
    return Promise.reject(error);
  },
);

/**
 * Handle API responses/errors.
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(
      '✅ API RESPONSE:',
      response.status,
      response.config.url,
    );

    return response;
  },

  async (error) => {
    if (error.response) {
      console.log('❌ API ERROR RESPONSE');
      console.log('Status:', error.response.status);
      console.log('URL:', error.config?.url);
      console.log('Data:', error.response.data);

      if (error.response.status === 401) {
        await SecureStore.deleteItemAsync('ipeso_token');

        try {
          const { useAuthStore } = await import('@/stores/authStore');
          useAuthStore.getState().clearAuth();
        } catch (storeError) {
          console.log(
            '⚠️ Could not clear auth store:',
            storeError,
          );
        }
      }
    } else if (error.request) {
      console.log('❌ API NETWORK ERROR');
      console.log('Request was sent but no response was received.');
      console.log('URL:', error.config?.url);
      console.log('Message:', error.message);
    } else {
      console.log('❌ API SETUP ERROR');
      console.log('Message:', error.message);
    }

    return Promise.reject(error);
  },
);

export const API_BASE_URL = BASE_URL;

export default apiClient;
