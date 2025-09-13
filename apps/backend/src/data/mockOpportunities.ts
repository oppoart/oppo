import { OpportunityData } from '@/types/discovery';

export const mockOpportunities: Omit<OpportunityData, 'id'>[] = [
  {
    title: "Creative Capital Artist Grant",
    description: "Award-winning grant program supporting innovative artists working in all disciplines. Provides up to $50,000 in funding plus career development support.",
    organization: "Creative Capital Foundation",
    url: "https://creative-capital.org/grants",
    deadline: new Date("2025-03-15T23:59:59Z"),
    location: "New York, NY",
    tags: ["grant", "contemporary-art", "innovation", "career-development"],
    sourceType: "websearch" as const,
    relevanceScore: 0.92,
    processed: true,
    amount: "$50,000",
    status: "new" as const,
    applied: false,
    starred: false
  },
  {
    title: "MacDowell Colony Residency",
    description: "Prestigious artist residency program offering 2-8 week stays in rural New Hampshire. Provides studio space, accommodation, and meals for artists of all disciplines.",
    organization: "MacDowell Colony",
    url: "https://macdowell.org/apply",
    deadline: new Date("2025-02-01T23:59:59Z"),
    location: "Peterborough, NH",
    tags: ["residency", "studio-space", "all-disciplines", "prestigious"],
    sourceType: "websearch" as const,
    relevanceScore: 0.88,
    processed: true,
    status: "new" as const,
    applied: false,
    starred: false
  },
  {
    title: "Whitney Biennial 2025",
    description: "Major contemporary art exhibition at the Whitney Museum of American Art. Open to emerging and established artists working in all media.",
    organization: "Whitney Museum",
    url: "https://whitney.org/exhibitions/2025-biennial",
    deadline: new Date("2025-01-31T23:59:59Z"),
    location: "New York, NY",
    tags: ["exhibition", "contemporary-art", "museum", "all-media"],
    sourceType: "websearch" as const,
    relevanceScore: 0.95,
    processed: true,
    status: "new" as const,
    applied: false,
    starred: false
  },
  {
    title: "Skowhegan School of Painting & Sculpture",
    description: "Intensive 9-week summer residency program for emerging artists. Focus on painting, sculpture, and interdisciplinary practices.",
    organization: "Skowhegan School",
    url: "https://skowheganart.org/apply",
    deadline: new Date("2025-01-15T23:59:59Z"),
    location: "Skowhegan, ME",
    tags: ["residency", "painting", "sculpture", "emerging-artists"],
    sourceType: "websearch" as const,
    relevanceScore: 0.85,
    processed: true,
    status: "new" as const,
    applied: false,
    starred: false
  },
  {
    title: "Guggenheim Fellowship",
    description: "Highly competitive fellowship program supporting advanced research and artistic creation. Open to individuals in all fields of knowledge and creativity.",
    organization: "John Simon Guggenheim Memorial Foundation",
    url: "https://gf.org/fellowships/apply",
    deadline: new Date("2025-09-15T23:59:59Z"),
    location: "Various",
    tags: ["fellowship", "research", "advanced-practice", "prestigious"],
    sourceType: "websearch" as const,
    relevanceScore: 0.98,
    processed: true,
    status: "new" as const,
    applied: false,
    starred: false
  },
  {
    title: "ArtPrize 2025",
    description: "International art competition with public voting and jury awards. Open to artists worldwide working in any medium.",
    organization: "ArtPrize",
    url: "https://artprize.org/apply",
    deadline: new Date("2025-04-30T23:59:59Z"),
    location: "Grand Rapids, MI",
    tags: ["competition", "international", "public-voting", "all-media"],
    sourceType: "websearch" as const,
    relevanceScore: 0.75,
    processed: true,
    status: "new" as const,
    applied: false,
    starred: false
  },
  {
    title: "Yaddo Artist Residency",
    description: "Historic artist residency program offering 2-8 week stays in Saratoga Springs. Supports artists, writers, and composers.",
    organization: "Yaddo",
    url: "https://yaddo.org/apply",
    deadline: new Date("2025-01-15T23:59:59Z"),
    location: "Saratoga Springs, NY",
    tags: ["residency", "historic", "multi-disciplinary", "writers"],
    sourceType: "websearch" as const,
    relevanceScore: 0.90,
    processed: true,
    status: "new" as const,
    applied: false,
    starred: false
  },
  {
    title: "Pollock-Krasner Foundation Grant",
    description: "Grant program supporting individual artists with demonstrated financial need. Awards range from $5,000 to $30,000.",
    organization: "Pollock-Krasner Foundation",
    url: "https://pkf.org/apply",
    deadline: new Date("2025-12-31T23:59:59Z"),
    location: "Various",
    tags: ["grant", "financial-need", "individual-artists"],
    sourceType: "websearch" as const,
    relevanceScore: 0.82,
    processed: true,
    amount: "$5,000 - $30,000",
    status: "new" as const,
    applied: false,
    starred: false
  }
];

export const getMockOpportunities = (limit: number = 20, offset: number = 0) => {
  return mockOpportunities.slice(offset, offset + limit);
};

export const getMockOpportunitiesByTag = (tag: string, limit: number = 20) => {
  return mockOpportunities
    .filter(opp => opp.tags.includes(tag))
    .slice(0, limit);
};

export const getMockOpportunitiesByRelevance = (minScore: number, limit: number = 20) => {
  return mockOpportunities
    .filter(opp => (opp.relevanceScore || 0) >= minScore)
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, limit);
};

export const searchMockOpportunities = (searchTerm: string, limit: number = 20) => {
  const term = searchTerm.toLowerCase();
  return mockOpportunities
    .filter(opp => 
      opp.title.toLowerCase().includes(term) ||
      opp.description.toLowerCase().includes(term) ||
      (opp.organization && opp.organization.toLowerCase().includes(term)) ||
      opp.tags.some(tag => tag.toLowerCase().includes(term))
    )
    .slice(0, limit);
};

// Fix the criteria parameter type issue
export const filterOpportunitiesByCriteria = (criteria: { 
  tags?: string[]; 
  location?: string; 
  minRelevance?: number; 
}) => {
  return mockOpportunities.filter(opp => {
    if (criteria.tags && !criteria.tags.some(tag => opp.tags.includes(tag))) {
      return false;
    }
    if (criteria.location && opp.location && !opp.location.toLowerCase().includes(criteria.location.toLowerCase())) {
      return false;
    }
    if (criteria.minRelevance && (opp.relevanceScore || 0) < criteria.minRelevance) {
      return false;
    }
    return true;
  });
};