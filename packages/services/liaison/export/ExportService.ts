import { PrismaClient, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { LiaisonConfig, ExportFormat, ExportData, LiaisonEvents } from '../types';

export class ExportService extends EventEmitter {
  private config: LiaisonConfig['export'];

  constructor(
    private prisma: PrismaClient,
    config: LiaisonConfig['export']
  ) {
    super();
    this.config = config;
  }

  async exportOpportunities(
    opportunities: Opportunity[],
    format: ExportFormat,
    options?: {
      filename?: string;
      includeMetadata?: boolean;
      filterByStatus?: string[];
    }
  ): Promise<Blob | void> {
    // Validate input
    if (opportunities.length > this.config.maxItems) {
      throw new Error(`Export limit exceeded. Maximum ${this.config.maxItems} items allowed.`);
    }

    if (!this.config.formats.includes(format)) {
      throw new Error(`Export format '${format}' is not supported`);
    }

    // Filter opportunities if needed
    let filteredOpportunities = opportunities;
    if (options?.filterByStatus && options.filterByStatus.length > 0) {
      filteredOpportunities = opportunities.filter(opp => 
        options.filterByStatus!.includes(opp.status || '')
      );
    }

    try {
      let result: Blob | void;

      switch (format) {
        case 'csv':
          result = await this.exportToCSV(filteredOpportunities, options);
          break;
        case 'json':
          result = await this.exportToJSON(filteredOpportunities, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      this.emit('export.completed', format, filteredOpportunities.length);
      return result;

    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async exportToCSV(
    opportunities: Opportunity[],
    options?: { includeMetadata?: boolean }
  ): Promise<Blob> {
    const headers = [
      'ID',
      'Title',
      'Organization',
      'Description',
      'URL',
      'Deadline',
      'Status',
      'Type',
      'Relevance Score',
      'Application Fee',
      'Created At',
      'Updated At'
    ];

    if (options?.includeMetadata) {
      headers.push('Tags', 'Notes', 'Source');
    }

    const csvRows = [
      headers.join(','),
      ...opportunities.map(opp => {
        const row = [
          this.escapeCSV(opp.id),
          this.escapeCSV(opp.title || ''),
          this.escapeCSV(opp.organization || ''),
          this.escapeCSV(opp.description || ''),
          this.escapeCSV(opp.url || ''),
          opp.deadline ? opp.deadline.toISOString().split('T')[0] : '',
          this.escapeCSV(opp.status || ''),
          this.escapeCSV(opp.type || ''),
          opp.relevanceScore?.toString() || '0',
          opp.applicationFee?.toString() || '0',
          opp.createdAt.toISOString(),
          opp.updatedAt.toISOString()
        ];

        if (options?.includeMetadata) {
          row.push(
            this.escapeCSV((opp as any).tags?.join(';') || ''),
            this.escapeCSV((opp as any).notes || ''),
            this.escapeCSV((opp as any).source || '')
          );
        }

        return row.join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  async exportToJSON(
    opportunities: Opportunity[],
    options?: { includeMetadata?: boolean }
  ): Promise<Blob> {
    const exportData: ExportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      count: opportunities.length,
      opportunities: opportunities.map(opp => {
        const baseData = {
          id: opp.id,
          title: opp.title,
          organization: opp.organization,
          description: opp.description,
          url: opp.url,
          deadline: opp.deadline?.toISOString(),
          status: opp.status,
          type: opp.type,
          relevanceScore: opp.relevanceScore,
          applicationFee: opp.applicationFee,
          createdAt: opp.createdAt.toISOString(),
          updatedAt: opp.updatedAt.toISOString()
        };

        if (options?.includeMetadata) {
          return {
            ...baseData,
            tags: (opp as any).tags || [],
            notes: (opp as any).notes || '',
            source: (opp as any).source || '',
            metadata: (opp as any).metadata || {}
          };
        }

        return baseData;
      })
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  }


  async exportFiltered(
    filters: {
      status?: string[];
      type?: string[];
      organization?: string[];
      relevanceMinScore?: number;
      deadlineAfter?: Date;
      deadlineBefore?: Date;
      createdAfter?: Date;
      createdBefore?: Date;
    },
    format: ExportFormat,
    options?: {
      filename?: string;
      includeMetadata?: boolean;
    }
  ): Promise<Blob | void> {
    // Build Prisma where clause
    const where: any = {};

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }

    if (filters.organization && filters.organization.length > 0) {
      where.organization = { in: filters.organization };
    }

    if (filters.relevanceMinScore !== undefined) {
      where.relevanceScore = { gte: filters.relevanceMinScore };
    }

    if (filters.deadlineAfter || filters.deadlineBefore) {
      where.deadline = {};
      if (filters.deadlineAfter) {
        where.deadline.gte = filters.deadlineAfter;
      }
      if (filters.deadlineBefore) {
        where.deadline.lte = filters.deadlineBefore;
      }
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    // Fetch filtered opportunities
    const opportunities = await this.prisma.opportunity.findMany({
      where,
      take: this.config.maxItems,
      orderBy: { createdAt: 'desc' }
    });

    return this.exportOpportunities(opportunities, format, options);
  }

  async getExportStats(): Promise<{
    totalExports: number;
    exportsByFormat: Record<ExportFormat, number>;
    largestExport: number;
    lastExport?: Date;
  }> {
    // This would typically query a database table that tracks exports
    // For now, return placeholder stats
    return {
      totalExports: 0,
      exportsByFormat: {
        csv: 0,
        json: 0
      },
      largestExport: 0,
      lastExport: undefined
    };
  }

  async generateExportTemplate(format: ExportFormat): Promise<Blob> {
    const sampleOpportunity: Partial<Opportunity> = {
      id: 'sample-id',
      title: 'Sample Art Residency',
      organization: 'Sample Arts Foundation',
      description: 'A sample opportunity description',
      url: 'https://example.com/opportunity',
      deadline: new Date(),
      status: 'new',
      type: 'residency',
      relevanceScore: 85,
      applicationFee: 50,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.exportOpportunities([sampleOpportunity as Opportunity], format, {
      includeMetadata: true
    }) as Promise<Blob>;
  }

  // Private helper methods

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private validateExportData(opportunities: Opportunity[]): void {
    if (!Array.isArray(opportunities)) {
      throw new Error('Opportunities must be an array');
    }

    if (opportunities.length === 0) {
      throw new Error('No opportunities to export');
    }

    // Validate required fields
    for (const opp of opportunities) {
      if (!opp.id) {
        throw new Error('All opportunities must have an ID');
      }
    }
  }

  private generateFilename(format: ExportFormat, customName?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseName = customName || `opportunities_export_${timestamp}`;
    
    switch (format) {
      case 'csv':
        return `${baseName}.csv`;
      case 'json':
        return `${baseName}.json`;
      default:
        return baseName;
    }
  }
}