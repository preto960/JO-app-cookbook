// src/types/api.types.ts
// ─── Shared API response shapes ───────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─── User types ───────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatar?: string | null;
  bio?: string | null;
  website?: string | null;
  github?: string | null;
  twitter?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  isActive?: boolean;
  bio?: string;
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  bio?: string;
  website?: string;
  github?: string;
  twitter?: string;
}

export interface ChangePasswordPayload {
  password: string;
}

export interface UsersListParams extends PaginationParams {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive';
}

// ─── Permission / Role types ───────────────────────────────────────────────────

export type ResourceAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

export interface Permission {
  id: string;
  role: string;
  resource: string;
  resourceLabel?: string;
  resourceDescription?: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInMenu: boolean;
  isDynamic: boolean;
  pluginId?: string | null;
  displayOrder: number;
}

export interface UpdatePermissionPayload {
  role: string;
  resource: string;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canInMenu?: boolean;
}

export interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isSystem?: boolean;
}

// ─── Setting types ─────────────────────────────────────────────────────────────

export interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  isPublic: boolean;
  description?: string;
}

export interface UpdateSettingPayload {
  value: string;
}

// ─── Translation types ──────────────────────────────────────────────────────────

export type Language = 'en' | 'es';

export interface Translation {
  id: string;
  key: string;
  language: Language;
  value: string;
  isSystem?: boolean;
}

export type TranslationMap = Record<string, string>;

// ─── Recipe types ──────────────────────────────────────────────────────────────

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export interface RecipeCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  displayOrder?: number;
}

export interface RecipeTag {
  id: string;
  name: string;
  slug: string;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  notes?: string;
  displayOrder: number;
}

export interface RecipeRating {
  id: string;
  score: number;
  userId: string;
  recipeId: string;
  createdAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  instructions: string;
  prepTimeMin?: number;
  cookTimeMin?: number;
  servings?: number;
  difficulty: RecipeDifficulty;
  coverImage?: string | null;
  isPublished: boolean;
  isActive: boolean;
  category?: RecipeCategory | null;
  tags: RecipeTag[];
  ingredients: RecipeIngredient[];
  avgRating?: number | null;
  ratingsCount?: number;
  isFavourited?: boolean;
  userRating?: number | null;
  // Backend fields (real structure)
  averageRating?: number;
  ratingCount?: number;
  ratings?: Array<{
    id: string;
    userId: string;
    score: number;
    user: Pick<ApiUser, 'id' | 'firstName' | 'lastName'>;
  }>;
  createdBy?: Pick<ApiUser, 'id' | 'firstName' | 'lastName'>;
  creator?: Pick<ApiUser, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
  updatedAt: string;
}

export interface RecipesListParams extends PaginationParams {
  search?: string;
  categoryId?: string;
  difficulty?: RecipeDifficulty;
  isPublished?: boolean;
  tagIds?: string[];
}

export interface CreateRecipePayload {
  title: string;
  description?: string;
  instructions: string;
  prepTimeMin?: number;
  cookTimeMin?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  coverImage?: string;
  isPublished?: boolean;
  categoryId?: string;
  tagIds?: string[];
  ingredients?: Omit<RecipeIngredient, 'id' | 'recipeId'>[];
}

export type UpdateRecipePayload = Partial<CreateRecipePayload>;

export interface CreateRatingPayload {
  score: number;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface CreateTagPayload {
  name: string;
}

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export interface RefreshResponse {
  accessToken: string;
}

// ─── Health types ─────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'error';
  dbConnected: boolean;
  timestamp?: string;
}
