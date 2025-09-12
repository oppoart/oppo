import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { AnalystService } from '../../../../packages/services/analyst';

const router = Router();
const prisma = new PrismaClient();
const analystService = new AnalystService(prisma);

// Initialize services
analystService.initialize().catch(console.error);

// In-memory session storage (in production, use Redis or database)
const activeSessions = new Map<string, {
  id: string;
  serviceId: string;
  profileId: string;
  status: 'running' | 'completed' | 'error' | 'stopped';
  progress: number;
  results: any[];
  error?: string;
  startedAt: Date;
  updatedAt: Date;
}>();

// Validation schemas
const startServiceSchema = z.object({
  serviceId: z.enum(['query-generation', 'web-search', 'llm-search', 'social-media', 'bookmarks', 'newsletters']),
  profileId: z.string(),
  options: z.object({
    maxQueries: z.number().optional(),
    sources: z.array(z.string()).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional()
  }).optional()
});

const stopServiceSchema = z.object({
  serviceId: z.string(),
  sessionId: z.string()
});

const exportSchema = z.object({
  profileId: z.string(),
  serviceIds: z.array(z.string()).optional(),
  format: z.enum(['json', 'csv']).default('json')
});

const fetchOpportunitiesSchema = z.object({
  searchTerms: z.string().optional(),
  types: z.array(z.string()).optional(),
  minRelevanceScore: z.number().min(0).max(1).optional()
});

// Service implementations
const serviceExecutors = {
  'query-generation': async (profileId: string, options: any = {}) => {
    const queries = await analystService.generateQueries(profileId, {
      maxQueries: options.maxQueries || 10,
      sourceTypes: options.sources || ['websearch', 'social', 'bookmark', 'newsletter']
    });
    return queries;
  },

  'web-search': async (profileId: string, options: any = {}) => {
    // Simulate web search results
    const mockResults = [
      {
        title: 'Art Grant Opportunity 2024',
        url: 'https://example.com/grant1',
        snippet: 'Supporting emerging artists with grants up to $50,000...',
        source: 'Web Search',
        relevance: 0.89
      },
      {
        title: 'Digital Art Residency Program',
        url: 'https://example.com/residency1',
        snippet: 'International residency program for digital artists...',
        source: 'Web Search',
        relevance: 0.76
      },
      {
        title: 'Contemporary Art Exhibition Call',
        url: 'https://example.com/exhibition1',
        snippet: 'Open call for contemporary artists for upcoming exhibition...',
        source: 'Web Search',
        relevance: 0.83
      }
    ];
    
    return mockResults;
  },

  'llm-search': async (profileId: string, options: any = {}) => {
    // Simulate LLM-powered search insights
    const insights = [
      {
        insight: 'Strong trend towards digital art funding in Q4 2024',
        confidence: 0.87,
        sources: ['ArtWorld Weekly', 'Digital Arts Foundation'],
        relevantOpportunities: 15
      },
      {
        insight: 'Sustainability themes are gaining significant traction in art grants',
        confidence: 0.73,
        sources: ['Green Arts Initiative', 'Environmental Art Fund'],
        relevantOpportunities: 8
      },
      {
        insight: 'Virtual exhibition opportunities have increased 300% this year',
        confidence: 0.91,
        sources: ['Virtual Art Spaces', 'Online Gallery Network'],
        relevantOpportunities: 22
      }
    ];

    return insights;
  },

  'social-media': async (profileId: string, options: any = {}) => {
    // Simulate social media mentions and opportunities
    const mentions = [
      {
        platform: 'Twitter',
        content: 'Great opportunity for digital artists! Check out this grant program...',
        engagement: 156,
        url: 'https://twitter.com/artgrants/status/123',
        author: '@artgrants',
        timestamp: new Date().toISOString()
      },
      {
        platform: 'Instagram',
        content: 'New residency program accepting applications...',
        engagement: 89,
        url: 'https://instagram.com/p/abc123',
        author: '@artresidencies',
        timestamp: new Date().toISOString()
      },
      {
        platform: 'LinkedIn',
        content: 'Fellowship opportunity for emerging artists in sustainability...',
        engagement: 234,
        url: 'https://linkedin.com/posts/sustainability-arts',
        author: 'Sustainability Arts Council',
        timestamp: new Date().toISOString()
      }
    ];

    return mentions;
  },

  'bookmarks': async (profileId: string, options: any = {}) => {
    // Simulate bookmark/RSS feed results
    const bookmarks = [
      {
        title: 'Saved Grant Opportunity - Creative Europe',
        url: 'https://creative-europe.eu/grants',
        category: 'grants',
        savedDate: '2024-01-15',
        tags: ['international', 'digital-arts', 'funding'],
        description: 'EU funding for creative digital projects'
      },
      {
        title: 'Artist Resource Database',
        url: 'https://artistresources.org',
        category: 'resources',
        savedDate: '2024-01-10',
        tags: ['database', 'opportunities', 'networking'],
        description: 'Comprehensive database of artist opportunities'
      },
      {
        title: 'RSS: Contemporary Art News',
        url: 'https://contemporaryartnews.com/feed',
        category: 'news',
        savedDate: '2024-01-08',
        tags: ['news', 'exhibitions', 'trends'],
        description: 'Latest contemporary art news and opportunities'
      }
    ];

    return bookmarks;
  },

  'newsletters': async (profileId: string, options: any = {}) => {
    // Simulate newsletter archive results
    const newsletters = [
      {
        subject: 'Monthly Art Opportunities Digest',
        sender: 'ArtWorld Weekly',
        date: '2024-01-12',
        content: 'This month\'s top opportunities for emerging artists...',
        opportunities: 12,
        relevanceScore: 0.84
      },
      {
        subject: 'Grant Deadline Reminder - Applications Due Soon',
        sender: 'Funding News',
        date: '2024-01-08',
        content: 'Don\'t miss these upcoming grant deadlines...',
        opportunities: 6,
        relevanceScore: 0.92
      },
      {
        subject: 'Virtual Exhibition Spaces - New Platforms',
        sender: 'Digital Arts Network',
        date: '2024-01-05',
        content: 'Discover new virtual exhibition platforms...',
        opportunities: 8,
        relevanceScore: 0.67
      }
    ];

    return newsletters;
  }
};

// Routes

/**
 * POST /api/research/start
 * Start a research service
 */
router.post('/start',
  requireAuth,
  validate({ body: startServiceSchema }),
  async (req, res) => {
    try {
      const { serviceId, profileId, options } = req.body;

      // Verify user owns the profile
      const profile = await prisma.artistProfile.findUnique({
        where: { id: profileId },
        select: { userId: true, name: true }
      });

      if (!profile || profile.userId !== req.user?.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this profile'
        });
      }

      // Create session
      const sessionId = `${serviceId}-${profileId}-${Date.now()}`;
      const session = {
        id: sessionId,
        serviceId,
        profileId,
        status: 'running' as const,
        progress: 0,
        results: [],
        startedAt: new Date(),
        updatedAt: new Date()
      };

      activeSessions.set(sessionId, session);

      // Start background processing
      processService(sessionId, serviceId, profileId, options || {});

      res.json({
        success: true,
        data: {
          sessionId,
          status: 'running',
          message: `Started ${serviceId} for ${profile.name}`
        }
      });
    } catch (error) {
      console.error('Service start error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start service'
      });
    }
  }
);

/**
 * POST /api/research/stop
 * Stop a research service
 */
router.post('/stop',
  requireAuth,
  validate({ body: stopServiceSchema }),
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const session = activeSessions.get(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Verify user owns the profile
      const profile = await prisma.artistProfile.findUnique({
        where: { id: session.profileId },
        select: { userId: true }
      });

      if (!profile || profile.userId !== req.user?.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Update session status
      session.status = 'stopped';
      session.updatedAt = new Date();
      activeSessions.set(sessionId, session);

      res.json({
        success: true,
        data: {
          sessionId,
          status: 'stopped',
          message: 'Service stopped successfully'
        }
      });
    } catch (error) {
      console.error('Service stop error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop service'
      });
    }
  }
);

/**
 * GET /api/research/status/:serviceId/:sessionId
 * Get service status
 */
router.get('/status/:serviceId/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Verify user owns the profile
    const profile = await prisma.artistProfile.findUnique({
      where: { id: session.profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        serviceId: session.serviceId,
        status: session.status,
        progress: session.progress,
        resultsCount: session.results.length,
        error: session.error,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service status'
    });
  }
});

/**
 * GET /api/research/results/:serviceId/:sessionId
 * Get service results
 */
router.get('/results/:serviceId/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    const session = activeSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Verify user owns the profile
    const profile = await prisma.artistProfile.findUnique({
      where: { id: session.profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedResults = session.results.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        serviceId: session.serviceId,
        status: session.status,
        results: paginatedResults,
        total: session.results.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < session.results.length
      }
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service results'
    });
  }
});

/**
 * GET /api/research/sessions/:profileId
 * Get all active sessions for a profile
 */
router.get('/sessions/:profileId', requireAuth, async (req, res) => {
  try {
    const { profileId } = req.params;

    // Verify user owns the profile
    const profile = await prisma.artistProfile.findUnique({
      where: { id: profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const profileSessions = Array.from(activeSessions.values())
      .filter(session => session.profileId === profileId)
      .map(session => ({
        sessionId: session.id,
        serviceId: session.serviceId,
        status: session.status,
        progress: session.progress,
        resultsCount: session.results.length,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt
      }));

    res.json({
      success: true,
      data: {
        profileId,
        sessions: profileSessions
      }
    });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions'
    });
  }
});

/**
 * POST /api/research/fetch-opportunities
 * Fetch new opportunities using research module
 */
router.post('/fetch-opportunities',
  requireAuth,
  validate({ body: fetchOpportunitiesSchema }),
  async (req, res) => {
    try {
      const { searchTerms, types, minRelevanceScore } = req.body;
      
      // Get user's profiles to use for research
      const profiles = await prisma.artistProfile.findMany({
        where: { userId: req.user?.id },
        select: { id: true, name: true }
      });

      if (profiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No artist profiles found. Please create a profile first.'
        });
      }

      // Use the first profile for research (in a real app, you might let user choose)
      const profileId = profiles[0].id;
      
      // Simulate research process to find new opportunities
      const mockNewOpportunities = [
        {
          id: `new-${Date.now()}-1`,
          title: 'Emerging Digital Artists Grant 2024',
          description: 'Supporting innovative digital artists with grants up to $25,000 for new media projects.',
          type: 'grant',
          source: 'Digital Arts Foundation',
          location: 'International',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          url: 'https://digitalartsfoundation.org/grants/emerging-2024',
          relevanceScore: 0.92,
          matchingCriteria: ['digital art', 'emerging artists', 'new media', 'grant funding'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `new-${Date.now()}-2`,
          title: 'Virtual Residency Program - Metaverse Art',
          description: '3-month virtual residency exploring art in virtual environments and metaverse spaces.',
          type: 'residency',
          source: 'Virtual Art Institute',
          location: 'Virtual/Online',
          deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
          url: 'https://virtualartinstitute.org/residencies/metaverse-2024',
          relevanceScore: 0.88,
          matchingCriteria: ['virtual art', 'residency', 'metaverse', 'digital innovation'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `new-${Date.now()}-3`,
          title: 'Sustainable Art Exhibition Call',
          description: 'Open call for artists working with sustainable materials and environmental themes.',
          type: 'exhibition',
          source: 'Green Gallery Collective',
          location: 'New York, NY',
          deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
          url: 'https://greengallery.org/sustainable-art-2024',
          relevanceScore: 0.85,
          matchingCriteria: ['sustainability', 'environmental art', 'exhibition', 'eco-friendly'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `new-${Date.now()}-4`,
          title: 'AI Art Competition - Future Visions',
          description: 'International competition for AI-generated and AI-assisted artworks exploring future possibilities.',
          type: 'competition',
          source: 'AI Art Foundation',
          location: 'Global',
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
          url: 'https://aiartfoundation.org/competitions/future-visions-2024',
          relevanceScore: 0.91,
          matchingCriteria: ['AI art', 'competition', 'technology', 'future themes'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: `new-${Date.now()}-5`,
          title: 'Community Art Fellowship Program',
          description: 'Year-long fellowship supporting artists working on community-engaged projects and social impact.',
          type: 'fellowship',
          source: 'Community Arts Network',
          location: 'Various Cities',
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
          url: 'https://communityarts.org/fellowships/2024-2025',
          relevanceScore: 0.79,
          matchingCriteria: ['community art', 'social impact', 'fellowship', 'public engagement'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Filter opportunities based on search criteria
      let filteredOpportunities = mockNewOpportunities;
      
      if (searchTerms) {
        const searchLower = searchTerms.toLowerCase();
        filteredOpportunities = filteredOpportunities.filter(opp => 
          opp.title.toLowerCase().includes(searchLower) ||
          opp.description.toLowerCase().includes(searchLower) ||
          opp.matchingCriteria.some(criteria => criteria.toLowerCase().includes(searchLower))
        );
      }
      
      if (types && types.length > 0) {
        filteredOpportunities = filteredOpportunities.filter(opp => 
          types.includes(opp.type)
        );
      }
      
      if (minRelevanceScore) {
        filteredOpportunities = filteredOpportunities.filter(opp => 
          opp.relevanceScore >= minRelevanceScore
        );
      }

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({
        success: true,
        data: filteredOpportunities,
        message: `Found ${filteredOpportunities.length} new opportunities`,
        searchCriteria: {
          searchTerms,
          types,
          minRelevanceScore
        }
      });
    } catch (error) {
      console.error('Fetch opportunities error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch new opportunities'
      });
    }
  }
);

/**
 * POST /api/research/export
 * Export research results
 */
router.post('/export',
  requireAuth,
  validate({ body: exportSchema }),
  async (req, res) => {
    try {
      const { profileId, serviceIds, format } = req.body;

      // Verify user owns the profile
      const profile = await prisma.artistProfile.findUnique({
        where: { id: profileId },
        select: { userId: true, name: true }
      });

      if (!profile || profile.userId !== req.user?.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get all sessions for the profile
      let sessionsToExport = Array.from(activeSessions.values())
        .filter(session => session.profileId === profileId);

      // Filter by specific services if requested
      if (serviceIds && serviceIds.length > 0) {
        sessionsToExport = sessionsToExport.filter(session => 
          serviceIds.includes(session.serviceId)
        );
      }

      // Prepare export data
      const exportData = {
        profile: {
          id: profileId,
          name: profile.name
        },
        exportDate: new Date().toISOString(),
        services: sessionsToExport.map(session => ({
          serviceId: session.serviceId,
          sessionId: session.id,
          status: session.status,
          resultsCount: session.results.length,
          startedAt: session.startedAt,
          results: session.results
        })),
        totalResults: sessionsToExport.reduce((sum, session) => sum + session.results.length, 0)
      };

      if (format === 'csv') {
        // Generate CSV format
        const csvHeaders = 'Service,Status,Results Count,Started At,Result Data\n';
        const csvRows = sessionsToExport.map(session => 
          `"${session.serviceId}","${session.status}",${session.results.length},"${session.startedAt.toISOString()}","${JSON.stringify(session.results).replace(/"/g, '""')}"`
        ).join('\n');
        
        const csvContent = csvHeaders + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="research-export-${profileId}-${Date.now()}.csv"`);
        res.send(csvContent);
      } else {
        // JSON format
        res.json({
          success: true,
          data: exportData
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export results'
      });
    }
  }
);

// Background service processing function
async function processService(sessionId: string, serviceId: string, profileId: string, options: any) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  try {
    const executor = serviceExecutors[serviceId as keyof typeof serviceExecutors];
    if (!executor) {
      throw new Error(`Unknown service: ${serviceId}`);
    }

    // Simulate progressive updates
    const updateProgress = (progress: number) => {
      const currentSession = activeSessions.get(sessionId);
      if (currentSession && currentSession.status === 'running') {
        currentSession.progress = progress;
        currentSession.updatedAt = new Date();
        activeSessions.set(sessionId, currentSession);
      }
    };

    // Simulate processing with progress updates
    updateProgress(10);
    await new Promise(resolve => setTimeout(resolve, 1000));
    updateProgress(30);
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateProgress(60);

    // Execute the actual service
    const results = await executor(profileId, options);
    
    updateProgress(90);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Complete the session
    const finalSession = activeSessions.get(sessionId);
    if (finalSession && finalSession.status === 'running') {
      finalSession.status = 'completed';
      finalSession.progress = 100;
      finalSession.results = Array.isArray(results) ? results : [results];
      finalSession.updatedAt = new Date();
      activeSessions.set(sessionId, finalSession);
    }
  } catch (error) {
    console.error(`Service ${serviceId} error:`, error);
    const errorSession = activeSessions.get(sessionId);
    if (errorSession) {
      errorSession.status = 'error';
      errorSession.error = error instanceof Error ? error.message : 'Unknown error';
      errorSession.updatedAt = new Date();
      activeSessions.set(sessionId, errorSession);
    }
  }
}

export default router;