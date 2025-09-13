"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryScorer = void 0;
class CategoryScorer {
    constructor() {
        this.isInitialized = false;
    }
    async initialize() {
        this.isInitialized = true;
    }
    async calculateScore(profile, opportunity) {
        if (!this.isInitialized)
            throw new Error('CategoryScorer not initialized');
        const profileMediums = profile.mediums.map(m => m.toLowerCase());
        const opportunityText = (opportunity.title + ' ' + opportunity.description + ' ' + opportunity.tags.join(' ')).toLowerCase();
        let matches = 0;
        for (const medium of profileMediums) {
            if (opportunityText.includes(medium)) {
                matches++;
            }
        }
        return profileMediums.length > 0 ? Math.min(1, matches / profileMediums.length) : 0.5;
    }
    async healthCheck() {
        return this.isInitialized;
    }
    async shutdown() {
        this.isInitialized = false;
    }
}
exports.CategoryScorer = CategoryScorer;
//# sourceMappingURL=CategoryScorer.js.map