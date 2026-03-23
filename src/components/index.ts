// src/components/index.ts
// Barrel file — import all shared components from one place.
// Example: import { StatusBadge, EmptyState, SkeletonList } from '../components';

export { default as StatusBadge }   from './StatusBadge';
export { default as EmptyState }    from './EmptyState';
export { default as SearchBar }     from './SearchBar';
export { default as FilterBar }     from './FilterBar';
export { default as Pagination }    from './Pagination';
export { default as FormField }     from './FormField';
export { default as ActionMenu }    from './ActionMenu';
export { default as ModalSheet }    from './ModalSheet';
export { SectionHeader, ListCard, Divider } from './ListCard';
export {
  SkeletonBox, SkeletonListRow, SkeletonCard,
  SkeletonStatCard, SkeletonList,
} from './SkeletonLoader';

// Re-export existing components to avoid importing from two places
export { default as ThemedCard }     from './ThemedCard';
export { default as SettingRow }     from './SettingRow';
export { default as InfoRow }        from './InfoRow';
export { default as ConfirmModal }   from './ConfirmModal';
export { default as ThemeToggle }    from './ThemeToggle';
export { default as HeaderAvatar }   from './HeaderAvatar';
export { default as ToastContainer } from './ToastContainer';
export { default as DebugPanel }     from './DebugPanel';
export { default as PasswordInput }  from './PasswordInput';
