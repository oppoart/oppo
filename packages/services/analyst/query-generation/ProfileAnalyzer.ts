import { ArtistProfile } from '@prisma/client';

export interface ProfileAnalysis {
  primaryMediums: string[];
  secondaryMediums: string[];
  coreSkills: string[];
  supportingSkills: string[];
  primaryInterests: string[];
  geographicScope: {
    city?: string;
    state?: string;
    country?: string;
    region?: string;
    isRemoteEligible: boolean;
  };
  experienceLevel: {
    category: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    yearsEstimate?: number;
    keywords: string[];
  };
  searchableKeywords: string[];
  excludeKeywords: string[];
  opportunityTypes: string[];
  fundingPreferences: string[];
}

export class ProfileAnalyzer {
  private mediumAliases: Map<string, string[]>;
  private skillCategories: Map<string, string[]>;
  private locationParser: LocationParser;

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

  /**
   * Analyze an artist profile to extract searchable elements
   */
  async analyzeProfile(profile: ArtistProfile): Promise<ProfileAnalysis> {
    const analysis: ProfileAnalysis = {
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

    // Analyze mediums
    const mediumAnalysis = this.analyzeMediums(profile.mediums);
    analysis.primaryMediums = mediumAnalysis.primary;
    analysis.secondaryMediums = mediumAnalysis.secondary;

    // Analyze skills
    const skillAnalysis = this.analyzeSkills(profile.skills);
    analysis.coreSkills = skillAnalysis.core;
    analysis.supportingSkills = skillAnalysis.supporting;

    // Analyze interests
    analysis.primaryInterests = this.analyzeInterests(profile.interests);

    // Analyze geographic scope
    analysis.geographicScope = this.locationParser.parseLocation(profile.location);

    // Analyze experience level
    analysis.experienceLevel = this.analyzeExperienceLevel(
      profile.experience,
      profile.bio,
      profile.artistStatement
    );

    // Generate searchable keywords
    analysis.searchableKeywords = this.generateSearchableKeywords(analysis);

    // Determine opportunity types
    analysis.opportunityTypes = this.determineOpportunityTypes(analysis);

    // Determine funding preferences
    analysis.fundingPreferences = this.determineFundingPreferences(analysis);

    return analysis;
  }

  /**
   * Analyze and categorize artist mediums
   */
  private analyzeMediums(mediums: string[]): { primary: string[]; secondary: string[] } {
    const normalizedMediums = mediums.map(m => m.toLowerCase().trim());
    
    // Primary mediums are the ones explicitly listed
    const primary = normalizedMediums.slice(0, 3); // Take top 3 as primary
    
    // Secondary mediums include related/alternative terms
    const secondary: string[] = [];
    for (const medium of primary) {
      const aliases = this.mediumAliases.get(medium) || [];
      secondary.push(...aliases.filter(alias => !primary.includes(alias.toLowerCase())));
    }

    return { 
      primary: primary,
      secondary: secondary.slice(0, 5) // Limit secondary mediums
    };
  }

  /**
   * Analyze and categorize skills
   */
  private analyzeSkills(skills: string[]): { core: string[]; supporting: string[] } {
    const normalizedSkills = skills.map(s => s.toLowerCase().trim());
    
    // Categorize skills
    const categorizedSkills = {
      technical: [] as string[],
      business: [] as string[],
      digital: [] as string[],
      traditional: [] as string[]
    };

    for (const skill of normalizedSkills) {
      for (const [category, categorySkills] of this.skillCategories.entries()) {
        if (categorySkills.some(cs => skill.includes(cs) || cs.includes(skill))) {
          categorizedSkills[category as keyof typeof categorizedSkills].push(skill);
          break;
        }
      }
    }

    // Core skills are technical and traditional skills
    const core = [
      ...categorizedSkills.technical,
      ...categorizedSkills.traditional
    ].slice(0, 6);

    // Supporting skills are business and digital skills
    const supporting = [
      ...categorizedSkills.business,
      ...categorizedSkills.digital
    ].slice(0, 4);

    return { core, supporting };
  }

  /**
   * Analyze interests to identify primary areas of focus
   */
  private analyzeInterests(interests: string[]): string[] {
    // Normalize and prioritize interests
    const normalizedInterests = interests.map(i => i.toLowerCase().trim());
    
    // Group similar interests
    const interestGroups = {
      'contemporary art': ['contemporary', 'modern', 'current', 'new'],
      'traditional art': ['traditional', 'classical', 'historic', 'heritage'],
      'abstract art': ['abstract', 'non-representational', 'conceptual'],
      'figurative art': ['figurative', 'representational', 'realistic', 'portrait'],
      'environmental art': ['environmental', 'nature', 'landscape', 'eco'],
      'social art': ['social', 'community', 'political', 'activism', 'justice'],
      'experimental art': ['experimental', 'innovative', 'cutting-edge', 'avant-garde']
    };

    const groupedInterests = new Set<string>();
    
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

  /**
   * Analyze experience level from various profile fields
   */
  private analyzeExperienceLevel(
    experience?: string | null,
    bio?: string | null,
    artistStatement?: string | null
  ): ProfileAnalysis['experienceLevel'] {
    const allText = [experience, bio, artistStatement].filter(Boolean).join(' ').toLowerCase();
    
    // Keywords that indicate experience level
    const experienceIndicators = {
      professional: ['professional', 'career', 'established', 'exhibited', 'represented', 'gallery', 'museum', 'sold work', 'commission', 'full-time'],
      advanced: ['advanced', 'expert', 'experienced', 'skilled', 'mastered', 'teaching', 'mentor', 'years of', 'decade'],
      intermediate: ['intermediate', 'developing', 'improving', 'learning', 'growing', 'some experience', 'few years'],
      beginner: ['beginner', 'new to', 'starting', 'just beginning', 'first time', 'learning basics', 'recently started']
    };

    let maxScore = 0;
    let detectedLevel: ProfileAnalysis['experienceLevel']['category'] = 'intermediate';
    const foundKeywords: string[] = [];

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
        detectedLevel = level as ProfileAnalysis['experienceLevel']['category'];
      }
    }

    // Estimate years based on keywords
    let yearsEstimate: number | undefined;
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

  /**
   * Generate searchable keywords from analysis
   */
  private generateSearchableKeywords(analysis: ProfileAnalysis): string[] {
    const keywords = new Set<string>();

    // Add medium keywords
    analysis.primaryMediums.forEach(medium => keywords.add(medium));
    analysis.secondaryMediums.forEach(medium => keywords.add(medium));

    // Add skill keywords
    analysis.coreSkills.forEach(skill => keywords.add(skill));
    analysis.supportingSkills.forEach(skill => keywords.add(skill));

    // Add interest keywords
    analysis.primaryInterests.forEach(interest => keywords.add(interest));

    // Add experience level keywords
    keywords.add(analysis.experienceLevel.category);
    analysis.experienceLevel.keywords.forEach(keyword => keywords.add(keyword));

    // Add location keywords
    if (analysis.geographicScope.city) keywords.add(analysis.geographicScope.city);
    if (analysis.geographicScope.state) keywords.add(analysis.geographicScope.state);
    if (analysis.geographicScope.country) keywords.add(analysis.geographicScope.country);

    return Array.from(keywords).slice(0, 20); // Limit to top 20 keywords
  }

  /**
   * Determine relevant opportunity types based on profile
   */
  private determineOpportunityTypes(analysis: ProfileAnalysis): string[] {
    const types: string[] = [];

    // Based on experience level
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

    // Based on mediums
    if (analysis.primaryMediums.some(m => ['digital art', 'new media art'].includes(m))) {
      types.push('digital art', 'new media');
    }

    if (analysis.primaryMediums.some(m => ['painting', 'drawing', 'printmaking'].includes(m))) {
      types.push('traditional media', 'fine art');
    }

    return types.slice(0, 6);
  }

  /**
   * Determine funding preferences based on profile analysis
   */
  private determineFundingPreferences(analysis: ProfileAnalysis): string[] {
    const preferences: string[] = [];

    // Based on experience level
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

    // Based on interests
    if (analysis.primaryInterests.includes('social art')) {
      preferences.push('social impact funding');
    }

    if (analysis.primaryInterests.includes('environmental art')) {
      preferences.push('environmental funding');
    }

    return preferences.slice(0, 4);
  }
}

/**
 * Helper class for parsing location information
 */
class LocationParser {
  parseLocation(location?: string | null): ProfileAnalysis['geographicScope'] {
    const result: ProfileAnalysis['geographicScope'] = {
      isRemoteEligible: true
    };

    if (!location) {
      return result;
    }

    const normalizedLocation = location.toLowerCase().trim();

    // Simple parsing - in a real implementation, you'd use a proper geocoding service
    const parts = normalizedLocation.split(',').map(p => p.trim());

    if (parts.length >= 1) {
      result.city = parts[0];
    }

    if (parts.length >= 2) {
      result.state = parts[1];
    }

    if (parts.length >= 3) {
      result.country = parts[2];
    } else {
      // Assume US if no country specified and state-like format
      if (parts.length === 2 && parts[1].length <= 3) {
        result.country = 'United States';
      }
    }

    // Determine region
    if (result.country === 'United States' && result.state) {
      result.region = this.getUSRegion(result.state);
    }

    return result;
  }

  private getUSRegion(state: string): string {
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