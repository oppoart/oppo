import { PrismaClient } from '@prisma/client';
import { AnalystService } from '../../../../packages/services/analyst';
import { SessionManager } from './SessionManager';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import {
  QueryGenerationExecutor,
  WebSearchExecutor,
  LLMSearchExecutor,
  SocialMediaExecutor,
  BookmarksExecutor,
  NewslettersExecutor
} from './executors';
import {
  ResearchSession,
  ResearchServiceConfig,
  ServiceExecutionOptions,
  ExportOptions,
  ExportData,
  SessionMetrics
} from './types';
import { RESULT_PAGINATION } from '../../../../../packages/shared/src/constants/research.constants';

export class ResearchService {
  private sessionManager: SessionManager;
  private orchestrator: ServiceOrchestrator;
  private prisma: PrismaClient;
  private analystService: AnalystService;
  private config: ResearchServiceConfig;

  constructor(
    prisma: PrismaClient,
    analystService: AnalystService,
    config?: Partial<ResearchServiceConfig>
  ) {
    this.prisma = prisma;
    this.analystService = analystService;
    this.config = {
      sessionManager: {
        cleanupInterval: 5 * 60 * 1000, // 5 minutes
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxSessions: 1000
      },
      defaultOptions: {
        maxQueries: 10,
        limit: 15,
        priority: 'medium'
      },
      enableMetrics: true,
      enableLogging: true,
      ...config
    };

    this.sessionManager = new SessionManager(this.config.sessionManager);
    this.orchestrator = new ServiceOrchestrator(this.sessionManager);
    this.initializeServices();
  }

  /**
   * Initialize and register all service executors
   */
  private initializeServices(): void {
    // Register all service executors
    this.orchestrator.registerExecutor(new QueryGenerationExecutor(this.analystService));
    this.orchestrator.registerExecutor(new WebSearchExecutor());
    this.orchestrator.registerExecutor(new LLMSearchExecutor());
    this.orchestrator.registerExecutor(new SocialMediaExecutor());
    this.orchestrator.registerExecutor(new BookmarksExecutor());
    this.orchestrator.registerExecutor(new NewslettersExecutor());

    if (this.config.enableLogging) {
      console.log('ResearchService initialized with services:', this.orchestrator.getRegisteredServices());
    }
  }

  /**
   * Start a research service
   */
  async startService(
    serviceId: string,
    profileId: string,
    userId: string,
    options?: ServiceExecutionOptions
  ): Promise<{ sessionId: string; status: string; message: string }> {
    // Verify user owns the profile
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: profileId },
      select: { userId: true, name: true }
    });

    if (!profile || profile.userId !== userId) {
      throw new Error('Access denied to this profile');
    }

    // Check if service is registered
    if (!this.orchestrator.isServiceRegistered(serviceId)) {
      throw new Error(`Unknown service: ${serviceId}`);
    }

    // Merge with default options
    const mergedOptions = { ...this.config.defaultOptions, ...options };

    // Execute service
    const sessionId = await this.orchestrator.executeService(serviceId, profileId, mergedOptions);

    return {
      sessionId,
      status: 'running',
      message: `Started ${serviceId} for ${profile.name}`
    };
  }

  /**
   * Stop a research service
   */
  async stopService(
    sessionId: string,
    userId: string
  ): Promise<{ sessionId: string; status: string; message: string }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Verify user owns the profile
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: session.profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== userId) {
      throw new Error('Access denied');
    }

    const stopped = this.orchestrator.stopService(sessionId);
    if (!stopped) {
      throw new Error('Failed to stop service');
    }

    return {
      sessionId,
      status: 'stopped',
      message: 'Service stopped successfully'
    };
  }

  /**
   * Get service status
   */
  async getServiceStatus(
    serviceId: string,
    sessionId: string,
    userId: string
  ): Promise<{
    sessionId: string;
    serviceId: string;
    status: string;
    progress: number;
    resultsCount: number;
    error?: string;
    startedAt: Date;
    updatedAt: Date;
  }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Verify user owns the profile
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: session.profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== userId) {
      throw new Error('Access denied');
    }

    return {
      sessionId: session.id,
      serviceId: session.serviceId,
      status: session.status as string,
      progress: session.progress,
      resultsCount: session.results.length,
      error: session.error,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt
    };
  }

  /**
   * Get service results with pagination
   */
  async getServiceResults(
    serviceId: string,
    sessionId: string,
    userId: string,
    limit: number = RESULT_PAGINATION.DEFAULT_LIMIT,
    offset: number = RESULT_PAGINATION.DEFAULT_OFFSET
  ): Promise<{
    sessionId: string;
    serviceId: string;
    status: string;
    results: any[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Verify user owns the profile
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: session.profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== userId) {
      throw new Error('Access denied');
    }

    const paginatedResults = session.results.slice(offset, offset + limit);

    return {
      sessionId: session.id,
      serviceId: session.serviceId,
      status: session.status as string,
      results: paginatedResults,
      total: session.results.length,
      limit,
      offset,
      hasMore: offset + limit < session.results.length
    };
  }

  /**
   * Get all active sessions for a profile
   */
  async getProfileSessions(
    profileId: string,
    userId: string
  ): Promise<{
    profileId: string;
    sessions: {
      sessionId: string;
      serviceId: string;
      status: string;
      progress: number;
      resultsCount: number;
      startedAt: Date;
      updatedAt: Date;
    }[];
  }> {
    // Verify user owns the profile
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: profileId },
      select: { userId: true }
    });

    if (!profile || profile.userId !== userId) {
      throw new Error('Access denied');
    }

    const profileSessions = this.sessionManager.getProfileSessions(profileId)
      .map(session => ({
        sessionId: session.id,
        serviceId: session.serviceId,
        status: session.status as string,
        progress: session.progress,
        resultsCount: session.results.length,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt
      }));

    return {
      profileId,
      sessions: profileSessions
    };
  }

  /**
   * Fetch opportunities using research module
   */
  async fetchOpportunities(
    userId: string,
    searchTerms?: string,
    types?: string[],
    minRelevanceScore?: number
  ): Promise<{
    data: any[];
    message: string;
    searchCriteria: {
      searchTerms?: string;
      types?: string[];
      minRelevanceScore?: number;
    };
  }> {
    // Get user's profiles to use for research
    const profiles = await this.prisma.artistProfile.findMany({
      where: { userId },
      select: { id: true, name: true }
    });

    if (profiles.length === 0) {
      throw new Error('No artist profiles found. Please create a profile first.');
    }

    // Build search query
    const searchWhereClause: any = {};
    
    if (searchTerms) {
      searchWhereClause.OR = [
        { title: { contains: searchTerms, mode: 'insensitive' } },
        { description: { contains: searchTerms, mode: 'insensitive' } },
        { organization: { contains: searchTerms, mode: 'insensitive' } },
        { tags: { has: searchTerms } }
      ];
    }

    const dbOpportunities = await this.prisma.opportunity.findMany({
      where: searchWhereClause,
      take: 10,
      orderBy: [
        { relevanceScore: 'desc' }
      ]
    });

    // Transform to expected format
    let processedOpportunities = dbOpportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      organization: opp.organization,
      description: opp.description,
      deadline: opp.deadline,
      amount: opp.amount,
      location: opp.location,
      url: opp.url || `#opportunity-${opp.id}`,
      relevanceScore: opp.relevanceScore || 0.5,
      tags: opp.tags,
      category: opp.sourceType, // Use sourceType as category
      discovered: new Date(), // Use current date as discovered
      lastUpdated: new Date(), // Use current date as lastUpdated
      matchingCriteria: [] // Add empty array to prevent errors
    }));

    // Apply additional filters
    if (searchTerms) {
      const searchLower = searchTerms.toLowerCase();
      processedOpportunities = processedOpportunities.filter(opp => 
        opp.title.toLowerCase().includes(searchLower) ||
        opp.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (types && types.length > 0) {
      processedOpportunities = processedOpportunities.filter(opp => 
        types.includes(opp.category)
      );
    }
    
    if (minRelevanceScore) {
      processedOpportunities = processedOpportunities.filter(opp => 
        opp.relevanceScore >= minRelevanceScore
      );
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      data: processedOpportunities,
      message: `Found ${processedOpportunities.length} new opportunities`,
      searchCriteria: {
        searchTerms,
        types,
        minRelevanceScore
      }
    };
  }

  /**
   * Export research results
   */
  async exportResults(
    profileId: string,
    userId: string,
    options: ExportOptions
  ): Promise<ExportData | string> {
    // Verify user owns the profile
    const profile = await this.prisma.artistProfile.findUnique({
      where: { id: profileId },
      select: { userId: true, name: true }
    });

    if (!profile || profile.userId !== userId) {
      throw new Error('Access denied');
    }

    // Get sessions to export
    const sessionsToExport = this.sessionManager.exportProfileSessions(profileId, options.serviceIds);

    // Prepare export data
    const exportData: ExportData = {
      profile: {
        id: profileId,
        name: profile.name
      },
      exportDate: new Date().toISOString(),
      services: sessionsToExport.map(session => ({
        serviceId: session.serviceId,
        sessionId: session.id,
        status: session.status as string,
        resultsCount: session.results.length,
        startedAt: session.startedAt,
        results: options.includeResults ? session.results : undefined
      })),
      totalResults: sessionsToExport.reduce((sum, session) => sum + session.results.length, 0),
      metadata: {
        exportFormat: options.format,
        generatedBy: 'OPPO Research Service',
        version: '1.0.0'
      }
    };

    if (options.format === 'csv') {
      // Generate CSV format
      const csvHeaders = 'Service,Status,Results Count,Started At,Result Data\n';
      const csvRows = sessionsToExport.map(session => 
        `"${session.serviceId}","${session.status}",${session.results.length},"${session.startedAt.toISOString()}","${JSON.stringify(session.results).replace(/"/g, '""')}"`
      ).join('\n');
      
      return csvHeaders + csvRows;
    }

    return exportData;
  }

  /**
   * Get service metrics
   */
  getMetrics(): SessionMetrics & { serviceStats: any } {
    const sessionMetrics = this.sessionManager.getMetrics();
    const serviceStats = this.orchestrator.getExecutionStats();
    
    return {
      ...sessionMetrics,
      serviceStats
    };
  }

  /**
   * Get service health status
   */
  getServiceHealth() {
    return this.orchestrator.getAllServiceHealth();
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    this.sessionManager.destroy();
    this.orchestrator.destroy();
  }
}