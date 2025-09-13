'use client';

import { useState } from 'react';
import { Download, FileText, Code, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface ExportFilters {
  status?: string[];
  type?: string[];
  organization?: string[];
  relevanceMinScore?: number;
  deadlineAfter?: string;
  deadlineBefore?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  filename?: string;
  includeMetadata?: boolean;
}

interface ExportDialogProps {
  trigger: React.ReactNode;
  onExport?: (filters: ExportFilters, options: ExportOptions) => Promise<void>;
  isExporting?: boolean;
}

export function ExportDialog({ trigger, onExport, isExporting = false }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [filename, setFilename] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [filters, setFilters] = useState<ExportFilters>({});
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const exportOptions: ExportOptions = {
        format,
        filename: filename || `opportunities_${new Date().toISOString().split('T')[0]}.${format}`,
        includeMetadata
      };

      await onExport?.(filters, exportOptions);
      
      toast({
        title: 'Export started',
        description: `Your opportunities are being exported as ${format.toUpperCase()}.`,
      });
      
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export opportunities',
        variant: 'destructive',
      });
    }
  };

  const handleFilterChange = (key: keyof ExportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Opportunities
          </DialogTitle>
          <DialogDescription>
            Configure your export settings and filters to download opportunities data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={format === 'csv' ? 'default' : 'outline'}
                onClick={() => setFormat('csv')}
                className="flex items-center gap-2 justify-start h-auto p-4"
              >
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-muted-foreground">
                    Spreadsheet compatible
                  </div>
                </div>
              </Button>
              <Button
                type="button"
                variant={format === 'json' ? 'default' : 'outline'}
                onClick={() => setFormat('json')}
                className="flex items-center gap-2 justify-start h-auto p-4"
              >
                <Code className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-muted-foreground">
                    API/developer friendly
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* File Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">File Options</Label>
            <div className="space-y-3">
              <div>
                <Label htmlFor="filename" className="text-xs text-muted-foreground">
                  Custom filename (optional)
                </Label>
                <Input
                  id="filename"
                  placeholder={`opportunities_${new Date().toISOString().split('T')[0]}.${format}`}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata" className="text-sm">
                  Include metadata (export date, version, etc.)
                </Label>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filters (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto p-1 text-xs"
              >
                Clear all
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={filters.status?.[0] || ''}
                  onValueChange={(value) => 
                    handleFilterChange('status', value ? [value] : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="applying">Applying</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={filters.type?.[0] || ''}
                  onValueChange={(value) => 
                    handleFilterChange('type', value ? [value] : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="grant">Grant</SelectItem>
                    <SelectItem value="residency">Residency</SelectItem>
                    <SelectItem value="exhibition">Exhibition</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="fellowship">Fellowship</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Relevance Score Filter */}
              <div>
                <Label className="text-xs text-muted-foreground">Min Relevance Score</Label>
                <Select
                  value={filters.relevanceMinScore?.toString() || ''}
                  onValueChange={(value) => 
                    handleFilterChange('relevanceMinScore', value ? parseFloat(value) : undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any relevance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any relevance</SelectItem>
                    <SelectItem value="0.5">50%+</SelectItem>
                    <SelectItem value="0.7">70%+</SelectItem>
                    <SelectItem value="0.8">80%+</SelectItem>
                    <SelectItem value="0.9">90%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Organization Filter */}
              <div>
                <Label className="text-xs text-muted-foreground">Organization</Label>
                <Input
                  placeholder="Filter by organization"
                  value={filters.organization?.[0] || ''}
                  onChange={(e) => 
                    handleFilterChange('organization', e.target.value ? [e.target.value] : undefined)
                  }
                />
              </div>

              {/* Deadline Filters */}
              <div>
                <Label className="text-xs text-muted-foreground">Deadline After</Label>
                <Input
                  type="date"
                  value={filters.deadlineAfter || ''}
                  onChange={(e) => handleFilterChange('deadlineAfter', e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Deadline Before</Label>
                <Input
                  type="date"
                  value={filters.deadlineBefore || ''}
                  onChange={(e) => handleFilterChange('deadlineBefore', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="min-w-[120px]"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}