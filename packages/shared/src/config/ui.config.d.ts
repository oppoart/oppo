import { UiConfig } from './types';
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_PAGE_SIZE: 20;
    readonly PAGE_SIZE_OPTIONS: readonly [10, 20, 50, 100];
    readonly MAX_PAGE_SIZE: 100;
    readonly SHOW_FIRST_LAST: true;
    readonly SHOW_PAGE_NUMBERS: 5;
};
export declare const ANIMATIONS: {
    readonly DURATION: {
        readonly INSTANT: 0;
        readonly FAST: 150;
        readonly NORMAL: 300;
        readonly SLOW: 500;
        readonly VERY_SLOW: 1000;
    };
    readonly EASING: {
        readonly LINEAR: "linear";
        readonly EASE_IN: "ease-in";
        readonly EASE_OUT: "ease-out";
        readonly EASE_IN_OUT: "ease-in-out";
        readonly CUBIC_BEZIER: "cubic-bezier(0.4, 0, 0.2, 1)";
    };
};
export declare const BREAKPOINTS: {
    readonly XS: 0;
    readonly SM: 640;
    readonly MD: 768;
    readonly LG: 1024;
    readonly XL: 1280;
    readonly XXL: 1536;
};
export declare const Z_INDEX: {
    readonly DROPDOWN: 1000;
    readonly STICKY: 1020;
    readonly FIXED: 1030;
    readonly MODAL_BACKDROP: 1040;
    readonly MODAL: 1050;
    readonly POPOVER: 1060;
    readonly TOOLTIP: 1070;
    readonly TOAST: 1080;
};
export declare const SPACING: {
    readonly NONE: 0;
    readonly XS: 4;
    readonly SM: 8;
    readonly MD: 16;
    readonly LG: 24;
    readonly XL: 32;
    readonly XXL: 48;
    readonly XXXL: 64;
};
export declare const COLORS: {
    readonly PRIMARY: "#4F46E5";
    readonly PRIMARY_HOVER: "#4338CA";
    readonly PRIMARY_LIGHT: "#818CF8";
    readonly PRIMARY_DARK: "#3730A3";
    readonly SECONDARY: "#7C3AED";
    readonly SECONDARY_HOVER: "#6D28D9";
    readonly SECONDARY_LIGHT: "#A78BFA";
    readonly SECONDARY_DARK: "#5B21B6";
    readonly SUCCESS: "#10B981";
    readonly SUCCESS_HOVER: "#059669";
    readonly SUCCESS_LIGHT: "#34D399";
    readonly SUCCESS_DARK: "#047857";
    readonly ERROR: "#EF4444";
    readonly ERROR_HOVER: "#DC2626";
    readonly ERROR_LIGHT: "#F87171";
    readonly ERROR_DARK: "#B91C1C";
    readonly WARNING: "#F59E0B";
    readonly WARNING_HOVER: "#D97706";
    readonly WARNING_LIGHT: "#FCD34D";
    readonly WARNING_DARK: "#B45309";
    readonly INFO: "#3B82F6";
    readonly INFO_HOVER: "#2563EB";
    readonly INFO_LIGHT: "#60A5FA";
    readonly INFO_DARK: "#1D4ED8";
    readonly WHITE: "#FFFFFF";
    readonly BLACK: "#000000";
    readonly GRAY: {
        readonly 50: "#F9FAFB";
        readonly 100: "#F3F4F6";
        readonly 200: "#E5E7EB";
        readonly 300: "#D1D5DB";
        readonly 400: "#9CA3AF";
        readonly 500: "#6B7280";
        readonly 600: "#4B5563";
        readonly 700: "#374151";
        readonly 800: "#1F2937";
        readonly 900: "#111827";
    };
};
export declare const TYPOGRAPHY: {
    readonly FONT_FAMILY: {
        readonly SANS: "Inter, system-ui, -apple-system, sans-serif";
        readonly MONO: "JetBrains Mono, Consolas, monospace";
    };
    readonly FONT_SIZE: {
        readonly XS: "0.75rem";
        readonly SM: "0.875rem";
        readonly BASE: "1rem";
        readonly LG: "1.125rem";
        readonly XL: "1.25rem";
        readonly XXL: "1.5rem";
        readonly XXXL: "1.875rem";
        readonly XXXXL: "2.25rem";
    };
    readonly FONT_WEIGHT: {
        readonly THIN: 100;
        readonly LIGHT: 300;
        readonly NORMAL: 400;
        readonly MEDIUM: 500;
        readonly SEMIBOLD: 600;
        readonly BOLD: 700;
        readonly EXTRABOLD: 800;
        readonly BLACK: 900;
    };
    readonly LINE_HEIGHT: {
        readonly NONE: 1;
        readonly TIGHT: 1.25;
        readonly SNUG: 1.375;
        readonly NORMAL: 1.5;
        readonly RELAXED: 1.625;
        readonly LOOSE: 2;
    };
};
export declare const FORM_SETTINGS: {
    readonly DEBOUNCE_MS: 300;
    readonly AUTOCOMPLETE_MIN_CHARS: 2;
    readonly MAX_FILE_SIZE: number;
    readonly ALLOWED_FILE_TYPES: readonly [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx"];
    readonly DATE_FORMAT: "YYYY-MM-DD";
    readonly TIME_FORMAT: "HH:mm";
    readonly DATETIME_FORMAT: "YYYY-MM-DD HH:mm";
};
export declare const TOAST_SETTINGS: {
    readonly POSITION: "top-right";
    readonly DURATION: 5000;
    readonly MAX_TOASTS: 5;
    readonly CLOSE_ON_CLICK: true;
    readonly PAUSE_ON_HOVER: true;
    readonly SHOW_PROGRESS_BAR: true;
};
export declare const MODAL_SETTINGS: {
    readonly CLOSE_ON_BACKDROP: true;
    readonly CLOSE_ON_ESC: true;
    readonly SHOW_CLOSE_BUTTON: true;
    readonly ANIMATION_DURATION: 300;
    readonly BACKDROP_OPACITY: 0.5;
};
export declare const TABLE_SETTINGS: {
    readonly DEFAULT_PAGE_SIZE: 25;
    readonly PAGE_SIZE_OPTIONS: readonly [10, 25, 50, 100];
    readonly SHOW_ROW_NUMBERS: false;
    readonly STRIPED_ROWS: true;
    readonly HOVER_HIGHLIGHT: true;
    readonly STICKY_HEADER: true;
    readonly RESIZABLE_COLUMNS: true;
};
export declare const LOADING_STATES: {
    readonly SKELETON_ANIMATION: "pulse";
    readonly SPINNER_SIZE: {
        readonly SM: 16;
        readonly MD: 24;
        readonly LG: 32;
        readonly XL: 48;
    };
    readonly OVERLAY_OPACITY: 0.8;
};
export declare function createUiConfig(): UiConfig;
export declare const uiConfig: UiConfig;
