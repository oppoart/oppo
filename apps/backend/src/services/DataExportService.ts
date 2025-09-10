import { PrismaClient, Opportunity } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { FindOpportunitiesOptions } from './repositories/OpportunityRepository';

export interface ExportFilters {
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minRelevanceScore?: number;
  tags?: string[];
  includeArchived?: boolean;
  includeSourceData?: boolean;
  includeDuplicates?: boolean;
}

export interface ExportResult {
  filename: string;
  filepath: string;
  format: ExportFormat;
  recordCount: number;
  fileSize: string;
  exportedAt: Date;
  filters?: ExportFilters;
}

export type ExportFormat = 'json' | 'csv' | 'jsonl' | 'sql';

export interface BackupResult {
  filename: string;
  filepath: string;
  size: string;
  createdAt: Date;
  tables: string[];
  recordCount: number;
  compressed: boolean;
}

export class DataExportService {
  private exportDir: string;
  private backupDir: string;

  constructor(
    private prisma: PrismaClient,
    baseDir: string = './data'
  ) {
    this.exportDir = path.join(baseDir, 'exports');
    this.backupDir = path.join(baseDir, 'backups');
  }

  // =====================================
  // Data Export Operations
  // =====================================

  /**
   * Export opportunities to JSON format
   */
  async exportToJSON(filters?: ExportFilters): Promise<ExportResult> {
    await this.ensureDirectoryExists(this.exportDir);
    
    const opportunities = await this.getOpportunitiesForExport(filters);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `opportunities-${timestamp}.json`;
    const filepath = path.join(this.exportDir, filename);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      recordCount: opportunities.length,
      filters,
      data: opportunities.map(this.sanitizeOpportunityForExport)
    };

    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8');
    
    const stats = await fs.stat(filepath);

    return {
      filename,
      filepath,
      format: 'json',
      recordCount: opportunities.length,
      fileSize: this.formatFileSize(stats.size),
      exportedAt: new Date(),
      filters
    };
  }

  /**
   * Export opportunities to CSV format
   */
  async exportToCSV(filters?: ExportFilters): Promise<ExportResult> {
    await this.ensureDirectoryExists(this.exportDir);
    
    const opportunities = await this.getOpportunitiesForExport(filters);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `opportunities-${timestamp}.csv`;
    const filepath = path.join(this.exportDir, filename);

    const headers = [
      'ID',
      'Title',
      'Organization',
      'Description',
      'URL',
      'Deadline',
      'Amount',
      'Location',
      'Tags',
      'Source Type',
      'Relevance Score',
      'Status',
      'Discovered At',
      'Starred'
    ];

    const csvContent = [
      headers.join(','),
      ...opportunities.map(opp => [
        this.escapeCsvField(opp.id),
        this.escapeCsvField(opp.title),
        this.escapeCsvField(opp.organization || ''),
        this.escapeCsvField(opp.description.substring(0, 200) + '...'),
        this.escapeCsvField(opp.url),
        opp.deadline ? opp.deadline.toISOString().split('T')[0] : '',
        this.escapeCsvField(opp.amount || ''),
        this.escapeCsvField(opp.location || ''),
        this.escapeCsvField(opp.tags.join('; ')),
        this.escapeCsvField(opp.sourceType),
        opp.relevanceScore?.toString() || '',
        this.escapeCsvField(opp.status),
        opp.discoveredAt.toISOString().split('T')[0],
        opp.starred.toString()
      ].join(','))
    ].join('\n');

    await fs.writeFile(filepath, csvContent, 'utf8');
    
    const stats = await fs.stat(filepath);

    return {
      filename,
      filepath,
      format: 'csv',
      recordCount: opportunities.length,
      fileSize: this.formatFileSize(stats.size),
      exportedAt: new Date(),
      filters
    };
  }

  /**
   * Export opportunities to JSONL format (JSON Lines)
   */
  async exportToJSONL(filters?: ExportFilters): Promise<ExportResult> {
    await this.ensureDirectoryExists(this.exportDir);
    
    const opportunities = await this.getOpportunitiesForExport(filters);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `opportunities-${timestamp}.jsonl`;
    const filepath = path.join(this.exportDir, filename);

    const jsonlContent = opportunities
      .map(opp => JSON.stringify(this.sanitizeOpportunityForExport(opp)))
      .join('\n');

    await fs.writeFile(filepath, jsonlContent, 'utf8');
    
    const stats = await fs.stat(filepath);

    return {
      filename,
      filepath,
      format: 'jsonl',
      recordCount: opportunities.length,
      fileSize: this.formatFileSize(stats.size),
      exportedAt: new Date(),
      filters
    };
  }

  /**
   * Export to SQL format (INSERT statements)
   */
  async exportToSQL(filters?: ExportFilters): Promise<ExportResult> {
    await this.ensureDirectoryExists(this.exportDir);
    
    const opportunities = await this.getOpportunitiesForExport(filters);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `opportunities-${timestamp}.sql`;
    const filepath = path.join(this.exportDir, filename);

    const sqlStatements = [
      '-- Opportunities Export',
      `-- Generated on: ${new Date().toISOString()}`,
      `-- Record count: ${opportunities.length}`,
      '',
      'BEGIN TRANSACTION;',
      '',
      ...opportunities.map(opp => this.generateInsertStatement(opp)),
      '',
      'COMMIT;'
    ].join('\n');

    await fs.writeFile(filepath, sqlStatements, 'utf8');
    
    const stats = await fs.stat(filepath);

    return {
      filename,
      filepath,
      format: 'sql',
      recordCount: opportunities.length,
      fileSize: this.formatFileSize(stats.size),
      exportedAt: new Date(),
      filters
    };
  }

  // =====================================
  // Backup Operations
  // =====================================

  /**
   * Create a full database backup
   */
  async createBackup(): Promise<BackupResult> {
    await this.ensureDirectoryExists(this.backupDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `oppo-backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    // Export all tables
    const [
      opportunities,
      sources,
      sourceLinks,
      duplicates,
      matches,
      discoveryJobs,
      aiMetrics
    ] = await Promise.all([
      this.prisma.opportunity.findMany({
        include: {
          sourceLinks: { include: { source: true } },
          matches: true,
          duplicates: true,
          duplicateOf: true
        }
      }),
      this.prisma.opportunitySource.findMany({ include: { sourceLinks: true } }),
      this.prisma.opportunitySourceLink.findMany(),
      this.prisma.opportunityDuplicate.findMany(),
      this.prisma.opportunityMatch.findMany(),
      this.prisma.discoveryJob.findMany(),
      this.prisma.aIServiceMetrics.findMany()
    ]);

    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      tables: {
        opportunities: opportunities.map(this.sanitizeOpportunityForExport),
        opportunitySources: sources,
        opportunitySourceLinks: sourceLinks,
        opportunityDuplicates: duplicates,
        opportunityMatches: matches,
        discoveryJobs: discoveryJobs,
        aiServiceMetrics: aiMetrics
      },
      metadata: {
        recordCounts: {
          opportunities: opportunities.length,
          sources: sources.length,
          sourceLinks: sourceLinks.length,
          duplicates: duplicates.length,
          matches: matches.length,
          discoveryJobs: discoveryJobs.length,
          aiMetrics: aiMetrics.length
        }
      }
    };

    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf8');
    
    const stats = await fs.stat(filepath);
    const totalRecords = Object.values(backupData.metadata.recordCounts)
      .reduce((sum, count) => sum + count, 0);

    // Rotate old backups
    await this.rotateBackups();

    return {
      filename,
      filepath,
      size: this.formatFileSize(stats.size),
      createdAt: new Date(),
      tables: Object.keys(backupData.tables),
      recordCount: totalRecords,
      compressed: false // Could add compression later
    };
  }

  /**
   * Restore from backup file
   */
  async restoreFromBackup(backupFilePath: string): Promise<{
    success: boolean;
    recordsRestored: number;
    tablesRestored: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    let recordsRestored = 0;
    const tablesRestored: string[] = [];

    try {
      // Validate backup file exists
      await fs.access(backupFilePath);
      
      // Read and parse backup
      const backupContent = await fs.readFile(backupFilePath, 'utf8');
      const backupData = JSON.parse(backupContent);

      // Validate backup format
      if (!backupData.version || !backupData.tables) {
        throw new Error('Invalid backup format');
      }

      // Start transaction for restore
      await this.prisma.$transaction(async (tx) => {
        // Clear existing data (careful!)
        await tx.aIServiceMetrics.deleteMany();
        await tx.discoveryJob.deleteMany();
        await tx.opportunityMatch.deleteMany();
        await tx.opportunityDuplicate.deleteMany();
        await tx.opportunitySourceLink.deleteMany();
        await tx.opportunity.deleteMany();
        await tx.opportunitySource.deleteMany();

        // Restore data in dependency order
        if (backupData.tables.opportunitySources) {
          await tx.opportunitySource.createMany({
            data: backupData.tables.opportunitySources
          });
          tablesRestored.push('opportunitySources');
          recordsRestored += backupData.tables.opportunitySources.length;
        }

        if (backupData.tables.opportunities) {
          await tx.opportunity.createMany({
            data: backupData.tables.opportunities.map((opp: any) => ({
              ...opp,
              deadline: opp.deadline ? new Date(opp.deadline) : null,
              discoveredAt: new Date(opp.discoveredAt),
              lastUpdated: new Date(opp.lastUpdated)
            }))
          });
          tablesRestored.push('opportunities');
          recordsRestored += backupData.tables.opportunities.length;
        }

        // Restore other tables...
        // (Implementation would continue for all tables)
      });

      return {
        success: true,
        recordsRestored,
        tablesRestored,
        errors
      };

    } catch (error) {
      errors.push(`Restore failed: ${error}`);
      return {
        success: false,
        recordsRestored: 0,
        tablesRestored: [],
        errors
      };
    }
  }

  // =====================================
  // Export Management
  // =====================================

  /**
   * List all available exports
   */
  async listExports(): Promise<Array<{
    filename: string;
    filepath: string;
    format: string;
    size: string;
    createdAt: Date;
  }>> {
    try {
      const files = await fs.readdir(this.exportDir);
      const exports = [];

      for (const filename of files) {
        const filepath = path.join(this.exportDir, filename);
        const stats = await fs.stat(filepath);
        
        const format = path.extname(filename).slice(1) || 'unknown';
        
        exports.push({
          filename,
          filepath,
          format,
          size: this.formatFileSize(stats.size),
          createdAt: stats.birthtime
        });
      }

      return exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupResult[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const filename of files) {
        if (filename.endsWith('.json')) {
          const filepath = path.join(this.backupDir, filename);
          const stats = await fs.stat(filepath);
          
          backups.push({
            filename,
            filepath,
            size: this.formatFileSize(stats.size),
            createdAt: stats.birthtime,
            tables: [], // Would need to read file to get actual table list
            recordCount: 0, // Would need to read file to get actual count
            compressed: false
          });
        }
      }

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete old exports and backups
   */
  async cleanupOldFiles(maxAge: number = 30): Promise<{
    exportsDeleted: number;
    backupsDeleted: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    let exportsDeleted = 0;
    let backupsDeleted = 0;

    // Clean exports
    try {
      const exportFiles = await fs.readdir(this.exportDir);
      for (const filename of exportFiles) {
        const filepath = path.join(this.exportDir, filename);
        const stats = await fs.stat(filepath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filepath);
          exportsDeleted++;
        }
      }
    } catch (error) {
      console.error('Error cleaning exports:', error);
    }

    // Clean backups (keep at least 5 most recent)
    try {
      const backupFiles = await fs.readdir(this.backupDir);
      const backupsWithStats = [];
      
      for (const filename of backupFiles) {
        const filepath = path.join(this.backupDir, filename);
        const stats = await fs.stat(filepath);
        backupsWithStats.push({ filepath, createdAt: stats.birthtime });
      }
      
      // Sort by creation date, newest first
      backupsWithStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Delete old backups (keep 5 most recent)
      for (let i = 5; i < backupsWithStats.length; i++) {
        await fs.unlink(backupsWithStats[i].filepath);
        backupsDeleted++;
      }
    } catch (error) {
      console.error('Error cleaning backups:', error);
    }

    return { exportsDeleted, backupsDeleted };
  }

  // =====================================
  // Private Helper Methods
  // =====================================

  /**
   * Get opportunities for export based on filters
   */
  private async getOpportunitiesForExport(filters?: ExportFilters): Promise<Opportunity[]> {
    const where: any = {};

    if (filters) {
      if (filters.status?.length) {
        where.status = { in: filters.status };
      }

      if (filters.dateRange) {
        where.discoveredAt = {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        };
      }

      if (filters.minRelevanceScore !== undefined) {
        where.relevanceScore = { gte: filters.minRelevanceScore };
      }

      if (filters.tags?.length) {
        where.tags = { hasSome: filters.tags };
      }

      if (!filters.includeArchived) {
        where.status = { not: 'archived' };
      }
    }

    const includeClause: any = {};
    
    if (filters?.includeSourceData) {
      includeClause.sourceLinks = {
        include: { source: true }
      };
    }

    if (filters?.includeDuplicates) {
      includeClause.duplicates = true;
      includeClause.duplicateOf = true;
    }

    return await this.prisma.opportunity.findMany({
      where,
      include: includeClause,
      orderBy: { discoveredAt: 'desc' }
    });
  }

  /**
   * Sanitize opportunity data for export
   */
  private sanitizeOpportunityForExport(opp: any) {
    return {
      id: opp.id,
      title: opp.title,
      organization: opp.organization,
      description: opp.description,
      url: opp.url,
      deadline: opp.deadline?.toISOString(),
      amount: opp.amount,
      location: opp.location,
      tags: opp.tags,
      sourceType: opp.sourceType,
      relevanceScore: opp.relevanceScore,
      status: opp.status,
      applied: opp.applied,
      starred: opp.starred,
      discoveredAt: opp.discoveredAt.toISOString(),
      lastUpdated: opp.lastUpdated.toISOString()
    };
  }

  /**
   * Escape CSV field
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Generate SQL INSERT statement
   */
  private generateInsertStatement(opp: any): string {
    const values = [
      `'${opp.id}'`,
      `'${opp.title.replace(/'/g, "''")}'`,
      opp.organization ? `'${opp.organization.replace(/'/g, "''")}'` : 'NULL',
      `'${opp.description.replace(/'/g, "''")}'`,
      `'${opp.url}'`,
      opp.deadline ? `'${opp.deadline.toISOString()}'` : 'NULL',
      opp.amount ? `'${opp.amount}'` : 'NULL',
      opp.location ? `'${opp.location.replace(/'/g, "''")}'` : 'NULL',
      `'${JSON.stringify(opp.tags)}'`,
      `'${opp.sourceType}'`,
      opp.relevanceScore || 'NULL',
      `'${opp.status}'`,
      opp.applied ? 'true' : 'false',
      opp.starred ? 'true' : 'false',
      `'${opp.discoveredAt.toISOString()}'`,
      `'${opp.lastUpdated.toISOString()}'`
    ];

    return `INSERT INTO opportunities (id, title, organization, description, url, deadline, amount, location, tags, "sourceType", "relevanceScore", status, applied, starred, "discoveredAt", "lastUpdated") VALUES (${values.join(', ')});`;
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Rotate old backup files
   */
  private async rotateBackups(): Promise<void> {
    // Keep only the 10 most recent backups
    const maxBackups = 10;
    
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('oppo-backup-') && f.endsWith('.json'))
        .map(f => path.join(this.backupDir, f));
      
      if (backupFiles.length > maxBackups) {
        // Sort by modification time, oldest first
        const filesWithStats = await Promise.all(
          backupFiles.map(async f => ({
            path: f,
            mtime: (await fs.stat(f)).mtime
          }))
        );
        
        filesWithStats
          .sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
          .slice(0, -maxBackups)
          .forEach(async f => await fs.unlink(f.path));
      }
    } catch (error) {
      console.error('Error rotating backups:', error);
    }
  }
}