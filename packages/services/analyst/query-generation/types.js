"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceError = exports.sourceTypes = void 0;
exports.sourceTypes = ['websearch', 'social', 'bookmark', 'newsletter', 'manual'];
class AIServiceError extends Error {
    constructor(message, service, operation, context) {
        super(message);
        this.service = service;
        this.operation = operation;
        this.context = context;
        this.name = 'AIServiceError';
    }
}
exports.AIServiceError = AIServiceError;
//# sourceMappingURL=types.js.map