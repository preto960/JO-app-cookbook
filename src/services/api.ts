// src/services/api.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const TOKEN_KEY         = 'auth_token';
export const API_URL_KEY     = 'api_base_url';
export const DEFAULT_API_URL = 'http://localhost:3002/api';

// ─── Retry config ─────────────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay:  800,
  maxDelay:   4000,
  retryCodes: [500, 502, 503, 504],
};

// ─── Storage ──────────────────────────────────────────────────────────────────
const storage = {
  getItemAsync: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return Promise.resolve(); }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: (key: string): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return Promise.resolve(); }
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── URL helpers ──────────────────────────────────────────────────────────────
export const getSavedApiUrl = async (): Promise<string> => {
  const saved = await storage.getItemAsync(API_URL_KEY);
  return saved ?? DEFAULT_API_URL;
};

export const saveApiUrl = async (url: string): Promise<void> => {
  await storage.setItemAsync(API_URL_KEY, url.trim());
  api.defaults.baseURL = url.trim();
};

// ─── Debug bridge ─────────────────────────────────────────────────────────────
type DebugBridge = {
  logRequest:    (log: { method: string; url: string }) => string;
  updateRequest: (id: string, update: object) => void;
  logError:      (message: string) => void;
};
let _debug: DebugBridge | null = null;
export function registerDebugBridge(bridge: DebugBridge) { _debug = bridge; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getRetryDelay = (attempt: number) =>
  Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt), RETRY_CONFIG.maxDelay);

function shouldRetry(error: AxiosError, attempt: number, skipRetry: boolean): boolean {
  if (skipRetry) return false;
  if (attempt >= RETRY_CONFIG.maxRetries) return false;
  if (!error.response) return true;
  return RETRY_CONFIG.retryCodes.includes(error.response.status);
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

getSavedApiUrl().then(url => { api.defaults.baseURL = url; });

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await storage.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const rateLimiting = (globalThis as any).__rateLimiting !== false;
  if (rateLimiting) config.headers['X-Rate-Limit-Enabled'] = 'true';

  (config as any)._startTime  = Date.now();
  (config as any)._retryCount = (config as any)._retryCount ?? 0;

  if (_debug && !(config as any)._debugId) {
    const id = _debug.logRequest({
      method: config.method?.toUpperCase() ?? 'GET',
      url:    (config.baseURL ?? '') + (config.url ?? ''),
    });
    (config as any)._debugId = id;
  }

  return config;
}, (error) => {
  _debug?.logError(`Request setup error: ${error?.message}`);
  return Promise.reject(error);
});

// ─── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (_debug && (response.config as any)._debugId) {
      _debug.updateRequest((response.config as any)._debugId, {
        status:   response.status,
        duration: Date.now() - ((response.config as any)._startTime ?? 0),
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & {
      _retryCount: number;
      _startTime:  number;
      _debugId?:   string;
      _skipRetry?: boolean;
    };

    if (!config) return Promise.reject(error);

    const attempt   = config._retryCount ?? 0;
    const skipRetry = config._skipRetry  ?? false;

    if (shouldRetry(error, attempt, skipRetry)) {
      config._retryCount = attempt + 1;
      const waitMs = getRetryDelay(attempt);

      if (_debug && config._debugId) {
        _debug.updateRequest(config._debugId, {
          error: `${error.response?.status ?? 'no response'} — retrying (${config._retryCount}/${RETRY_CONFIG.maxRetries})…`,
        });
      }

      await delay(waitMs);
      return api(config);
    }

    if (error.response?.status === 401) {
      await storage.deleteItemAsync(TOKEN_KEY);
    }

    if (_debug) {
      if (config._debugId) {
        _debug.updateRequest(config._debugId, {
          status:   error.response?.status,
          duration: Date.now() - (config._startTime ?? 0),
          error:    error.message,
        });
      } else {
        _debug.logError(`Network error: ${error.message}`);
      }
    }

    return Promise.reject(error);
  }
);

export const storeToken = (token: string) => storage.setItemAsync(TOKEN_KEY, token);
export const getToken   = ()              => storage.getItemAsync(TOKEN_KEY);
export const clearToken = ()              => storage.deleteItemAsync(TOKEN_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LoginPayload { email: string; password: string; }

export interface LoginResponse {
  message: string; accessToken: string; refreshToken: string;
  user: {
    id: string; email: string; firstName: string; lastName: string;
    role: string; avatar: string | null; isActive: boolean;
    tenantId: string | null; lastLoginAt: string; createdAt: string; updatedAt: string;
  };
}

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', payload);
    await storeToken(data.accessToken);
    return data;
  },

  // _skipRetry: true — don't retry on session restore, use fallback immediately
  // Cache-Control header added globally to avoid 304 with empty body
  getProfile: async () => {
    const { data } = await api.get('/auth/profile', {
      _skipRetry: true,
    } as any);
    return data;
  },

  logout: async () => { await clearToken(); },
};

export const userService = {
  getAll:  async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get('/users', { params }); return data;
  },
  getById: async (id: string | number) => {
    const { data } = await api.get(`/users/${id}`); return data;
  },
};

export const dashboardService = {
  getStats:    async () => { const { data } = await api.get('/dashboard/stats');    return data; },
  getActivity: async () => { const { data } = await api.get('/dashboard/activity'); return data; },
};

export default api;
