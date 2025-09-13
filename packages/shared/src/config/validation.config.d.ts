import { ValidationConfig } from './types';
export declare const VALIDATION_PATTERNS: {
    readonly EMAIL: RegExp;
    readonly USERNAME: RegExp;
    readonly PHONE: RegExp;
    readonly URL: RegExp;
    readonly SLUG: RegExp;
    readonly UUID: RegExp;
};
export declare const FIELD_LIMITS: {
    readonly USERNAME: {
        readonly MIN: 3;
        readonly MAX: 30;
    };
    readonly EMAIL: {
        readonly MIN: 5;
        readonly MAX: 255;
    };
    readonly PASSWORD: {
        readonly MIN: 8;
        readonly MAX: 128;
    };
    readonly NAME: {
        readonly MIN: 1;
        readonly MAX: 100;
    };
    readonly BIO: {
        readonly MIN: 0;
        readonly MAX: 1000;
    };
    readonly HEADLINE: {
        readonly MIN: 0;
        readonly MAX: 200;
    };
    readonly LOCATION: {
        readonly MIN: 0;
        readonly MAX: 100;
    };
    readonly WEBSITE: {
        readonly MIN: 0;
        readonly MAX: 255;
    };
    readonly TITLE: {
        readonly MIN: 1;
        readonly MAX: 200;
    };
    readonly DESCRIPTION: {
        readonly MIN: 0;
        readonly MAX: 5000;
    };
    readonly SHORT_DESCRIPTION: {
        readonly MIN: 0;
        readonly MAX: 500;
    };
    readonly TAGS: {
        readonly MIN: 0;
        readonly MAX: 10;
    };
    readonly TAG_LENGTH: {
        readonly MIN: 2;
        readonly MAX: 30;
    };
    readonly SEARCH_QUERY: {
        readonly MIN: 1;
        readonly MAX: 200;
    };
    readonly SEARCH_RESULTS: {
        readonly MIN: 1;
        readonly MAX: 100;
    };
};
export declare const VALIDATION_MESSAGES: {
    readonly REQUIRED: "This field is required";
    readonly REQUIRED_FIELD: (field: string) => string;
    readonly MIN_LENGTH: (field: string, min: number) => string;
    readonly MAX_LENGTH: (field: string, max: number) => string;
    readonly EXACT_LENGTH: (field: string, length: number) => string;
    readonly INVALID_EMAIL: "Please enter a valid email address";
    readonly INVALID_URL: "Please enter a valid URL";
    readonly INVALID_PHONE: "Please enter a valid phone number";
    readonly INVALID_USERNAME: "Username can only contain letters, numbers, underscores, and hyphens";
    readonly INVALID_FORMAT: (field: string) => string;
    readonly PASSWORD_TOO_WEAK: "Password is too weak";
    readonly PASSWORD_NO_UPPERCASE: "Password must contain at least one uppercase letter";
    readonly PASSWORD_NO_LOWERCASE: "Password must contain at least one lowercase letter";
    readonly PASSWORD_NO_NUMBER: "Password must contain at least one number";
    readonly PASSWORD_NO_SPECIAL: "Password must contain at least one special character";
    readonly PASSWORDS_NOT_MATCH: "Passwords do not match";
    readonly MIN_VALUE: (field: string, min: number) => string;
    readonly MAX_VALUE: (field: string, max: number) => string;
    readonly MUST_BE_NUMBER: "Must be a valid number";
    readonly MUST_BE_INTEGER: "Must be a whole number";
    readonly MUST_BE_POSITIVE: "Must be a positive number";
    readonly INVALID_DATE: "Please enter a valid date";
    readonly DATE_IN_PAST: "Date cannot be in the past";
    readonly DATE_IN_FUTURE: "Date cannot be in the future";
    readonly DATE_BEFORE: (date: string) => string;
    readonly DATE_AFTER: (date: string) => string;
    readonly MIN_ITEMS: (field: string, min: number) => string;
    readonly MAX_ITEMS: (field: string, max: number) => string;
    readonly DUPLICATE_ITEMS: "Duplicate items are not allowed";
    readonly FILE_TOO_LARGE: (maxSize: string) => string;
    readonly INVALID_FILE_TYPE: (types: string) => string;
    readonly NO_FILE_SELECTED: "Please select a file";
    readonly ALREADY_EXISTS: (field: string) => string;
    readonly NOT_FOUND: (field: string) => string;
    readonly INVALID_SELECTION: "Please make a valid selection";
    readonly OPERATION_FAILED: "Operation failed. Please try again";
};
export declare const FILE_LIMITS: {
    readonly MAX_FILE_SIZE: number;
    readonly MAX_IMAGE_SIZE: number;
    readonly MAX_DOCUMENT_SIZE: number;
    readonly ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/png", "image/gif", "image/webp"];
    readonly ALLOWED_DOCUMENT_TYPES: readonly ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
};
export declare const FORM_RULES: {
    readonly DEBOUNCE_DELAY: 300;
    readonly AUTOCOMPLETE_DELAY: 500;
    readonly PREVENT_DOUBLE_SUBMIT: true;
    readonly SHOW_VALIDATION_ON_BLUR: true;
    readonly SHOW_VALIDATION_ON_SUBMIT: true;
    readonly TRIM_WHITESPACE: true;
    readonly NORMALIZE_EMAIL: true;
    readonly AUTO_FORMAT_PHONE: true;
};
export declare function createValidationConfig(): ValidationConfig;
export { PASSWORD_REQUIREMENTS } from '../config/auth.config';
export declare const validationConfig: ValidationConfig;
//# sourceMappingURL=validation.config.d.ts.map