// src/hooks/useRoles.ts
// Reutilizable: carga roles desde /api/roles con estado de carga, error y fallback.
// Compatible: web, iOS, Android.
import { useState, useEffect, useCallback, useRef } from 'react';
import { roleService } from '../services/api';
import type { Role } from '../types/api.types';

// ─── Fallback si el endpoint falla ───────────────────────────────────────────
const FALLBACK_ROLES: Role[] = [
  { id: 'USER',      name: 'USER',      description: 'Standard user' },
  { id: 'ADMIN',     name: 'ADMIN',     description: 'Administrator' },
  { id: 'DEVELOPER', name: 'DEVELOPER', description: 'Developer access' },
];

// ─── Cache en memoria (persiste durante la sesión) ────────────────────────────
let _cachedRoles: Role[] | null = null;
let _fetchPromise: Promise<Role[]> | null = null;

export interface UseRolesReturn {
  roles:   Role[];
  loading: boolean;
  error:   string | null;
  reload:  () => Promise<void>;
}

/**
 * Hook reutilizable que carga los roles desde el backend.
 * - Usa cache en memoria para no repetir la petición en el mismo ciclo de vida.
 * - Vuelve a los FALLBACK_ROLES si el endpoint falla.
 * - Normaliza respuestas que vengan como string[] u objetos Role[].
 *
 * @example
 * const { roles, loading, error } = useRoles();
 */
export function useRoles(): UseRolesReturn {
  const [roles,   setRoles]   = useState<Role[]>(_cachedRoles ?? []);
  const [loading, setLoading] = useState<boolean>(!_cachedRoles);
  const [error,   setError]   = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchRoles = useCallback(async (force = false) => {
    // Si hay cache válida y no forzamos recarga, usarla directamente
    if (_cachedRoles && !force) {
      setRoles(_cachedRoles);
      setLoading(false);
      return;
    }

    // Si ya hay una petición en vuelo, esperar la misma (evita peticiones duplicadas)
    if (_fetchPromise && !force) {
      try {
        const result = await _fetchPromise;
        if (mountedRef.current) { setRoles(result); setLoading(false); }
      } catch {
        if (mountedRef.current) { setRoles(FALLBACK_ROLES); setLoading(false); }
      }
      return;
    }

    setLoading(true);
    setError(null);

    _fetchPromise = (async (): Promise<Role[]> => {
      try {
        const raw = await roleService.getAll();
        const normalized = normalizeRoles(raw);
        const result = normalized.length > 0 ? normalized : FALLBACK_ROLES;
        _cachedRoles = result;
        return result;
      } catch (err: any) {
        // El endpoint /api/roles puede no existir en todos los backends —
        // intentamos también /api/users/roles como fallback
        try {
          const { userService } = await import('../services/api');
          const raw = await userService.getRoles();
          const normalized = normalizeStringRoles(raw);
          const result = normalized.length > 0 ? normalized : FALLBACK_ROLES;
          _cachedRoles = result;
          return result;
        } catch {
          _cachedRoles = FALLBACK_ROLES;
          throw err;
        }
      } finally {
        _fetchPromise = null;
      }
    })();

    try {
      const result = await _fetchPromise;
      if (mountedRef.current) { setRoles(result); setLoading(false); }
    } catch (err: any) {
      if (mountedRef.current) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Could not load roles';
        setError(msg);
        setRoles(FALLBACK_ROLES);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const reload = useCallback(() => {
    _cachedRoles = null;
    return fetchRoles(true);
  }, [fetchRoles]);

  return { roles, loading, error, reload };
}

// ─── Helpers de normalización ─────────────────────────────────────────────────

/**
 * Normaliza Role[] que puede venir como:
 *   - { id, name, description, isSystem }   ← formato estándar del informe
 *   - { id, name }
 *   - string[]                               ← /api/users/roles
 */
function normalizeRoles(raw: any): Role[] {
  if (!raw) return [];

  // Array directo
  const arr: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.roles)
    ? raw.roles
    : [];

  return arr
    .map((item): Role | null => {
      if (typeof item === 'string') {
        return { id: item, name: item };
      }
      if (item && typeof item === 'object') {
        const name = item.name ?? item.displayName ?? item.id ?? '';
        if (!name) return null;
        return {
          id:          item.id   ?? name,
          name,
          description: item.description ?? undefined,
          isSystem:    item.isSystem    ?? undefined,
        };
      }
      return null;
    })
    .filter((r): r is Role => r !== null && r.name.length > 0);
}

/** Convierte string[] (de /api/users/roles) a Role[] */
function normalizeStringRoles(raw: any): Role[] {
  const arr: any[] = Array.isArray(raw) ? raw : [];
  return arr
    .map((item): Role | null => {
      if (typeof item === 'string' && item.length > 0) {
        return { id: item, name: item };
      }
      return null;
    })
    .filter((r): r is Role => r !== null);
}

/** Limpia la cache (útil al hacer logout) */
export function clearRolesCache() {
  _cachedRoles  = null;
  _fetchPromise = null;
}
