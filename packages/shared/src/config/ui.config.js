"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiConfig = exports.LOADING_STATES = exports.TABLE_SETTINGS = exports.MODAL_SETTINGS = exports.TOAST_SETTINGS = exports.FORM_SETTINGS = exports.TYPOGRAPHY = exports.COLORS = exports.SPACING = exports.Z_INDEX = exports.BREAKPOINTS = exports.ANIMATIONS = exports.PAGINATION = void 0;
exports.createUiConfig = createUiConfig;
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_PAGE_SIZE: 100,
    SHOW_FIRST_LAST: true,
    SHOW_PAGE_NUMBERS: 5,
};
exports.ANIMATIONS = {
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
};
exports.BREAKPOINTS = {
    XS: 0,
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536,
};
exports.Z_INDEX = {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
};
exports.SPACING = {
    NONE: 0,
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
    XXXL: 64,
};
exports.COLORS = {
    PRIMARY: '#4F46E5',
    PRIMARY_HOVER: '#4338CA',
    PRIMARY_LIGHT: '#818CF8',
    PRIMARY_DARK: '#3730A3',
    SECONDARY: '#7C3AED',
    SECONDARY_HOVER: '#6D28D9',
    SECONDARY_LIGHT: '#A78BFA',
    SECONDARY_DARK: '#5B21B6',
    SUCCESS: '#10B981',
    SUCCESS_HOVER: '#059669',
    SUCCESS_LIGHT: '#34D399',
    SUCCESS_DARK: '#047857',
    ERROR: '#EF4444',
    ERROR_HOVER: '#DC2626',
    ERROR_LIGHT: '#F87171',
    ERROR_DARK: '#B91C1C',
    WARNING: '#F59E0B',
    WARNING_HOVER: '#D97706',
    WARNING_LIGHT: '#FCD34D',
    WARNING_DARK: '#B45309',
    INFO: '#3B82F6',
    INFO_HOVER: '#2563EB',
    INFO_LIGHT: '#60A5FA',
    INFO_DARK: '#1D4ED8',
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
};
exports.TYPOGRAPHY = {
    FONT_FAMILY: {
        SANS: 'Inter, system-ui, -apple-system, sans-serif',
        MONO: 'JetBrains Mono, Consolas, monospace',
    },
    FONT_SIZE: {
        XS: '0.75rem',
        SM: '0.875rem',
        BASE: '1rem',
        LG: '1.125rem',
        XL: '1.25rem',
        XXL: '1.5rem',
        XXXL: '1.875rem',
        XXXXL: '2.25rem',
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
};
exports.FORM_SETTINGS = {
    DEBOUNCE_MS: 300,
    AUTOCOMPLETE_MIN_CHARS: 2,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_FILE_TYPES: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
    DATE_FORMAT: 'YYYY-MM-DD',
    TIME_FORMAT: 'HH:mm',
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm',
};
exports.TOAST_SETTINGS = {
    POSITION: 'top-right',
    DURATION: 5000,
    MAX_TOASTS: 5,
    CLOSE_ON_CLICK: true,
    PAUSE_ON_HOVER: true,
    SHOW_PROGRESS_BAR: true,
};
exports.MODAL_SETTINGS = {
    CLOSE_ON_BACKDROP: true,
    CLOSE_ON_ESC: true,
    SHOW_CLOSE_BUTTON: true,
    ANIMATION_DURATION: 300,
    BACKDROP_OPACITY: 0.5,
};
exports.TABLE_SETTINGS = {
    DEFAULT_PAGE_SIZE: 25,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
    SHOW_ROW_NUMBERS: false,
    STRIPED_ROWS: true,
    HOVER_HIGHLIGHT: true,
    STICKY_HEADER: true,
    RESIZABLE_COLUMNS: true,
};
exports.LOADING_STATES = {
    SKELETON_ANIMATION: 'pulse',
    SPINNER_SIZE: {
        SM: 16,
        MD: 24,
        LG: 32,
        XL: 48,
    },
    OVERLAY_OPACITY: 0.8,
};
function createUiConfig() {
    return {
        pagination: {
            defaultPageSize: exports.PAGINATION.DEFAULT_PAGE_SIZE,
            maxPageSize: exports.PAGINATION.MAX_PAGE_SIZE,
        },
        formDefaults: {
            debounceMs: exports.FORM_SETTINGS.DEBOUNCE_MS,
            maxFileSize: exports.FORM_SETTINGS.MAX_FILE_SIZE,
            allowedFileTypes: [...exports.FORM_SETTINGS.ALLOWED_FILE_TYPES],
        },
        animations: {
            duration: exports.ANIMATIONS.DURATION.NORMAL,
            easing: exports.ANIMATIONS.EASING.EASE_IN_OUT,
        },
        theme: {
            primaryColor: exports.COLORS.PRIMARY,
            secondaryColor: exports.COLORS.SECONDARY,
            errorColor: exports.COLORS.ERROR,
            successColor: exports.COLORS.SUCCESS,
            warningColor: exports.COLORS.WARNING,
        },
    };
}
exports.uiConfig = createUiConfig();
//# sourceMappingURL=ui.config.js.map