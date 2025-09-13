import { PrismaClient, Opportunity } from '@prisma/client';
import { EventEmitter } from 'events';
import { LiaisonConfig, ExportFormat } from '../types';
export declare class ExportService extends EventEmitter {
    private prisma;
    private config;
    constructor(prisma: PrismaClient, config: LiaisonConfig['export']);
    exportOpportunities(opportunities: Opportunity[], format: ExportFormat, options?: {
        filename?: string;
        includeMetadata?: boolean;
        filterByStatus?: string[];
    }): Promise<Blob | void>;
    exportToCSV(opportunities: Opportunity[], options?: {
        includeMetadata?: boolean;
    }): Promise<Blob>;
    exportToJSON(opportunities: Opportunity[], options?: {
        includeMetadata?: boolean;
    }): Promise<Blob>;
    exportFiltered(filters: {
        status?: string[];
        type?: string[];
        organization?: string[];
        relevanceMinScore?: number;
        deadlineAfter?: Date;
        deadlineBefore?: Date;
        createdAfter?: Date;
        createdBefore?: Date;
    }, format: ExportFormat, options?: {
        filename?: string;
        includeMetadata?: boolean;
    }): Promise<Blob | void>;
    getExportStats(): Promise<{
        totalExports: number;
        exportsByFormat: Record<ExportFormat, number>;
        largestExport: number;
        lastExport?: Date;
    }>;
    generateExportTemplate(format: ExportFormat): Promise<Blob>;
    private escapeCSV;
    private validateExportData;
    private generateFilename;
}
