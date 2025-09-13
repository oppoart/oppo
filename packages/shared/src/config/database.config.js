"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = exports.PRISMA_OPTIONS = exports.DB_INDEXES = exports.DB_TABLES = exports.DB_RETRY = exports.DB_QUERY_LIMITS = exports.DB_LIMITS = void 0;
exports.createDatabaseConfig = createDatabaseConfig;
exports.DB_LIMITS = {
    MAX_CONNECTIONS: 10,
    MIN_CONNECTIONS: 2,
    CONNECTION_TIMEOUT: 20000,
    IDLE_TIMEOUT: 10000,
    ACQUIRE_TIMEOUT: 30000,
};
exports.DB_QUERY_LIMITS = {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    MAX_BATCH_SIZE: 1000,
    DEFAULT_OFFSET: 0,
};
exports.DB_RETRY = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 5000,
    BACKOFF_MULTIPLIER: 1.5,
};
exports.DB_TABLES = {
    USERS: 'User',
    ARTIST_PROFILES: 'ArtistProfile',
    OPPORTUNITIES: 'Opportunity',
    SESSIONS: 'Session',
    NOTIFICATIONS: 'Notification',
    AUDIT_LOGS: 'AuditLog',
};
exports.DB_INDEXES = {
    USER_EMAIL: 'user_email_idx',
    OPPORTUNITY_RELEVANCE: 'opportunity_relevance_idx',
    OPPORTUNITY_DEADLINE: 'opportunity_deadline_idx',
    PROFILE_USER: 'profile_user_idx',
    SESSION_TOKEN: 'session_token_idx',
};
function createDatabaseConfig(env = process.env.NODE_ENV || 'development') {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl && env !== 'test') {
        throw new Error('DATABASE_URL environment variable is required');
    }
    return {
        url: databaseUrl || 'postgresql://test@localhost:5432/test_db',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || String(exports.DB_LIMITS.MAX_CONNECTIONS)),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || String(exports.DB_LIMITS.CONNECTION_TIMEOUT)),
        ssl: env === 'production' ? true : false,
    };
}
exports.PRISMA_OPTIONS = {
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
};
exports.databaseConfig = createDatabaseConfig();
//# sourceMappingURL=database.config.js.map