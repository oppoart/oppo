import { AuthConfig } from './types';
export declare const PASSWORD_REQUIREMENTS: {
    readonly MIN_LENGTH: 8;
    readonly MAX_LENGTH: 128;
    readonly REQUIRE_UPPERCASE: true;
    readonly REQUIRE_LOWERCASE: true;
    readonly REQUIRE_NUMBERS: true;
    readonly REQUIRE_SPECIAL_CHARS: true;
    readonly SPECIAL_CHARS: "!@#$%^&*()_+-=[]{}|;:,.<>?";
};
export declare const JWT_SETTINGS: {
    readonly ACCESS_TOKEN_EXPIRES_IN: "24h";
    readonly REFRESH_TOKEN_EXPIRES_IN: "7d";
    readonly RESET_TOKEN_EXPIRES_IN: "1h";
    readonly VERIFICATION_TOKEN_EXPIRES_IN: "24h";
    readonly ALGORITHM: "HS256";
};
export declare const SESSION_SETTINGS: {
    readonly DEFAULT_TIMEOUT_HOURS: 24;
    readonly MAX_TIMEOUT_HOURS: 168;
    readonly SLIDING_WINDOW: true;
    readonly COOKIE_NAME: "oppo_session";
    readonly COOKIE_SECURE: boolean;
    readonly COOKIE_HTTP_ONLY: true;
    readonly COOKIE_SAME_SITE: "lax";
};
export declare const BCRYPT_SETTINGS: {
    readonly DEFAULT_ROUNDS: 12;
    readonly MIN_ROUNDS: 10;
    readonly MAX_ROUNDS: 15;
};
export declare const AUTH_RATE_LIMITS: {
    readonly LOGIN: {
        readonly WINDOW_MS: number;
        readonly MAX_ATTEMPTS: 5;
        readonly BLOCK_DURATION_MS: number;
    };
    readonly REGISTER: {
        readonly WINDOW_MS: number;
        readonly MAX_ATTEMPTS: 3;
        readonly BLOCK_DURATION_MS: number;
    };
    readonly PASSWORD_RESET: {
        readonly WINDOW_MS: number;
        readonly MAX_ATTEMPTS: 3;
        readonly BLOCK_DURATION_MS: number;
    };
};
export declare const OAUTH_PROVIDERS: {
    readonly GOOGLE: {
        readonly ENABLED: boolean;
        readonly CLIENT_ID: string | undefined;
        readonly CLIENT_SECRET: string | undefined;
        readonly CALLBACK_URL: "/api/auth/google/callback";
    };
    readonly GITHUB: {
        readonly ENABLED: boolean;
        readonly CLIENT_ID: string | undefined;
        readonly CLIENT_SECRET: string | undefined;
        readonly CALLBACK_URL: "/api/auth/github/callback";
    };
};
export declare const AUTH_ERRORS: {
    readonly INVALID_CREDENTIALS: "Invalid email or password";
    readonly ACCOUNT_NOT_FOUND: "Account not found";
    readonly ACCOUNT_DISABLED: "Account has been disabled";
    readonly EMAIL_NOT_VERIFIED: "Please verify your email address";
    readonly TOKEN_EXPIRED: "Token has expired";
    readonly TOKEN_INVALID: "Invalid token";
    readonly SESSION_EXPIRED: "Session has expired";
    readonly INSUFFICIENT_PERMISSIONS: "Insufficient permissions";
    readonly PASSWORD_TOO_WEAK: "Password does not meet requirements";
    readonly EMAIL_ALREADY_EXISTS: "Email address already registered";
    readonly RATE_LIMITED: "Too many attempts. Please try again later";
};
export declare function createAuthConfig(env?: string): AuthConfig;
export declare const authConfig: AuthConfig;
//# sourceMappingURL=auth.config.d.ts.map