"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryOptimizer = void 0;
class QueryOptimizer {
    constructor() {
        this.isInitialized = false;
    }
    async initialize() {
        this.isInitialized = true;
    }
    async optimizeQueries(queries, profileAnalysis, maxQueries) {
        if (!this.isInitialized) {
            throw new Error('QueryOptimizer is not initialized');
        }
        const sortedQueries = queries.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return b.expectedResults - a.expectedResults;
        });
        const uniqueQueries = this.removeDuplicates(sortedQueries);
        if (maxQueries && uniqueQueries.length > maxQueries) {
            return uniqueQueries.slice(0, maxQueries);
        }
        return uniqueQueries;
    }
    removeDuplicates(queries) {
        const seen = new Set();
        return queries.filter(query => {
            const normalized = query.query.toLowerCase().trim();
            if (seen.has(normalized)) {
                return false;
            }
            seen.add(normalized);
            return true;
        });
    }
}
exports.QueryOptimizer = QueryOptimizer;
//# sourceMappingURL=QueryOptimizer.js.map