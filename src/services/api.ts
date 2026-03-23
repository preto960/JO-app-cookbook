// src/services/api.ts
import axios, { AxiosError, AxiosRequestConfig, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type {
  LoginPayload, LoginResponse, RefreshResponse,
  ApiUser, UpdateUserPayload, CreateUserPayload, ChangePasswordPayload, UsersListParams,
  PaginatedResponse, Permission, UpdatePermissionPayload, Role,
  Setting, UpdateSettingPayload, TranslationMap, Language,
  Recipe, RecipesListParams, CreateRecipePayload, UpdateRecipePayload,
  CreateRatingPayload, RecipeCategory, RecipeTag,
  CreateCategoryPayload, CreateTagPayload, HealthStatus,
} from '../types/api.types';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const TOKEN_KEY         = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
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
export const storage = {
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

// ─── Auth event bus ───────────────────────────────────────────────────────────
type AuthEventListener = () => void;
let _onAuthExpired: AuthEventListener | null = null;
export function registerAuthExpiredListener(fn: AuthEventListener) { _onAuthExpired = fn; }

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

// ─── Normalizadores de respuesta ──────────────────────────────────────────────
/**
 * Normaliza cualquier estructura paginada que devuelva el backend.
 * Soporta:
 *   - Array directo: [...]
 *   - { data: [...], total, page, ... }           ← estándar genérico
 *   - { users: [...], pagination: {...} }          ← backend de este proyecto
 *   - { recipes: [...], pagination: {...} }        ← backend de este proyecto
 *   - { [anyKey]: [...], pagination/total: ... }  ← cualquier variante futura
 */
function normalizePaginated<T>(raw: any): PaginatedResponse<T> {
  // Caso 1: ya es array directo
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length, page: 1, limit: raw.length, totalPages: 1 };
  }

  // Caso 2: ya tiene la forma estándar { data: [...] }
  if (Array.isArray(raw?.data)) {
    const pg = raw.pagination ?? {};
    return {
      data:       raw.data,
      total:      raw.total      ?? pg.total      ?? raw.data.length,
      page:       raw.page       ?? pg.page       ?? 1,
      limit:      raw.limit      ?? pg.limit      ?? raw.data.length,
      totalPages: raw.totalPages ?? pg.totalPages ?? 1,
    };
  }

  // Caso 3: { [entityKey]: [...], pagination: {...} }
  // Buscamos la primera key cuyo valor sea un array (es el listado)
  const pg = raw?.pagination ?? {};
  const keys = Object.keys(raw ?? {}).filter(k => k !== 'pagination');
  for (const key of keys) {
    if (Array.isArray(raw[key])) {
      const arr = raw[key] as T[];
      return {
        data:       arr,
        total:      pg.total      ?? raw.total      ?? arr.length,
        page:       pg.page       ?? raw.page       ?? 1,
        limit:      pg.limit      ?? raw.limit      ?? arr.length,
        totalPages: pg.totalPages ?? raw.totalPages ?? 1,
      };
    }
  }

  // Fallback: devolvemos vacío para no romper la UI
  return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };
}

/**
 * Normaliza respuestas que deberían ser un array simple.
 * Soporta array directo, { data: [...] }, { [key]: [...] }
 */
function normalizeArray<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  // Buscar primera key con array
  const keys = Object.keys(raw ?? {});
  for (const key of keys) {
    if (Array.isArray(raw[key])) return raw[key];
  }
  return [];
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

getSavedApiUrl().then(url => { api.defaults.baseURL = url; });

// ─── Token refresh state ──────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processRefreshQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  refreshQueue = [];
}

async function attemptTokenRefresh(): Promise<string> {
  const refreshToken = await storage.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error('No refresh token available');

  const { data } = await axios.post<RefreshResponse>(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { timeout: 10000 }
  );
  await storage.setItemAsync(TOKEN_KEY, data.accessToken);
  return data.accessToken;
}

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await storage.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  (config as any)._startTime  = Date.now();
  (config as any)._retryCount = (config as any)._retryCount ?? 0;

  if (_debug && !(config as any)._debugId) {
    const id = _debug.logRequest({
      method: config.method?.toUpperCase() ?? 'GET',
      url: (config.baseURL ?? '') + (config.url ?? ''),
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
      _isRetry?:   boolean;
    };

    if (!config) return Promise.reject(error);

    // ── Token refresh on 401 ──────────────────────────────────────────────────
    if (error.response?.status === 401 && !config._isRetry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              config._isRetry = true;
              config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
              resolve(api(config));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await attemptTokenRefresh();
        processRefreshQueue(null, newToken);
        config._isRetry = true;
        config.headers = { ...config.headers, Authorization: `Bearer ${newToken}` };
        if (_debug && config._debugId) {
          _debug.updateRequest(config._debugId, { error: 'Token refreshed — retrying' });
        }
        return api(config);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        await storage.deleteItemAsync(TOKEN_KEY);
        await storage.deleteItemAsync(REFRESH_TOKEN_KEY);
        _onAuthExpired?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Standard retry for 5xx / network errors ───────────────────────────────
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

// ─── Token helpers ────────────────────────────────────────────────────────────
export const storeTokens = async (accessToken: string, refreshToken: string) => {
  await storage.setItemAsync(TOKEN_KEY, accessToken);
  await storage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};
export const clearTokens = async () => {
  await storage.deleteItemAsync(TOKEN_KEY);
  await storage.deleteItemAsync(REFRESH_TOKEN_KEY);
};
export const getToken   = () => storage.getItemAsync(TOKEN_KEY);
export const storeToken  = (token: string) => storage.setItemAsync(TOKEN_KEY, token);
export const clearToken  = () => storage.deleteItemAsync(TOKEN_KEY);

// ─── Auth service ─────────────────────────────────────────────────────────────
export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', payload);
    await storeTokens(data.accessToken, data.refreshToken);
    return data;
  },

  refresh: async (): Promise<RefreshResponse> => {
    const refreshToken = await storage.getItemAsync(REFRESH_TOKEN_KEY);
    const { data } = await api.post<RefreshResponse>('/auth/refresh', { refreshToken });
    await storage.setItemAsync(TOKEN_KEY, data.accessToken);
    return data;
  },

  getProfile: async (): Promise<{ user: ApiUser } | ApiUser> => {
    const { data } = await api.get('/auth/profile', { _skipRetry: true } as any);
    return data;
  },

  updateProfile: async (payload: UpdateUserPayload): Promise<ApiUser> => {
    const { data } = await api.put<ApiUser>('/auth/profile', payload);
    return data;
  },

  logout: async () => { await clearTokens(); },
};

// ─── User service ─────────────────────────────────────────────────────────────
// Respuesta real del backend: { pagination: {...}, users: [...] }
export const userService = {
  getAll: async (params?: UsersListParams): Promise<PaginatedResponse<ApiUser>> => {
    const { data } = await api.get('/users', { params });
    return normalizePaginated<ApiUser>(data);
  },

  getById: async (id: string): Promise<ApiUser> => {
    const { data } = await api.get(`/users/${id}`);
    // Puede venir { user: {...} } o directamente el objeto
    return data?.user ?? data;
  },

  getRoles: async (): Promise<string[]> => {
    const { data } = await api.get('/users/roles');
    return normalizeArray<string>(data);
  },

  create: async (payload: CreateUserPayload): Promise<ApiUser> => {
    const { data } = await api.post<ApiUser>('/users', payload);
    return data?.user ?? data;
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<ApiUser> => {
    const { data } = await api.put<ApiUser>(`/users/${id}`, payload);
    return data?.user ?? data;
  },

  changePassword: async (id: string, payload: ChangePasswordPayload): Promise<void> => {
    await api.put(`/users/${id}/password`, payload);
  },

  toggleStatus: async (id: string): Promise<ApiUser> => {
    const { data } = await api.patch<ApiUser>(`/users/${id}/toggle-status`);
    return data?.user ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    await api.post('/users/bulk-delete', { ids });
  },
};

// ─── Permission service ────────────────────────────────────────────────────────
export const permissionService = {
  getAll: async (role?: string): Promise<Permission[]> => {
    const { data } = await api.get('/permissions', { params: role ? { role } : undefined });
    return normalizeArray<Permission>(data);
  },

  update: async (id: string, payload: UpdatePermissionPayload): Promise<Permission> => {
    const { data } = await api.put<Permission>(`/permissions/${id}`, payload);
    return data;
  },

  reset: async (role: string): Promise<void> => {
    await api.post('/permissions/reset', { role });
  },
};

// ─── Role service ──────────────────────────────────────────────────────────────
export const roleService = {
  getAll: async (): Promise<Role[]> => {
    const { data } = await api.get('/roles');
    return normalizeArray<Role>(data);
  },
};

// ─── Settings service ─────────────────────────────────────────────────────────
export const settingsService = {
  getAll: async (): Promise<Setting[]> => {
    const { data } = await api.get('/settings');
    return normalizeArray<Setting>(data);
  },

  getPublic: async (): Promise<Setting[]> => {
    const { data } = await api.get('/settings/public');
    return normalizeArray<Setting>(data);
  },

  update: async (id: string, payload: UpdateSettingPayload): Promise<Setting> => {
    const { data } = await api.put<Setting>(`/settings/${id}`, payload);
    return data;
  },

  updateByKey: async (key: string, value: string): Promise<Setting> => {
    const { data } = await api.put<Setting>(`/settings/key/${key}`, { value });
    return data;
  },
};

// ─── Translation service ──────────────────────────────────────────────────────
export const translationService = {
  getMap: async (language: Language): Promise<TranslationMap> => {
    const { data } = await api.get('/translations', { params: { language } });
    // Puede venir { translations: {...} } o el mapa directo
    if (data?.translations && typeof data.translations === 'object') return data.translations;
    return data;
  },
};

// ─── Recipe service ───────────────────────────────────────────────────────────
// Respuesta real del backend: { recipes: [...], pagination: {...} }
export const recipeService = {
  getAll: async (params?: RecipesListParams): Promise<PaginatedResponse<Recipe>> => {
    const { data } = await api.get('/recipes', { params });
    return normalizePaginated<Recipe>(data);
  },

  getMine: async (params?: RecipesListParams): Promise<PaginatedResponse<Recipe>> => {
    const { data } = await api.get('/recipes/my', { params });
    return normalizePaginated<Recipe>(data);
  },

  getFavourites: async (params?: PaginationParams): Promise<PaginatedResponse<Recipe>> => {
    const { data } = await api.get('/recipes/favourites', { params });
    return normalizePaginated<Recipe>(data);
  },

  getById: async (id: string): Promise<Recipe> => {
    const { data } = await api.get(`/recipes/${id}`);
    return data?.recipe ?? data;
  },

  create: async (payload: CreateRecipePayload): Promise<Recipe> => {
    const { data } = await api.post<Recipe>('/recipes', payload);
    return data?.recipe ?? data;
  },

  update: async (id: string, payload: UpdateRecipePayload): Promise<Recipe> => {
    const { data } = await api.put<Recipe>(`/recipes/${id}`, payload);
    return data?.recipe ?? data;
  },

  togglePublish: async (id: string): Promise<Recipe> => {
    const { data } = await api.patch<Recipe>(`/recipes/${id}/publish`);
    return data?.recipe ?? data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`);
  },

  createRating: async (id: string, payload: CreateRatingPayload): Promise<void> => {
    await api.post(`/recipes/${id}/ratings`, payload);
  },

  deleteRating: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}/ratings`);
  },

  toggleFavourite: async (id: string): Promise<{ isFavourited: boolean }> => {
    const { data } = await api.post(`/recipes/${id}/favourite`);
    return data;
  },

  getCategories: async (): Promise<RecipeCategory[]> => {
    const { data } = await api.get('/recipes/categories');
    return normalizeArray<RecipeCategory>(data);
  },

  createCategory: async (payload: CreateCategoryPayload): Promise<RecipeCategory> => {
    const { data } = await api.post<RecipeCategory>('/recipes/categories', payload);
    return data?.category ?? data;
  },

  updateCategory: async (id: string, payload: Partial<CreateCategoryPayload>): Promise<RecipeCategory> => {
    const { data } = await api.put<RecipeCategory>(`/recipes/categories/${id}`, payload);
    return data?.category ?? data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/recipes/categories/${id}`);
  },

  getTags: async (): Promise<RecipeTag[]> => {
    const { data } = await api.get('/recipes/tags');
    return normalizeArray<RecipeTag>(data);
  },

  createTag: async (payload: CreateTagPayload): Promise<RecipeTag> => {
    const { data } = await api.post<RecipeTag>('/recipes/tags', payload);
    return data?.tag ?? data;
  },

  deleteTag: async (id: string): Promise<void> => {
    await api.delete(`/recipes/tags/${id}`);
  },
};

// ─── Dashboard service ─────────────────────────────────────────────────────────
export const dashboardService = {
  getStats:    async () => { const { data } = await api.get('/dashboard/stats');    return data; },
  getActivity: async () => { const { data } = await api.get('/dashboard/activity'); return data; },
};

// ─── Health service ────────────────────────────────────────────────────────────
export const healthService = {
  check: async (): Promise<HealthStatus> => {
    const base = api.defaults.baseURL?.replace('/api', '') ?? '';
    const { data } = await axios.get<HealthStatus>(`${base}/health`, { timeout: 5000 });
    return data;
  },
};

// ─── Types locales ─────────────────────────────────────────────────────────────
interface PaginationParams {
  page?: number;
  limit?: number;
}

export default api;
