"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceScorer = void 0;
class ExperienceScorer {
    constructor() {
        this.isInitialized = false;
    }
    async initialize() {
        this.isInitialized = true;
    }
    async calculateScore(profile, opportunity) {
        if (!this.isInitialized)
            throw new Error('ExperienceScorer not initialized');
        const opportunityText = (opportunity.title + ' ' + opportunity.description).toLowerCase();
        const profileExperience = (profile.experience || '').toLowerCase();
        const beginnerTerms = ['beginner', 'new', 'emerging', 'student', 'first time'];
        const intermediateTerms = ['intermediate', 'developing', 'some experience'];
        const advancedTerms = ['advanced', 'professional', 'established', 'experienced', 'expert'];
        let profileLevel = 'intermediate';
        if (beginnerTerms.some(term => profileExperience.includes(term)))
            profileLevel = 'beginner';
        if (advancedTerms.some(term => profileExperience.includes(term)))
            profileLevel = 'advanced';
        let opportunityLevel = 'any';
        if (beginnerTerms.some(term => opportunityText.includes(term)))
            opportunityLevel = 'beginner';
        if (advancedTerms.some(term => opportunityText.includes(term)))
            opportunityLevel = 'advanced';
        if (opportunityLevel === 'any')
            return 0.8;
        if (profileLevel === opportunityLevel)
            return 1.0;
        if (profileLevel === 'intermediate')
            return 0.7;
        return 0.4;
    }
    async healthCheck() {
        return this.isInitialized;
    }
    async shutdown() {
        this.isInitialized = false;
    }
}
exports.ExperienceScorer = ExperienceScorer;
//# sourceMappingURL=ExperienceScorer.js.map