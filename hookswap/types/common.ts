
// Common UI states
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Sort parameters
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Filter parameters
export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

// Search parameters
export interface SearchParams {
  query: string;
  filters?: FilterParams[];
  sort?: SortParams;
  pagination?: PaginationParams;
}

// Notification types
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Notification message
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

// Form validation error
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Form state
export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

// Modal state
export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
  onClose?: () => void;
  onConfirm?: () => void;
}

// Theme configuration
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  borderRadius: number;
  fontSize: number;
}

// User preferences
export interface UserPreferences {
  theme: ThemeConfig;
  language: string;
  currency: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// Error boundary state
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

// Performance metrics
export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  renderTime: number;
  memoryUsage: number;
  timestamp: number;
}
