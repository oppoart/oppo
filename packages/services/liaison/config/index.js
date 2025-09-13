"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigHelpers = exports.developmentLiaisonConfig = exports.productionLiaisonConfig = exports.defaultLiaisonConfig = void 0;
exports.getLiaisonConfig = getLiaisonConfig;
exports.validateLiaisonConfig = validateLiaisonConfig;
exports.defaultLiaisonConfig = {
    ui: {
        theme: 'light',
        kanbanColumns: ['new', 'reviewing', 'applying', 'submitted', 'rejected'],
        defaultView: 'kanban',
        itemsPerPage: 20
    },
    export: {
        formats: ['csv', 'json'],
        maxItems: 1000
    },
    realtime: {
        enabled: true,
        reconnectDelay: 5000,
        maxReconnectAttempts: 10
    }
};
exports.productionLiaisonConfig = {
    export: {
        formats: ['csv', 'json'],
        maxItems: 5000
    },
    realtime: {
        enabled: true,
        reconnectDelay: 10000,
        maxReconnectAttempts: 15
    }
};
exports.developmentLiaisonConfig = {
    ui: {
        theme: 'light',
        kanbanColumns: ['new', 'reviewing', 'applying', 'submitted', 'rejected'],
        defaultView: 'kanban',
        itemsPerPage: 10
    },
    export: {
        formats: ['csv', 'json'],
        maxItems: 100
    },
    realtime: {
        enabled: true,
        reconnectDelay: 3000,
        maxReconnectAttempts: 5
    }
};
function getLiaisonConfig(env = 'development') {
    const baseConfig = { ...exports.defaultLiaisonConfig };
    switch (env) {
        case 'production':
            return mergeConfigs(baseConfig, exports.productionLiaisonConfig);
        case 'development':
            return mergeConfigs(baseConfig, exports.developmentLiaisonConfig);
        case 'test':
            return {
                ...baseConfig,
                realtime: {
                    ...baseConfig.realtime,
                    enabled: false
                }
            };
        default:
            return baseConfig;
    }
}
function mergeConfigs(base, override) {
    return {
        ui: { ...base.ui, ...override.ui },
        export: { ...base.export, ...override.export },
        realtime: { ...base.realtime, ...override.realtime }
    };
}
function validateLiaisonConfig(config) {
    const errors = [];
    if (config.ui) {
        if (config.ui.itemsPerPage && (config.ui.itemsPerPage < 1 || config.ui.itemsPerPage > 100)) {
            errors.push('UI itemsPerPage must be between 1 and 100');
        }
        if (config.ui.kanbanColumns && config.ui.kanbanColumns.length === 0) {
            errors.push('UI kanbanColumns cannot be empty');
        }
    }
    if (config.export) {
        if (config.export.maxItems && config.export.maxItems < 1) {
            errors.push('Export maxItems must be positive');
        }
        if (config.export.formats && config.export.formats.length === 0) {
            errors.push('Export formats cannot be empty');
        }
    }
    if (config.realtime) {
        if (config.realtime.reconnectDelay && config.realtime.reconnectDelay < 0) {
            errors.push('Realtime reconnectDelay must be non-negative');
        }
        if (config.realtime.maxReconnectAttempts && config.realtime.maxReconnectAttempts < 0) {
            errors.push('Realtime maxReconnectAttempts must be non-negative');
        }
    }
    return errors;
}
exports.ConfigHelpers = {
    fromEnv() {
        return {
            realtime: {
                enabled: process.env.WEBSOCKET_ENABLED !== 'false',
                reconnectDelay: process.env.WEBSOCKET_RECONNECT_DELAY ?
                    parseInt(process.env.WEBSOCKET_RECONNECT_DELAY) : undefined,
                maxReconnectAttempts: process.env.WEBSOCKET_MAX_RECONNECT_ATTEMPTS ?
                    parseInt(process.env.WEBSOCKET_MAX_RECONNECT_ATTEMPTS) : undefined
            },
            export: {
                formats: ['csv', 'json'],
                maxItems: process.env.EXPORT_MAX_ITEMS ?
                    parseInt(process.env.EXPORT_MAX_ITEMS) : undefined
            }
        };
    },
    getWebSocketUrl() {
        return process.env.WEBSOCKET_URL || process.env.WS_URL;
    }
};
//# sourceMappingURL=index.js.map