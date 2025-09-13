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
        // Sort by priority and expected results
        const sortedQueries = queries.sort((a, b) => {
            // Higher priority first
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // Higher expected results first
            return b.expectedResults - a.expectedResults;
        });
        // Remove duplicates
        const uniqueQueries = this.removeDuplicates(sortedQueries);
        // Limit if requested
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
