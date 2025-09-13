"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeduplicationService = void 0;
const crypto_1 = require("crypto");
const stringSimilarity = __importStar(require("string-similarity"));
class DeduplicationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Generate a canonical hash for deduplication
     */
    generateSourceHash(opportunity) {
        // Normalize key fields for consistent hashing
        const normalizedTitle = this.normalizeText(opportunity.title);
        const normalizedOrg = this.normalizeText(opportunity.organization || '');
        const normalizedDate = opportunity.deadline ?
            this.normalizeDate(opportunity.deadline) : '';
        // Create canonical representation
        const canonical = `${normalizedTitle}|${normalizedOrg}|${normalizedDate}`;
        // Generate SHA-256 hash
        return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
    }
    /**
     * Check if an opportunity is a duplicate
     */
    async checkDuplicate(opportunity) {
        const startTime = Date.now();
        // First try exact hash matching for fast deduplication
        const hash = this.generateSourceHash(opportunity);
        const exactMatch = await this.findExactMatch(hash, opportunity);
        if (exactMatch.isDuplicate) {
            return exactMatch;
        }
        // If no exact match, try similarity matching
        const similarityMatch = await this.findSimilarityMatch(opportunity);
        if (similarityMatch.isDuplicate) {
            // Record the duplicate relationship
            if (similarityMatch.existingId) {
                await this.recordDuplicate(similarityMatch.existingId, opportunity, similarityMatch.similarityScore || 0);
            }
            return similarityMatch;
        }
        return {
            isDuplicate: false,
            hash: hash,
            action: 'new_opportunity'
        };
    }
    /**
     * Find exact matches using hash comparison
     */
    async findExactMatch(hash, opportunity) {
        // For now, we'll use URL as a proxy for source hash
        // In production, we'd add a sourceHash field to the schema
        const existing = await this.prisma.opportunity.findFirst({
            where: {
                OR: [
                    { url: opportunity.url },
                    {
                        AND: [
                            { title: { contains: this.normalizeText(opportunity.title) } },
                            { organization: opportunity.organization },
                            { deadline: opportunity.deadline }
                        ]
                    }
                ]
            }
        });
        if (existing) {
            // Add new source to existing opportunity if it's from different source
            await this.addSourceLink(existing.id, opportunity);
            return {
                isDuplicate: true,
                existingId: existing.id,
                action: 'source_added',
                similarityScore: 1.0
            };
        }
        return { isDuplicate: false };
    }
    /**
     * Find similar opportunities using text similarity
     */
    async findSimilarityMatch(opportunity) {
        // Get recent opportunities for comparison (last 30 days)
        const recentOpportunities = await this.prisma.opportunity.findMany({
            where: {
                discoveredAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            take: 100 // Limit for performance
        });
        let bestMatch = null;
        for (const existing of recentOpportunities) {
            const factors = this.calculateSimilarityFactors(opportunity, existing);
            const overallScore = this.calculateOverallSimilarity(factors);
            if (overallScore > 0.85 && (!bestMatch || overallScore > bestMatch.similarityScore)) {
                bestMatch = {
                    opportunity: existing,
                    similarityScore: overallScore,
                    factors
                };
            }
        }
        if (bestMatch && bestMatch.similarityScore > 0.85) {
            return {
                isDuplicate: true,
                existingId: bestMatch.opportunity.id,
                action: 'source_added',
                similarityScore: bestMatch.similarityScore
            };
        }
        return { isDuplicate: false };
    }
    /**
     * Calculate similarity factors between two opportunities
     */
    calculateSimilarityFactors(opp1, opp2) {
        return {
            titleSimilarity: stringSimilarity.compareTwoStrings(this.normalizeText(opp1.title), this.normalizeText(opp2.title)),
            organizationSimilarity: stringSimilarity.compareTwoStrings(this.normalizeText(opp1.organization || ''), this.normalizeText(opp2.organization || '')),
            deadlineSimilarity: this.calculateDateSimilarity(opp1.deadline, opp2.deadline),
            descriptionSimilarity: stringSimilarity.compareTwoStrings(this.normalizeText(opp1.description.substring(0, 500)), this.normalizeText(opp2.description.substring(0, 500))),
            urlSimilarity: stringSimilarity.compareTwoStrings(opp1.url, opp2.url)
        };
    }
    /**
     * Calculate overall similarity score from factors
     */
    calculateOverallSimilarity(factors) {
        // Weighted average - title and organization are most important
        return (factors.titleSimilarity * 0.4 +
            factors.organizationSimilarity * 0.3 +
            factors.descriptionSimilarity * 0.2 +
            factors.deadlineSimilarity * 0.05 +
            factors.urlSimilarity * 0.05);
    }
    /**
     * Calculate similarity between two dates
     */
    calculateDateSimilarity(date1, date2) {
        if (!date1 || !date2)
            return 0;
        const diffMs = Math.abs(date1.getTime() - date2.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        // Same day = 1.0, 1 day diff = 0.9, 7 days = 0.5, 30+ days = 0
        if (diffDays === 0)
            return 1.0;
        if (diffDays <= 1)
            return 0.9;
        if (diffDays <= 7)
            return 0.7;
        if (diffDays <= 30)
            return 0.3;
        return 0;
    }
    /**
     * Record a duplicate relationship
     */
    async recordDuplicate(masterId, duplicateOpp, similarityScore) {
        // First create the duplicate opportunity if it doesn't exist
        let duplicateId;
        const existing = await this.prisma.opportunity.findFirst({
            where: { url: duplicateOpp.url }
        });
        if (existing) {
            duplicateId = existing.id;
        }
        else {
            const created = await this.prisma.opportunity.create({
                data: {
                    title: duplicateOpp.title,
                    organization: duplicateOpp.organization || null,
                    description: duplicateOpp.description,
                    url: duplicateOpp.url,
                    deadline: duplicateOpp.deadline || null,
                    amount: duplicateOpp.amount || null,
                    location: duplicateOpp.location || null,
                    tags: duplicateOpp.tags,
                    sourceType: duplicateOpp.sourceType,
                    sourceUrl: duplicateOpp.sourceUrl || null,
                    sourceMetadata: duplicateOpp.sourceMetadata || {},
                    status: 'archived' // Mark as archived since it's a duplicate
                }
            });
            duplicateId = created.id;
        }
        // Create duplicate relationship
        await this.prisma.opportunityDuplicate.upsert({
            where: {
                masterOpportunityId_duplicateOpportunityId: {
                    masterOpportunityId: masterId,
                    duplicateOpportunityId: duplicateId
                }
            },
            create: {
                masterOpportunityId: masterId,
                duplicateOpportunityId: duplicateId,
                similarityScore,
                mergeStrategy: 'keep_master'
            },
            update: {
                similarityScore
            }
        });
    }
    /**
     * Add a source link to an existing opportunity
     */
    async addSourceLink(opportunityId, opportunity) {
        if (!opportunity.sourceUrl)
            return;
        // Find or create the source
        let source = await this.prisma.opportunitySource.findFirst({
            where: {
                type: opportunity.sourceType,
                url: opportunity.sourceUrl
            }
        });
        if (!source) {
            source = await this.prisma.opportunitySource.create({
                data: {
                    name: opportunity.sourceType,
                    type: opportunity.sourceType,
                    url: opportunity.sourceUrl || null,
                    config: opportunity.sourceMetadata || {}
                }
            });
        }
        // Create source link if it doesn't exist
        await this.prisma.opportunitySourceLink.upsert({
            where: {
                opportunityId_sourceId: {
                    opportunityId,
                    sourceId: source.id
                }
            },
            create: {
                opportunityId,
                sourceId: source.id
            },
            update: {}
        });
    }
    /**
     * Run comprehensive deduplication on existing opportunities
     */
    async runDeduplication(batchSize = 100) {
        const startTime = Date.now();
        let processedCount = 0;
        let duplicatesFound = 0;
        const duplicatePairs = [];
        while (true) {
            const opportunities = await this.prisma.opportunity.findMany({
                skip: processedCount,
                take: batchSize,
                orderBy: { discoveredAt: 'desc' }
            });
            if (opportunities.length === 0)
                break;
            for (const opp of opportunities) {
                // Check against other opportunities
                const candidates = await this.findDuplicateCandidates(opp);
                duplicatePairs.push(...candidates);
                duplicatesFound += candidates.length;
            }
            processedCount += opportunities.length;
        }
        // Remove actual duplicates
        const duplicatesRemoved = await this.mergeDuplicates(duplicatePairs);
        return {
            duplicatesFound,
            duplicatesRemoved,
            duplicatePairs,
            processingTimeMs: Date.now() - startTime
        };
    }
    /**
     * Find duplicate candidates for a given opportunity
     */
    async findDuplicateCandidates(opportunity) {
        const candidates = [];
        // Find similar opportunities
        const similar = await this.prisma.opportunity.findMany({
            where: {
                id: { not: opportunity.id },
                title: { contains: opportunity.title.split(' ')[0] } // Basic similarity
            }
        });
        for (const candidate of similar) {
            const oppData = {
                title: opportunity.title,
                description: opportunity.description,
                url: opportunity.url,
                organization: opportunity.organization,
                deadline: opportunity.deadline,
                sourceType: opportunity.sourceType,
                tags: opportunity.tags || [],
                status: 'new',
                processed: false,
                applied: false,
                starred: false
            };
            const factors = this.calculateSimilarityFactors(oppData, candidate);
            const similarityScore = this.calculateOverallSimilarity(factors);
            if (similarityScore > 0.85) {
                candidates.push({
                    opportunityId: opportunity.id,
                    duplicateId: candidate.id,
                    similarityScore,
                    similarityFactors: factors
                });
            }
        }
        return candidates;
    }
    /**
     * Merge duplicate opportunities
     */
    async mergeDuplicates(duplicatePairs) {
        let mergedCount = 0;
        for (const pair of duplicatePairs) {
            try {
                // Mark the duplicate as archived
                await this.prisma.opportunity.update({
                    where: { id: pair.duplicateId },
                    data: { status: 'archived' }
                });
                // Record the duplicate relationship
                await this.prisma.opportunityDuplicate.create({
                    data: {
                        masterOpportunityId: pair.opportunityId,
                        duplicateOpportunityId: pair.duplicateId,
                        similarityScore: pair.similarityScore,
                        mergeStrategy: 'archive_duplicate'
                    }
                });
                mergedCount++;
            }
            catch (error) {
                console.error(`Failed to merge duplicate ${pair.duplicateId}:`, error);
            }
        }
        return mergedCount;
    }
    /**
     * Normalize text for consistent comparison
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
    /**
     * Normalize date for consistent comparison
     */
    normalizeDate(date) {
        // Extract YYYY-MM-DD only
        return date.toISOString().split('T')[0];
    }
    /**
     * Get deduplication statistics
     */
    async getDeduplicationStats() {
        const [duplicateCount, totalOpportunities] = await Promise.all([
            this.prisma.opportunityDuplicate.count(),
            this.prisma.opportunity.count()
        ]);
        return {
            totalOpportunities,
            duplicatesIdentified: duplicateCount,
            deduplicationRate: totalOpportunities > 0 ? duplicateCount / totalOpportunities : 0
        };
    }
}
exports.DeduplicationService = DeduplicationService;
