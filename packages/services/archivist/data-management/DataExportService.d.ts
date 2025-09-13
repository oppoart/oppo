import { PrismaClient } from '@prisma/client';
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
export declare class DataExportService {
    private prisma;
    private exportDir;
    private backupDir;
    constructor(prisma: PrismaClient, baseDir?: string);
    exportToJSON(filters?: ExportFilters): Promise<ExportResult>;
    exportToCSV(filters?: ExportFilters): Promise<ExportResult>;
    exportToJSONL(filters?: ExportFilters): Promise<ExportResult>;
    exportToSQL(filters?: ExportFilters): Promise<ExportResult>;
    createBackup(): Promise<BackupResult>;
    restoreFromBackup(backupFilePath: string): Promise<{
        success: boolean;
        recordsRestored: number;
        tablesRestored: string[];
        errors: string[];
    }>;
    listExports(): Promise<Array<{
        filename: string;
        filepath: string;
        format: string;
        size: string;
        createdAt: Date;
    }>>;
    listBackups(): Promise<BackupResult[]>;
    cleanupOldFiles(maxAge?: number): Promise<{
        exportsDeleted: number;
        backupsDeleted: number;
    }>;
    private getOpportunitiesForExport;
    private sanitizeOpportunityForExport;
    private escapeCsvField;
    private generateInsertStatement;
    private formatFileSize;
    private ensureDirectoryExists;
    private rotateBackups;
}
