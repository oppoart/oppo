"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationScorer = void 0;
class LocationScorer {
    constructor() {
        this.isInitialized = false;
    }
    async initialize() {
        this.isInitialized = true;
    }
    async calculateScore(profile, opportunity) {
        if (!this.isInitialized)
            throw new Error('LocationScorer not initialized');
        // If no location info, return neutral score
        if (!profile.location && !opportunity.location)
            return 0.5;
        if (!profile.location || !opportunity.location)
            return 0.7; // One missing, assume possible
        // Simple location matching
        const profileLocation = profile.location.toLowerCase();
        const opportunityLocation = opportunity.location.toLowerCase();
        if (profileLocation === opportunityLocation)
            return 1.0;
        if (opportunityLocation.includes(profileLocation) || profileLocation.includes(opportunityLocation))
            return 0.8;
        if (opportunityLocation.includes('remote') || opportunityLocation.includes('online'))
            return 0.9;
        return 0.3; // Different locations
    }
    async healthCheck() {
        return this.isInitialized;
    }
    async shutdown() {
        this.isInitialized = false;
    }
}
exports.LocationScorer = LocationScorer;
