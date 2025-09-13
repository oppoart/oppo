import { DatabaseConfig } from './types';
export declare const DB_LIMITS: {
    readonly MAX_CONNECTIONS: 10;
    readonly MIN_CONNECTIONS: 2;
    readonly CONNECTION_TIMEOUT: 20000;
    readonly IDLE_TIMEOUT: 10000;
    readonly ACQUIRE_TIMEOUT: 30000;
};
export declare const DB_QUERY_LIMITS: {
    readonly DEFAULT_PAGE_SIZE: 50;
    readonly MAX_PAGE_SIZE: 100;
    readonly MAX_BATCH_SIZE: 1000;
    readonly DEFAULT_OFFSET: 0;
};
export declare const DB_RETRY: {
    readonly MAX_ATTEMPTS: 3;
    readonly INITIAL_DELAY: 1000;
    readonly MAX_DELAY: 5000;
    readonly BACKOFF_MULTIPLIER: 1.5;
};
export declare const DB_TABLES: {
    readonly USERS: "User";
    readonly ARTIST_PROFILES: "ArtistProfile";
    readonly OPPORTUNITIES: "Opportunity";
    readonly SESSIONS: "Session";
    readonly NOTIFICATIONS: "Notification";
    readonly AUDIT_LOGS: "AuditLog";
};
export declare const DB_INDEXES: {
    readonly USER_EMAIL: "user_email_idx";
    readonly OPPORTUNITY_RELEVANCE: "opportunity_relevance_idx";
    readonly OPPORTUNITY_DEADLINE: "opportunity_deadline_idx";
    readonly PROFILE_USER: "profile_user_idx";
    readonly SESSION_TOKEN: "session_token_idx";
};
export declare function createDatabaseConfig(env?: string): DatabaseConfig;
export declare const PRISMA_OPTIONS: {
    readonly log: string[];
    readonly errorFormat: "pretty" | "minimal";
};
export declare const databaseConfig: DatabaseConfig;
