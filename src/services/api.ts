// @ts-nocheck — API unwrap types vs backend payloads; tighten when backend schema is fixed.
// src/services/api.ts
import axios, { AxiosError, AxiosRequestConfig, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import { API_URL } from '@env';
import { secureKV } from '../lib/secureKV';
import type {
  LoginPayload, LoginResponse, RefreshResponse,
  ApiUser, UpdateUserPayload, CreateUserPayload, ChangePasswordPayload, UsersListParams,
  PaginatedResponse, Permission, UpdatePermissionPayload, Role,
  Setting, UpdateSettingPayload, TranslationMap, Language,
  Recipe, RecipesListParams, CreateRecipePayload, UpdateRecipePayload,
  CreateRatingPayload, RecipeCategory, RecipeTag,
  CreateCategoryPayload, CreateTagPayload, HealthStatus,
  ShoppingList, ShoppingListItem, CreateShoppingListPayload, UpdateShoppingListPayload,
  CreateShoppingListItemPayload, UpdateShoppingListItemPayload, GenerateShoppingListPayload,
  ShoppingListsParams,
} from '../types/api.types';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const TOKEN_KEY         = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export const API_URL_KEY     = 'api_base_url';
// Prioridad: Storage (Settings) > .env API_URL > fallback hardcodeado
export const DEFAULT_API_URL: string = API_URL ?? 'https://jo-backend-cookbook.vercel.app/api';

// ─── Retry config ─────────────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay:  800,
  maxDelay:   4000,
  retryCodes: [500, 502, 503, 504],
};

// ─── Storage ──────────────────────────────────────────────────────────────────
export const storage = {
  getItemAsync: (key: string): Promise<string | null> => secureKV.getItemAsync(key),
  setItemAsync: (key: string, value: string): Promise<void> => secureKV.setItemAsync(key, value),
  deleteItemAsync: (key: string): Promise<void> => secureKV.deleteItemAsync(key),
};

/** Avoid reading encrypted storage on every HTTP request; sync via storeTokens/clearTokens/setAccessTokenMemory. */
let cachedAccessToken: string | null | undefined = undefined;

export function setAccessTokenMemory(token: string | null) {
  cachedAccessToken = token;
}

async function resolveAccessTokenForRequest(): Promise<string | null> {
  if (cachedAccessToken !== undefined) return cachedAccessToken;
  const t = await storage.getItemAsync(TOKEN_KEY);
  cachedAccessToken = t;
  return t;
}

// ─── URL helpers ──────────────────────────────────────────────────────────────
/** Android emulator: localhost is the emulator itself; 10.0.2.2 is the dev machine. (Physical device → use your PC LAN IP in settings.) */
export function rewriteLocalhostForAndroid(url: string): string {
  if (Platform.OS !== 'android' || !url) return url;
  return url
    .replace(/:\/\/localhost\b/gi, '://10.0.2.2')
    .replace(/:\/\/127\.0\.0\.1\b/g, '://10.0.2.2');
}

export const getSavedApiUrl = async (): Promise<string> => {
  const saved = await storage.getItemAsync(API_URL_KEY);
  const url = (saved ?? DEFAULT_API_URL).trim();
  return rewriteLocalhostForAndroid(url);
};

export const saveApiUrl = async (url: string): Promise<void> => {
  const trimmed = url.trim();
  await storage.setItemAsync(API_URL_KEY, trimmed);
  api.defaults.baseURL = rewriteLocalhostForAndroid(trimmed);
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

function isInvalidTokenError(error: AxiosError): boolean {
  const status = error.response?.status;
  if (status !== 403) return false;
  const payload: any = error.response?.data;
  const message = String(payload?.message ?? payload?.error ?? '').toLowerCase();
  return message.includes('invalid token') || message.includes('jwt');
}

/** First human-readable string from typical Express/Nest error bodies */
export function getApiErrorMessage(err: unknown): string | undefined {
  const d = (err as AxiosError<any>)?.response?.data;
  if (!d || typeof d !== 'object') return undefined;
  if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
  if (Array.isArray(d.message) && d.message.length) return d.message.map(String).join(', ');
  if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
  return undefined;
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
  baseURL: rewriteLocalhostForAndroid(DEFAULT_API_URL),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

getSavedApiUrl().then(url => { api.defaults.baseURL = url; });

/**
 * Rutas públicas del backend (cover, avatars) suelen venir como `/uploads/...`.
 * En web, `Image` necesita URL absoluta; si no, la carta/detail queda rota o en blanco.
 */
export function resolvePublicMediaUrl(raw: string | null | undefined): string | undefined {
  if (raw == null || typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t) || t.startsWith('data:') || t.startsWith('file:')) return t;
  const baseURL = api.defaults.baseURL ?? '';
  const origin = baseURL.replace(/\/api\/?$/, '');
  if (t.startsWith('/')) return `${origin}${t}`;
  return `${origin}/${t}`;
}

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
  cachedAccessToken = data.accessToken;
  return data.accessToken;
}

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await resolveAccessTokenForRequest();
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

    // Login/register 401 = wrong credentials, not expired session — never run refresh
    const reqPath = (config.url ?? '').split('?')[0].toLowerCase();
    const isCredentialAuth =
      reqPath.includes('/auth/login') || reqPath.includes('/auth/register');

    // ── Token refresh on 401 ──────────────────────────────────────────────────
    if (error.response?.status === 401 && !config._isRetry && !isCredentialAuth) {
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
        cachedAccessToken = null;
        await storage.deleteItemAsync(TOKEN_KEY);
        await storage.deleteItemAsync(REFRESH_TOKEN_KEY);
        _onAuthExpired?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Some backends return 403 instead of 401 for invalid/expired JWTs.
    if (isInvalidTokenError(error)) {
      cachedAccessToken = null;
      await storage.deleteItemAsync(TOKEN_KEY);
      await storage.deleteItemAsync(REFRESH_TOKEN_KEY);
      _onAuthExpired?.();
      return Promise.reject(error);
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
  cachedAccessToken = accessToken;
  await storage.setItemAsync(TOKEN_KEY, accessToken);
  await storage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};
export const clearTokens = async () => {
  cachedAccessToken = null;
  await storage.deleteItemAsync(TOKEN_KEY);
  await storage.deleteItemAsync(REFRESH_TOKEN_KEY);
};
export const getToken   = () => storage.getItemAsync(TOKEN_KEY);
export const storeToken  = async (token: string) => {
  cachedAccessToken = token;
  await storage.setItemAsync(TOKEN_KEY, token);
};
export const clearToken  = async () => {
  cachedAccessToken = null;
  await storage.deleteItemAsync(TOKEN_KEY);
};

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
    cachedAccessToken = data.accessToken;
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

  getRoles: async (): Promise<string[] | Role[]> => {
    const { data } = await api.get('/users/roles');
    // El endpoint puede devolver string[] o Role[] dependiendo del backend
    return Array.isArray(data) ? data : normalizeArray(data);
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
  // Obtener todos los permisos del sistema (ADMIN)
  getAll: async (): Promise<Permission[]> => {
    const { data } = await api.get('/permissions/');
    return normalizeArray<Permission>(data.permissions || data);
  },

  // Obtener permisos por rol específico (ADMIN)
  getByRole: async (role: string): Promise<Permission[]> => {
    const { data } = await api.get(`/permissions/role/${role}`);
    return normalizeArray<Permission>(data.permissions || data);
  },

  // Obtener mis permisos (usuario autenticado)
  getMyPermissions: async (): Promise<Permission[]> => {
    const { data } = await api.get('/permissions/my-permissions');
    return normalizeArray<Permission>(data.permissions || data);
  },

  // Verificar permiso específico
  checkPermission: async (role: string, resource: string, action: string): Promise<boolean> => {
    const { data } = await api.get('/permissions/check', { 
      params: { role, resource, action } 
    });
    return data.hasPermission;
  },

  // Actualizar permiso individual (ADMIN)
  update: async (payload: UpdatePermissionPayload): Promise<Permission> => {
    const { data } = await api.put<Permission>('/permissions/', payload);
    return data;
  },

  // Actualización masiva de permisos (ADMIN)
  bulkUpdate: async (permissions: UpdatePermissionPayload[]): Promise<Permission[]> => {
    const { data } = await api.put('/permissions/bulk', { permissions });
    return normalizeArray<Permission>(data.permissions || data);
  },

  // Resetear todos los permisos a valores por defecto (ADMIN)
  reset: async (): Promise<Permission[]> => {
    const { data } = await api.post('/permissions/reset');
    return normalizeArray<Permission>(data.permissions || data);
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

// ─── Shopping List service ─────────────────────────────────────────────────────
export const shoppingListService = {
  // Obtener todas las listas del usuario
  getAll: async (params?: ShoppingListsParams, bustCache = false): Promise<PaginatedResponse<ShoppingList>> => {
    const finalParams = bustCache ? { ...params, _t: Date.now() } : params;
    const { data } = await api.get('/shopping-lists', { params: finalParams });
    return normalizePaginated<ShoppingList>(data);
  },

  // Obtener lista por ID
  getById: async (id: string, bustCache = false): Promise<ShoppingList> => {
    const params = bustCache ? { _t: Date.now() } : {};
    const { data } = await api.get(`/shopping-lists/${id}`, { params });
    const result = data?.shoppingList ?? data;
    return result;
  },

  // Crear lista vacía
  create: async (payload: CreateShoppingListPayload): Promise<ShoppingList> => {
    const { data } = await api.post<ShoppingList>('/shopping-lists', payload);
    return data?.shoppingList ?? data;
  },

  // Generar lista desde recetas
  generateFromRecipes: async (payload: GenerateShoppingListPayload): Promise<ShoppingList> => {
    const { data } = await api.post<ShoppingList>('/shopping-lists/generate', payload);
    return data?.shoppingList ?? data;
  },

  // Actualizar lista
  update: async (id: string, payload: UpdateShoppingListPayload): Promise<ShoppingList> => {
    const { data } = await api.put<ShoppingList>(`/shopping-lists/${id}`, payload);
    return data?.shoppingList ?? data;
  },

  // Eliminar lista
  delete: async (id: string): Promise<void> => {
    await api.delete(`/shopping-lists/${id}`);
  },

  // Duplicar lista
  duplicate: async (id: string, name?: string): Promise<ShoppingList> => {
    const { data } = await api.post<ShoppingList>(`/shopping-lists/${id}/duplicate`, { name });
    return data?.shoppingList ?? data;
  },

  // ── Items de la lista ──
  
  // Agregar item a lista
  addItem: async (listId: string, payload: CreateShoppingListItemPayload): Promise<ShoppingListItem> => {
    const { data } = await api.post<ShoppingListItem>(`/shopping-lists/${listId}/items`, payload);
    return data?.item ?? data;
  },

  // Actualizar item
  updateItem: async (listId: string, itemId: string, payload: UpdateShoppingListItemPayload): Promise<ShoppingListItem> => {
    const { data } = await api.put<ShoppingListItem>(`/shopping-lists/${listId}/items/${itemId}`, payload);
    return data?.item ?? data;
  },

  // Marcar item como completado/pendiente
  toggleItemCompleted: async (listId: string, itemId: string): Promise<ShoppingListItem> => {
    await api.patch(`/shopping-lists/${listId}/items/${itemId}/toggle`);
    
    // Force fresh data by busting cache
    const updatedList = await shoppingListService.getById(listId, true);
    const updatedItem = updatedList.items?.find(
      (it) => String(it.id) === String(itemId)
    );
    
    if (!updatedItem) {
      throw new Error('Item not found after toggle');
    }
    
    return updatedItem;
  },

  // Eliminar item
  deleteItem: async (listId: string, itemId: string): Promise<void> => {
    await api.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  // Reordenar items
  reorderItems: async (listId: string, itemIds: string[]): Promise<void> => {
    await api.put(`/shopping-lists/${listId}/items/reorder`, { itemIds });
  },

  // Marcar todos los items como completados/pendientes
  toggleAllItems: async (listId: string, completed: boolean): Promise<ShoppingList> => {
    const { data } = await api.patch<ShoppingList>(`/shopping-lists/${listId}/toggle-all`, { completed });
    return data?.shoppingList ?? data;
  },

  // Limpiar items completados
  clearCompleted: async (listId: string): Promise<ShoppingList> => {
    const { data } = await api.delete<ShoppingList>(`/shopping-lists/${listId}/completed`);
    return data?.shoppingList ?? data;
  },
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
