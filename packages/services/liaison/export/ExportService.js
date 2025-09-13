"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const events_1 = require("events");
class ExportService extends events_1.EventEmitter {
    constructor(prisma, config) {
        super();
        this.prisma = prisma;
        this.config = config;
    }
    async exportOpportunities(opportunities, format, options) {
        if (opportunities.length > this.config.maxItems) {
            throw new Error(`Export limit exceeded. Maximum ${this.config.maxItems} items allowed.`);
        }
        if (!this.config.formats.includes(format)) {
            throw new Error(`Export format '${format}' is not supported`);
        }
        let filteredOpportunities = opportunities;
        if (options?.filterByStatus && options.filterByStatus.length > 0) {
            filteredOpportunities = opportunities.filter(opp => options.filterByStatus.includes(opp.status || ''));
        }
        try {
            let result;
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
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    async exportToCSV(opportunities, options) {
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
                    row.push(this.escapeCSV(opp.tags?.join(';') || ''), this.escapeCSV(opp.notes || ''), this.escapeCSV(opp.source || ''));
                }
                return row.join(',');
            })
        ];
        const csvContent = csvRows.join('\n');
        return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }
    async exportToJSON(opportunities, options) {
        const exportData = {
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
                        tags: opp.tags || [],
                        notes: opp.notes || '',
                        source: opp.source || '',
                        metadata: opp.metadata || {}
                    };
                }
                return baseData;
            })
        };
        const jsonContent = JSON.stringify(exportData, null, 2);
        return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    }
    async exportFiltered(filters, format, options) {
        const where = {};
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
        const opportunities = await this.prisma.opportunity.findMany({
            where,
            take: this.config.maxItems,
            orderBy: { createdAt: 'desc' }
        });
        return this.exportOpportunities(opportunities, format, options);
    }
    async getExportStats() {
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
    async generateExportTemplate(format) {
        const sampleOpportunity = {
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
        return this.exportOpportunities([sampleOpportunity], format, {
            includeMetadata: true
        });
    }
    escapeCSV(value) {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
    validateExportData(opportunities) {
        if (!Array.isArray(opportunities)) {
            throw new Error('Opportunities must be an array');
        }
        if (opportunities.length === 0) {
            throw new Error('No opportunities to export');
        }
        for (const opp of opportunities) {
            if (!opp.id) {
                throw new Error('All opportunities must have an ID');
            }
        }
    }
    generateFilename(format, customName) {
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
exports.ExportService = ExportService;
//# sourceMappingURL=ExportService.js.map