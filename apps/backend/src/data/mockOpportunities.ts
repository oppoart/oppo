import { Opportunity } from '@/types/discovery';

export const mockOpportunities: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: "Creative Capital Artist Grant",
    description: "Award-winning grant program supporting innovative artists working in all disciplines. Provides up to $50,000 in funding plus career development support.",
    source: "Creative Capital Foundation",
    url: "https://creative-capital.org/grants",
    deadline: "2025-03-15T23:59:59Z",
    location: "New York, NY",
    type: "grant",
    relevanceScore: 0.92,
    matchingCriteria: ["Contemporary Art", "Innovation", "Career Development", "Multi-disciplinary"]
  },
  {
    title: "MacDowell Colony Residency",
    description: "Prestigious artist residency program offering 2-8 week stays in rural New Hampshire. Provides studio space, accommodation, and meals for artists of all disciplines.",
    source: "MacDowell Colony",
    url: "https://macdowell.org/apply",
    deadline: "2025-02-01T23:59:59Z",
    location: "Peterborough, NH",
    type: "residency",
    relevanceScore: 0.88,
    matchingCriteria: ["Residency", "Studio Space", "All Disciplines", "Prestigious"]
  },
  {
    title: "Whitney Biennial 2025",
    description: "Major contemporary art exhibition at the Whitney Museum of American Art. Open to emerging and established artists working in all media.",
    source: "Whitney Museum",
    url: "https://whitney.org/exhibitions/2025-biennial",
    deadline: "2025-01-31T23:59:59Z",
    location: "New York, NY",
    type: "exhibition",
    relevanceScore: 0.95,
    matchingCriteria: ["Contemporary Art", "Museum Exhibition", "All Media", "Prestigious"]
  },
  {
    title: "Skowhegan School of Painting & Sculpture",
    description: "Intensive 9-week summer residency program for emerging artists. Focus on painting, sculpture, and interdisciplinary practices.",
    source: "Skowhegan School",
    url: "https://skowheganart.org/apply",
    deadline: "2025-01-15T23:59:59Z",
    location: "Skowhegan, ME",
    type: "residency",
    relevanceScore: 0.85,
    matchingCriteria: ["Painting", "Sculpture", "Emerging Artists", "Summer Program"]
  },
  {
    title: "Guggenheim Fellowship",
    description: "Highly competitive fellowship program supporting advanced research and artistic creation. Open to individuals in all fields of knowledge and creativity.",
    source: "John Simon Guggenheim Memorial Foundation",
    url: "https://gf.org/fellowships/apply",
    deadline: "2025-09-15T23:59:59Z",
    location: "Various",
    type: "fellowship",
    relevanceScore: 0.98,
    matchingCriteria: ["Research", "Advanced Practice", "All Fields", "Prestigious"]
  },
  {
    title: "ArtPrize 2025",
    description: "International art competition with public voting and jury awards. Open to artists worldwide working in any medium.",
    source: "ArtPrize",
    url: "https://artprize.org/apply",
    deadline: "2025-04-30T23:59:59Z",
    location: "Grand Rapids, MI",
    type: "competition",
    relevanceScore: 0.75,
    matchingCriteria: ["International", "Public Voting", "All Media", "Competition"]
  },
  {
    title: "Yaddo Artist Residency",
    description: "Historic artist residency program offering 2-8 week stays in Saratoga Springs. Supports artists, writers, and composers.",
    source: "Yaddo",
    url: "https://yaddo.org/apply",
    deadline: "2025-01-15T23:59:59Z",
    location: "Saratoga Springs, NY",
    type: "residency",
    relevanceScore: 0.90,
    matchingCriteria: ["Historic", "Multi-disciplinary", "Writers", "Composers"]
  },
  {
    title: "Pollock-Krasner Foundation Grant",
    description: "Grant program supporting individual artists with demonstrated financial need. Awards range from $5,000 to $30,000.",
    source: "Pollock-Krasner Foundation",
    url: "https://pkf.org/apply",
    deadline: "2025-12-31T23:59:59Z",
    location: "Various",
    type: "grant",
    relevanceScore: 0.82,
    matchingCriteria: ["Financial Need", "Individual Artists", "Flexible Deadline"]
  },
  {
    title: "SculptureCenter Exhibition Program",
    description: "Contemporary art exhibition space seeking proposals for solo and group shows. Focus on experimental and innovative practices.",
    source: "SculptureCenter",
    url: "https://sculpture-center.org/exhibitions/proposals",
    deadline: "2025-06-01T23:59:59Z",
    location: "Long Island City, NY",
    type: "exhibition",
    relevanceScore: 0.87,
    matchingCriteria: ["Contemporary Art", "Experimental", "Solo Shows", "Group Shows"]
  },
  {
    title: "Vermont Studio Center Residency",
    description: "Artist residency program offering 2-12 week stays in Johnson, Vermont. Supports visual artists and writers with studio space and community.",
    source: "Vermont Studio Center",
    url: "https://vermontstudiocenter.org/apply",
    deadline: "2025-02-15T23:59:59Z",
    location: "Johnson, VT",
    type: "residency",
    relevanceScore: 0.83,
    matchingCriteria: ["Visual Artists", "Writers", "Studio Space", "Community"]
  },
  {
    title: "Artadia Award",
    description: "Annual award program recognizing exceptional contemporary artists in select cities. Provides unrestricted funding and career support.",
    source: "Artadia",
    url: "https://artadia.org/apply",
    deadline: "2025-05-01T23:59:59Z",
    location: "Atlanta, Boston, Chicago, Houston, Los Angeles, New York, San Francisco",
    type: "grant",
    relevanceScore: 0.89,
    matchingCriteria: ["Contemporary Art", "Unrestricted Funding", "Career Support", "Select Cities"]
  },
  {
    title: "Headlands Center for the Arts Residency",
    description: "Artist residency program in Marin County offering 1-3 month stays. Supports artists working in all disciplines with studio space and housing.",
    source: "Headlands Center for the Arts",
    url: "https://headlands.org/apply",
    deadline: "2025-03-01T23:59:59Z",
    location: "Sausalito, CA",
    type: "residency",
    relevanceScore: 0.86,
    matchingCriteria: ["All Disciplines", "Studio Space", "Housing", "1-3 Months"]
  },
  {
    title: "International Sculpture Center Outstanding Student Achievement Award",
    description: "Annual award recognizing exceptional work by undergraduate and graduate sculpture students. Includes cash prize and publication.",
    source: "International Sculpture Center",
    url: "https://sculpture.org/student-award",
    deadline: "2025-04-15T23:59:59Z",
    location: "Various",
    type: "competition",
    relevanceScore: 0.78,
    matchingCriteria: ["Sculpture", "Students", "Undergraduate", "Graduate"]
  },
  {
    title: "The Drawing Center Open Sessions",
    description: "Exhibition program for emerging and mid-career artists working in drawing and works on paper. Includes exhibition and publication opportunities.",
    source: "The Drawing Center",
    url: "https://drawingcenter.org/open-sessions",
    deadline: "2025-07-01T23:59:59Z",
    location: "New York, NY",
    type: "exhibition",
    relevanceScore: 0.84,
    matchingCriteria: ["Drawing", "Works on Paper", "Emerging Artists", "Mid-career"]
  },
  {
    title: "Civitella Ranieri Fellowship",
    description: "International fellowship program for artists, writers, and composers. Offers 6-week residencies in a 15th-century castle in Umbria, Italy.",
    source: "Civitella Ranieri Foundation",
    url: "https://civitella.org/apply",
    deadline: "2025-01-31T23:59:59Z",
    location: "Umbertide, Italy",
    type: "fellowship",
    relevanceScore: 0.91,
    matchingCriteria: ["International", "Writers", "Composers", "Italy", "Historic"]
  },
  {
    title: "Art Omi Residency",
    description: "International artist residency program in Ghent, New York. Offers 2-4 week stays for visual artists, writers, and musicians.",
    source: "Art Omi",
    url: "https://artomi.org/apply",
    deadline: "2025-02-28T23:59:59Z",
    location: "Ghent, NY",
    type: "residency",
    relevanceScore: 0.88,
    matchingCriteria: ["International", "Visual Artists", "Writers", "Musicians"]
  },
  {
    title: "The Joan Mitchell Foundation Painters & Sculptors Grant",
    description: "Grant program supporting individual painters and sculptors with demonstrated artistic merit and financial need. Awards up to $25,000.",
    source: "Joan Mitchell Foundation",
    url: "https://joanmitchellfoundation.org/grants",
    deadline: "2025-09-01T23:59:59Z",
    location: "Various",
    type: "grant",
    relevanceScore: 0.93,
    matchingCriteria: ["Painting", "Sculpture", "Financial Need", "Individual Artists"]
  },
  {
    title: "SITE Santa Fe Biennial",
    description: "Contemporary art biennial exhibition in Santa Fe, New Mexico. Seeks innovative and experimental work from artists worldwide.",
    source: "SITE Santa Fe",
    url: "https://sitesantafe.org/biennial",
    deadline: "2025-05-15T23:59:59Z",
    location: "Santa Fe, NM",
    type: "exhibition",
    relevanceScore: 0.79,
    matchingCriteria: ["Contemporary Art", "Biennial", "International", "Experimental"]
  },
  {
    title: "The Watermill Center Residency",
    description: "Artist residency program founded by Robert Wilson. Offers 1-4 week residencies for artists working in all disciplines.",
    source: "The Watermill Center",
    url: "https://watermillcenter.org/apply",
    deadline: "2025-03-15T23:59:59Z",
    location: "Water Mill, NY",
    type: "residency",
    relevanceScore: 0.85,
    matchingCriteria: ["Robert Wilson", "All Disciplines", "1-4 Weeks", "Prestigious"]
  },
  {
    title: "Artadia Award - Los Angeles",
    description: "Annual award program for contemporary artists in Los Angeles. Provides unrestricted funding and exhibition opportunities.",
    source: "Artadia Los Angeles",
    url: "https://artadia.org/los-angeles",
    deadline: "2025-04-30T23:59:59Z",
    location: "Los Angeles, CA",
    type: "grant",
    relevanceScore: 0.87,
    matchingCriteria: ["Los Angeles", "Contemporary Art", "Unrestricted Funding", "Exhibition"]
  }
];

export const getMockOpportunities = (limit: number = 20, offset: number = 0) => {
  return mockOpportunities.slice(offset, offset + limit);
};

export const getMockOpportunitiesByType = (type: string, limit: number = 20) => {
  return mockOpportunities
    .filter(opp => opp.type === type)
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
      opp.source.toLowerCase().includes(term) ||
      opp.matchingCriteria?.some(criteria => criteria.toLowerCase().includes(term))
    )
    .slice(0, limit);
};
