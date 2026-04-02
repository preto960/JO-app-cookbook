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

// ─── Shopping List types ──────────────────────────────────────────────────────

export interface ShoppingListItem {
  id: string;
  shoppingListId?: string; // ID de la lista a la que pertenece (enviado por backend)
  name: string;
  quantity: string;
  unit?: string;
  notes?: string;
  isCompleted: boolean;
  category?: string;
  displayOrder: number;
  recipeIds?: string[]; // IDs de las recetas que requieren este ingrediente
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  items?: ShoppingListItem[]; // Optional to handle backend responses that might not include items
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  recipeIds?: string[]; // Recetas usadas para generar esta lista
  itemCount?: number; // Total number of items (provided by backend in list view)
  completedCount?: number; // Number of completed items (provided by backend in list view)
  recipes?: Array<{
    id: string;
    recipeId: string;
    recipe: {
      id: string;
      title: string;
      slug: string;
    };
    createdAt: string;
  }>; // Recetas asociadas con detalles completos
}

export interface CreateShoppingListPayload {
  name: string;
  description?: string;
  items?: Omit<ShoppingListItem, 'id' | 'displayOrder'>[];
  recipeIds?: string[];
}

export interface UpdateShoppingListPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateShoppingListItemPayload {
  name: string;
  quantity: string;
  unit?: string;
  notes?: string;
  category?: string;
}

export interface UpdateShoppingListItemPayload {
  name?: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  isCompleted?: boolean;
  category?: string;
}

export interface GenerateShoppingListPayload {
  name: string;
  recipeIds: string[];
  description?: string;
}

export interface ShoppingListsParams extends PaginationParams {
  search?: string;
  isActive?: boolean;
}

// ─── Health types ─────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'error';
  dbConnected: boolean;
  timestamp?: string;
}
