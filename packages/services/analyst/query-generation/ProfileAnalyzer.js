"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileAnalyzer = void 0;
class ProfileAnalyzer {
    mediumAliases;
    skillCategories;
    locationParser;
    constructor() {
        this.mediumAliases = new Map([
            ['painting', ['oil painting', 'acrylic', 'watercolor', 'mixed media painting', 'abstract painting']],
            ['digital art', ['digital painting', 'concept art', 'illustration', 'graphic design']],
            ['sculpture', ['clay', 'metal sculpture', 'stone carving', 'installation art']],
            ['photography', ['fine art photography', 'documentary', 'portrait photography', 'commercial photography']],
            ['textile art', ['fiber art', 'weaving', 'embroidery', 'fashion design', 'quilting']],
            ['new media art', ['video art', 'interactive art', 'sound art', 'performance art']],
            ['printmaking', ['etching', 'lithography', 'screen printing', 'woodcut', 'linocut']],
            ['ceramics', ['pottery', 'ceramic sculpture', 'functional ceramics', 'raku']],
            ['drawing', ['charcoal', 'pastel', 'ink', 'graphite', 'colored pencil']],
            ['jewelry', ['metalsmithing', 'beadwork', 'enamel', 'stone setting']]
        ]);
        this.skillCategories = new Map([
            ['technical', ['color theory', 'composition', 'perspective', 'anatomy', 'lighting']],
            ['business', ['marketing', 'networking', 'grant writing', 'exhibition planning', 'teaching']],
            ['digital', ['photoshop', 'illustrator', 'procreate', 'blender', '3d modeling', 'video editing']],
            ['traditional', ['oil painting', 'watercolor', 'drawing', 'printmaking', 'sculpture']]
        ]);
        this.locationParser = new LocationParser();
    }
    async analyzeProfile(profile) {
        const analysis = {
            primaryMediums: [],
            secondaryMediums: [],
            coreSkills: [],
            supportingSkills: [],
            primaryInterests: [],
            geographicScope: {
                isRemoteEligible: true
            },
            experienceLevel: {
                category: 'intermediate',
                keywords: []
            },
            searchableKeywords: [],
            excludeKeywords: [],
            opportunityTypes: [],
            fundingPreferences: []
        };
        const mediumAnalysis = this.analyzeMediums(profile.mediums);
        analysis.primaryMediums = mediumAnalysis.primary;
        analysis.secondaryMediums = mediumAnalysis.secondary;
        const skillAnalysis = this.analyzeSkills(profile.skills);
        analysis.coreSkills = skillAnalysis.core;
        analysis.supportingSkills = skillAnalysis.supporting;
        analysis.primaryInterests = this.analyzeInterests(profile.interests);
        analysis.geographicScope = this.locationParser.parseLocation(profile.location);
        analysis.experienceLevel = this.analyzeExperienceLevel(profile.experience, profile.bio, profile.artistStatement);
        analysis.searchableKeywords = this.generateSearchableKeywords(analysis);
        analysis.opportunityTypes = this.determineOpportunityTypes(analysis);
        analysis.fundingPreferences = this.determineFundingPreferences(analysis);
        return analysis;
    }
    analyzeMediums(mediums) {
        const normalizedMediums = mediums.map(m => m.toLowerCase().trim());
        const primary = normalizedMediums.slice(0, 3);
        const secondary = [];
        for (const medium of primary) {
            const aliases = this.mediumAliases.get(medium) || [];
            secondary.push(...aliases.filter(alias => !primary.includes(alias.toLowerCase())));
        }
        return {
            primary: primary,
            secondary: secondary.slice(0, 5)
        };
    }
    analyzeSkills(skills) {
        const normalizedSkills = skills.map(s => s.toLowerCase().trim());
        const categorizedSkills = {
            technical: [],
            business: [],
            digital: [],
            traditional: []
        };
        for (const skill of normalizedSkills) {
            for (const [category, categorySkills] of this.skillCategories.entries()) {
                if (categorySkills.some(cs => skill.includes(cs) || cs.includes(skill))) {
                    categorizedSkills[category].push(skill);
                    break;
                }
            }
        }
        const core = [
            ...categorizedSkills.technical,
            ...categorizedSkills.traditional
        ].slice(0, 6);
        const supporting = [
            ...categorizedSkills.business,
            ...categorizedSkills.digital
        ].slice(0, 4);
        return { core, supporting };
    }
    analyzeInterests(interests) {
        const normalizedInterests = interests.map(i => i.toLowerCase().trim());
        const interestGroups = {
            'contemporary art': ['contemporary', 'modern', 'current', 'new'],
            'traditional art': ['traditional', 'classical', 'historic', 'heritage'],
            'abstract art': ['abstract', 'non-representational', 'conceptual'],
            'figurative art': ['figurative', 'representational', 'realistic', 'portrait'],
            'environmental art': ['environmental', 'nature', 'landscape', 'eco'],
            'social art': ['social', 'community', 'political', 'activism', 'justice'],
            'experimental art': ['experimental', 'innovative', 'cutting-edge', 'avant-garde']
        };
        const groupedInterests = new Set();
        for (const interest of normalizedInterests) {
            for (const [group, keywords] of Object.entries(interestGroups)) {
                if (keywords.some(keyword => interest.includes(keyword))) {
                    groupedInterests.add(group);
                    break;
                }
            }
        }
        return Array.from(groupedInterests).slice(0, 5);
    }
    analyzeExperienceLevel(experience, bio, artistStatement) {
        const allText = [experience, bio, artistStatement].filter(Boolean).join(' ').toLowerCase();
        const experienceIndicators = {
            professional: ['professional', 'career', 'established', 'exhibited', 'represented', 'gallery', 'museum', 'sold work', 'commission', 'full-time'],
            advanced: ['advanced', 'expert', 'experienced', 'skilled', 'mastered', 'teaching', 'mentor', 'years of', 'decade'],
            intermediate: ['intermediate', 'developing', 'improving', 'learning', 'growing', 'some experience', 'few years'],
            beginner: ['beginner', 'new to', 'starting', 'just beginning', 'first time', 'learning basics', 'recently started']
        };
        let maxScore = 0;
        let detectedLevel = 'intermediate';
        const foundKeywords = [];
        for (const [level, keywords] of Object.entries(experienceIndicators)) {
            const score = keywords.reduce((acc, keyword) => {
                if (allText.includes(keyword)) {
                    foundKeywords.push(keyword);
                    return acc + 1;
                }
                return acc;
            }, 0);
            if (score > maxScore) {
                maxScore = score;
                detectedLevel = level;
            }
        }
        let yearsEstimate;
        const yearMatches = allText.match(/(\d+)\s*(year|yr)/g);
        if (yearMatches) {
            const years = yearMatches.map(match => parseInt(match.match(/\d+/)?.[0] || '0'));
            yearsEstimate = Math.max(...years);
        }
        return {
            category: detectedLevel,
            yearsEstimate,
            keywords: foundKeywords
        };
    }
    generateSearchableKeywords(analysis) {
        const keywords = new Set();
        analysis.primaryMediums.forEach(medium => keywords.add(medium));
        analysis.secondaryMediums.forEach(medium => keywords.add(medium));
        analysis.coreSkills.forEach(skill => keywords.add(skill));
        analysis.supportingSkills.forEach(skill => keywords.add(skill));
        analysis.primaryInterests.forEach(interest => keywords.add(interest));
        keywords.add(analysis.experienceLevel.category);
        analysis.experienceLevel.keywords.forEach(keyword => keywords.add(keyword));
        if (analysis.geographicScope.city)
            keywords.add(analysis.geographicScope.city);
        if (analysis.geographicScope.state)
            keywords.add(analysis.geographicScope.state);
        if (analysis.geographicScope.country)
            keywords.add(analysis.geographicScope.country);
        return Array.from(keywords).slice(0, 20);
    }
    determineOpportunityTypes(analysis) {
        const types = [];
        switch (analysis.experienceLevel.category) {
            case 'beginner':
                types.push('workshop', 'class', 'mentorship', 'emerging artist');
                break;
            case 'intermediate':
                types.push('grant', 'residency', 'exhibition', 'competition');
                break;
            case 'advanced':
            case 'professional':
                types.push('commission', 'fellowship', 'solo exhibition', 'teaching opportunity');
                break;
        }
        if (analysis.primaryMediums.some(m => ['digital art', 'new media art'].includes(m))) {
            types.push('digital art', 'new media');
        }
        if (analysis.primaryMediums.some(m => ['painting', 'drawing', 'printmaking'].includes(m))) {
            types.push('traditional media', 'fine art');
        }
        return types.slice(0, 6);
    }
    determineFundingPreferences(analysis) {
        const preferences = [];
        switch (analysis.experienceLevel.category) {
            case 'beginner':
                preferences.push('small grants', 'local funding', 'community support');
                break;
            case 'intermediate':
                preferences.push('mid-level grants', 'state funding', 'foundation grants');
                break;
            case 'advanced':
            case 'professional':
                preferences.push('major grants', 'federal funding', 'international funding');
                break;
        }
        if (analysis.primaryInterests.includes('social art')) {
            preferences.push('social impact funding');
        }
        if (analysis.primaryInterests.includes('environmental art')) {
            preferences.push('environmental funding');
        }
        return preferences.slice(0, 4);
    }
}
exports.ProfileAnalyzer = ProfileAnalyzer;
class LocationParser {
    parseLocation(location) {
        const result = {
            isRemoteEligible: true
        };
        if (!location) {
            return result;
        }
        const normalizedLocation = location.toLowerCase().trim();
        const parts = normalizedLocation.split(',').map(p => p.trim());
        if (parts.length >= 1) {
            result.city = parts[0];
        }
        if (parts.length >= 2) {
            result.state = parts[1];
        }
        if (parts.length >= 3) {
            result.country = parts[2];
        }
        else {
            if (parts.length === 2 && parts[1].length <= 3) {
                result.country = 'United States';
            }
        }
        if (result.country === 'United States' && result.state) {
            result.region = this.getUSRegion(result.state);
        }
        return result;
    }
    getUSRegion(state) {
        const regions = {
            'Northeast': ['ny', 'nj', 'pa', 'ct', 'ma', 'ri', 'vt', 'nh', 'me'],
            'Southeast': ['fl', 'ga', 'sc', 'nc', 'va', 'wv', 'ky', 'tn', 'al', 'ms', 'ar', 'la'],
            'Midwest': ['oh', 'in', 'il', 'mi', 'wi', 'mn', 'ia', 'mo', 'nd', 'sd', 'ne', 'ks'],
            'Southwest': ['tx', 'ok', 'nm', 'az'],
            'West': ['ca', 'nv', 'or', 'wa', 'id', 'mt', 'wy', 'co', 'ut', 'ak', 'hi']
        };
        const stateCode = state.toLowerCase();
        for (const [region, states] of Object.entries(regions)) {
            if (states.includes(stateCode)) {
                return region;
            }
        }
        return 'Unknown';
    }
}
//# sourceMappingURL=ProfileAnalyzer.js.map