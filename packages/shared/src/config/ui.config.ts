/**
 * UI Configuration
 * Centralized UI settings and constants
 */

import { UiConfig } from './types';

// Pagination settings
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
  SHOW_FIRST_LAST: true,
  SHOW_PAGE_NUMBERS: 5,
} as const;

// Animation settings
export const ANIMATIONS = {
  DURATION: {
    INSTANT: 0,
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    VERY_SLOW: 1000,
  },
  EASING: {
    LINEAR: 'linear',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    CUBIC_BEZIER: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  XS: 0,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536,
} as const;

// Z-index layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080,
} as const;

// Spacing scale
export const SPACING = {
  NONE: 0,
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
  XXXL: 64,
} as const;

// Color palette
export const COLORS = {
  // Primary colors
  PRIMARY: '#4F46E5', // Indigo
  PRIMARY_HOVER: '#4338CA',
  PRIMARY_LIGHT: '#818CF8',
  PRIMARY_DARK: '#3730A3',
  
  // Secondary colors
  SECONDARY: '#7C3AED', // Purple
  SECONDARY_HOVER: '#6D28D9',
  SECONDARY_LIGHT: '#A78BFA',
  SECONDARY_DARK: '#5B21B6',
  
  // Semantic colors
  SUCCESS: '#10B981', // Green
  SUCCESS_HOVER: '#059669',
  SUCCESS_LIGHT: '#34D399',
  SUCCESS_DARK: '#047857',
  
  ERROR: '#EF4444', // Red
  ERROR_HOVER: '#DC2626',
  ERROR_LIGHT: '#F87171',
  ERROR_DARK: '#B91C1C',
  
  WARNING: '#F59E0B', // Amber
  WARNING_HOVER: '#D97706',
  WARNING_LIGHT: '#FCD34D',
  WARNING_DARK: '#B45309',
  
  INFO: '#3B82F6', // Blue
  INFO_HOVER: '#2563EB',
  INFO_LIGHT: '#60A5FA',
  INFO_DARK: '#1D4ED8',
  
  // Neutral colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// Typography settings
export const TYPOGRAPHY = {
  FONT_FAMILY: {
    SANS: 'Inter, system-ui, -apple-system, sans-serif',
    MONO: 'JetBrains Mono, Consolas, monospace',
  },
  FONT_SIZE: {
    XS: '0.75rem', // 12px
    SM: '0.875rem', // 14px
    BASE: '1rem', // 16px
    LG: '1.125rem', // 18px
    XL: '1.25rem', // 20px
    XXL: '1.5rem', // 24px
    XXXL: '1.875rem', // 30px
    XXXXL: '2.25rem', // 36px
  },
  FONT_WEIGHT: {
    THIN: 100,
    LIGHT: 300,
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    EXTRABOLD: 800,
    BLACK: 900,
  },
  LINE_HEIGHT: {
    NONE: 1,
    TIGHT: 1.25,
    SNUG: 1.375,
    NORMAL: 1.5,
    RELAXED: 1.625,
    LOOSE: 2,
  },
} as const;

// Form settings
export const FORM_SETTINGS = {
  DEBOUNCE_MS: 300,
  AUTOCOMPLETE_MIN_CHARS: 2,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm',
} as const;

// Toast/Notification settings
export const TOAST_SETTINGS = {
  POSITION: 'top-right' as const,
  DURATION: 5000,
  MAX_TOASTS: 5,
  CLOSE_ON_CLICK: true,
  PAUSE_ON_HOVER: true,
  SHOW_PROGRESS_BAR: true,
} as const;

// Modal settings
export const MODAL_SETTINGS = {
  CLOSE_ON_BACKDROP: true,
  CLOSE_ON_ESC: true,
  SHOW_CLOSE_BUTTON: true,
  ANIMATION_DURATION: 300,
  BACKDROP_OPACITY: 0.5,
} as const;

// Table settings
export const TABLE_SETTINGS = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  SHOW_ROW_NUMBERS: false,
  STRIPED_ROWS: true,
  HOVER_HIGHLIGHT: true,
  STICKY_HEADER: true,
  RESIZABLE_COLUMNS: true,
} as const;

// Loading states
export const LOADING_STATES = {
  SKELETON_ANIMATION: 'pulse',
  SPINNER_SIZE: {
    SM: 16,
    MD: 24,
    LG: 32,
    XL: 48,
  },
  OVERLAY_OPACITY: 0.8,
} as const;

// Create UI configuration
export function createUiConfig(): UiConfig {
  return {
    pagination: {
      defaultPageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      maxPageSize: PAGINATION.MAX_PAGE_SIZE,
    },
    formDefaults: {
      debounceMs: FORM_SETTINGS.DEBOUNCE_MS,
      maxFileSize: FORM_SETTINGS.MAX_FILE_SIZE,
      allowedFileTypes: [...FORM_SETTINGS.ALLOWED_FILE_TYPES],
    },
    animations: {
      duration: ANIMATIONS.DURATION.NORMAL,
      easing: ANIMATIONS.EASING.EASE_IN_OUT,
    },
    theme: {
      primaryColor: COLORS.PRIMARY,
      secondaryColor: COLORS.SECONDARY,
      errorColor: COLORS.ERROR,
      successColor: COLORS.SUCCESS,
      warningColor: COLORS.WARNING,
    },
  };
}

// Export default configuration
export const uiConfig = createUiConfig();