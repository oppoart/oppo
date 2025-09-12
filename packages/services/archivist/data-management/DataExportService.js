"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportService = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
class DataExportService {
    prisma;
    exportDir;
    backupDir;
    constructor(prisma, baseDir = './data') {
        this.prisma = prisma;
        this.exportDir = path.join(baseDir, 'exports');
        this.backupDir = path.join(baseDir, 'backups');
    }
    async exportToJSON(filters) {
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
        await fs_1.promises.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8');
        const stats = await fs_1.promises.stat(filepath);
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
    async exportToCSV(filters) {
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
        await fs_1.promises.writeFile(filepath, csvContent, 'utf8');
        const stats = await fs_1.promises.stat(filepath);
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
    async exportToJSONL(filters) {
        await this.ensureDirectoryExists(this.exportDir);
        const opportunities = await this.getOpportunitiesForExport(filters);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `opportunities-${timestamp}.jsonl`;
        const filepath = path.join(this.exportDir, filename);
        const jsonlContent = opportunities
            .map(opp => JSON.stringify(this.sanitizeOpportunityForExport(opp)))
            .join('\n');
        await fs_1.promises.writeFile(filepath, jsonlContent, 'utf8');
        const stats = await fs_1.promises.stat(filepath);
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
    async exportToSQL(filters) {
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
        await fs_1.promises.writeFile(filepath, sqlStatements, 'utf8');
        const stats = await fs_1.promises.stat(filepath);
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
    async createBackup() {
        await this.ensureDirectoryExists(this.backupDir);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `oppo-backup-${timestamp}.json`;
        const filepath = path.join(this.backupDir, filename);
        const [opportunities, sources, sourceLinks, duplicates, matches, discoveryJobs, aiMetrics] = await Promise.all([
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
        await fs_1.promises.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf8');
        const stats = await fs_1.promises.stat(filepath);
        const totalRecords = Object.values(backupData.metadata.recordCounts)
            .reduce((sum, count) => sum + count, 0);
        await this.rotateBackups();
        return {
            filename,
            filepath,
            size: this.formatFileSize(stats.size),
            createdAt: new Date(),
            tables: Object.keys(backupData.tables),
            recordCount: totalRecords,
            compressed: false
        };
    }
    async restoreFromBackup(backupFilePath) {
        const errors = [];
        let recordsRestored = 0;
        const tablesRestored = [];
        try {
            await fs_1.promises.access(backupFilePath);
            const backupContent = await fs_1.promises.readFile(backupFilePath, 'utf8');
            const backupData = JSON.parse(backupContent);
            if (!backupData.version || !backupData.tables) {
                throw new Error('Invalid backup format');
            }
            await this.prisma.$transaction(async (tx) => {
                await tx.aIServiceMetrics.deleteMany();
                await tx.discoveryJob.deleteMany();
                await tx.opportunityMatch.deleteMany();
                await tx.opportunityDuplicate.deleteMany();
                await tx.opportunitySourceLink.deleteMany();
                await tx.opportunity.deleteMany();
                await tx.opportunitySource.deleteMany();
                if (backupData.tables.opportunitySources) {
                    await tx.opportunitySource.createMany({
                        data: backupData.tables.opportunitySources
                    });
                    tablesRestored.push('opportunitySources');
                    recordsRestored += backupData.tables.opportunitySources.length;
                }
                if (backupData.tables.opportunities) {
                    await tx.opportunity.createMany({
                        data: backupData.tables.opportunities.map((opp) => ({
                            ...opp,
                            deadline: opp.deadline ? new Date(opp.deadline) : null,
                            discoveredAt: new Date(opp.discoveredAt),
                            lastUpdated: new Date(opp.lastUpdated)
                        }))
                    });
                    tablesRestored.push('opportunities');
                    recordsRestored += backupData.tables.opportunities.length;
                }
            });
            return {
                success: true,
                recordsRestored,
                tablesRestored,
                errors
            };
        }
        catch (error) {
            errors.push(`Restore failed: ${error}`);
            return {
                success: false,
                recordsRestored: 0,
                tablesRestored: [],
                errors
            };
        }
    }
    async listExports() {
        try {
            const files = await fs_1.promises.readdir(this.exportDir);
            const exports = [];
            for (const filename of files) {
                const filepath = path.join(this.exportDir, filename);
                const stats = await fs_1.promises.stat(filepath);
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
        }
        catch (error) {
            return [];
        }
    }
    async listBackups() {
        try {
            const files = await fs_1.promises.readdir(this.backupDir);
            const backups = [];
            for (const filename of files) {
                if (filename.endsWith('.json')) {
                    const filepath = path.join(this.backupDir, filename);
                    const stats = await fs_1.promises.stat(filepath);
                    backups.push({
                        filename,
                        filepath,
                        size: this.formatFileSize(stats.size),
                        createdAt: stats.birthtime,
                        tables: [],
                        recordCount: 0,
                        compressed: false
                    });
                }
            }
            return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        catch (error) {
            return [];
        }
    }
    async cleanupOldFiles(maxAge = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);
        let exportsDeleted = 0;
        let backupsDeleted = 0;
        try {
            const exportFiles = await fs_1.promises.readdir(this.exportDir);
            for (const filename of exportFiles) {
                const filepath = path.join(this.exportDir, filename);
                const stats = await fs_1.promises.stat(filepath);
                if (stats.birthtime < cutoffDate) {
                    await fs_1.promises.unlink(filepath);
                    exportsDeleted++;
                }
            }
        }
        catch (error) {
            console.error('Error cleaning exports:', error);
        }
        try {
            const backupFiles = await fs_1.promises.readdir(this.backupDir);
            const backupsWithStats = [];
            for (const filename of backupFiles) {
                const filepath = path.join(this.backupDir, filename);
                const stats = await fs_1.promises.stat(filepath);
                backupsWithStats.push({ filepath, createdAt: stats.birthtime });
            }
            backupsWithStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            for (let i = 5; i < backupsWithStats.length; i++) {
                await fs_1.promises.unlink(backupsWithStats[i].filepath);
                backupsDeleted++;
            }
        }
        catch (error) {
            console.error('Error cleaning backups:', error);
        }
        return { exportsDeleted, backupsDeleted };
    }
    async getOpportunitiesForExport(filters) {
        const where = {};
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
        const includeClause = {};
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
    sanitizeOpportunityForExport(opp) {
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
    escapeCsvField(field) {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
    generateInsertStatement(opp) {
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
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    async ensureDirectoryExists(dir) {
        try {
            await fs_1.promises.access(dir);
        }
        catch {
            await fs_1.promises.mkdir(dir, { recursive: true });
        }
    }
    async rotateBackups() {
        const maxBackups = 10;
        try {
            const files = await fs_1.promises.readdir(this.backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('oppo-backup-') && f.endsWith('.json'))
                .map(f => path.join(this.backupDir, f));
            if (backupFiles.length > maxBackups) {
                const filesWithStats = await Promise.all(backupFiles.map(async (f) => ({
                    path: f,
                    mtime: (await fs_1.promises.stat(f)).mtime
                })));
                filesWithStats
                    .sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
                    .slice(0, -maxBackups)
                    .forEach(async (f) => await fs_1.promises.unlink(f.path));
            }
        }
        catch (error) {
            console.error('Error rotating backups:', error);
        }
    }
}
exports.DataExportService = DataExportService;
//# sourceMappingURL=DataExportService.js.map