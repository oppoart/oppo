'use client';

import { useState, useEffect } from 'react';
import { Play, Sparkles, Database, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { profileApi, analystApi } from '@/lib/api';
import { TemplatePreview } from './TemplatePreview';

export interface GenerationMetadata {
  method: 'template' | 'ai';
  totalQueries: number;
  processingTimeMs?: number;
  stats?: {
    templatesCoverage?: number;
    queriesByGroup?: Record<string, number>;
    aiServiceUsed?: string;
  };
}

export interface QueryGenerationWidgetProps {
  profileId: string;
  sourceType: 'websearch' | 'llm' | 'social-media';
  onQueriesGenerated: (queries: string[], metadata?: GenerationMetadata) => void;
  defaultMethod?: 'template' | 'ai';
  className?: string;
}

interface ExpansionPreview {
  totalTemplates: number;
  totalCombinations: number;
  estimatedQueries: number;
  parameterBreakdown: Record<string, number>;
}

export function QueryGenerationWidget({
  profileId,
  sourceType,
  onQueriesGenerated,
  defaultMethod = 'template',
  className = ''
}: QueryGenerationWidgetProps) {
  const [method, setMethod] = useState<'template' | 'ai'>(defaultMethod);
  const [maxQueries, setMaxQueries] = useState(10);
  const [preview, setPreview] = useState<ExpansionPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const { toast } = useToast();

  // Load preview when template method is selected or profile changes
  useEffect(() => {
    if (method === 'template' && profileId) {
      loadPreview();
    }
  }, [method, profileId]);

  // Reload preview when profileId changes
  useEffect(() => {
    if (profileId) {
      setPreview(null); // Clear previous preview
      if (method === 'template') {
        loadPreview();
      }
    }
  }, [profileId]);

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const previewData = await profileApi.getExpansionPreview(profileId);
      setPreview(previewData);
    } catch (error: any) {
      console.error('Failed to load preview:', error);
      toast({
        title: 'Failed to Load Preview',
        description: error.message || 'Could not load query generation preview',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      if (method === 'template') {
        // Template expansion
        const result = await profileApi.getExpandedQueries(profileId, {
          limit: 100 // Get all queries
        });

        const queries = result.queries.map(q => q.expanded);
        const metadata: GenerationMetadata = {
          method: 'template',
          totalQueries: queries.length,
          stats: {
            templatesCoverage: result.stats.coverageScore,
            queriesByGroup: result.stats.queriesByGroup
          }
        };

        onQueriesGenerated(queries, metadata);

        toast({
          title: 'Queries Generated',
          description: `Generated ${queries.length} queries from ${result.stats.totalTemplates} templates`
        });
      } else {
        // AI generation
        const result = await analystApi.generateQueries(profileId, {
          maxQueries,
          sourceTypes: [sourceType]
        });

        const metadata: GenerationMetadata = {
          method: 'ai',
          totalQueries: result.queries.length,
          stats: {
            aiServiceUsed: 'openai'
          }
        };

        onQueriesGenerated(result.queries, metadata);

        toast({
          title: 'Queries Generated',
          description: `Generated ${result.queries.length} AI-powered queries`
        });
      }
    } catch (error: any) {
      console.error('Query generation error:', error);
      toast({
        title: 'Query Generation Failed',
        description: error.message || 'Failed to generate queries. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Compact Header with Method Selector */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Query Generation</span>
        <div className="flex items-center gap-2">
          {/* Method Toggle */}
          <Select value={method} onValueChange={(value) => setMethod(value as 'template' | 'ai')}>
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="template">
                <div className="flex items-center gap-1.5">
                  <Database className="h-3 w-3" />
                  <span>Template</span>
                </div>
              </SelectItem>
              <SelectItem value="ai">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  <span>AI</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* AI Max Queries */}
          {method === 'ai' && (
            <Select value={maxQueries.toString()} onValueChange={(v) => setMaxQueries(Number(v))}>
              <SelectTrigger className="h-7 w-[60px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (method === 'template' && !preview)}
            size="sm"
            className="h-7 px-3 text-xs"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Compact Preview */}
      {method === 'template' && preview && (
        <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-medium flex items-center gap-1">
              {preview.totalTemplates} templates • ~{preview.estimatedQueries} queries
              <span className="inline-flex items-center cursor-help group relative">
                <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2 top-0 w-64 bg-popover text-popover-foreground text-[11px] leading-relaxed p-2.5 rounded-md shadow-xl border z-50">
                  <div className="font-semibold mb-1">Estimated Maximum</div>
                  <div className="space-y-1">
                    <div>• Based on {preview.totalTemplates} templates × {preview.totalCombinations} parameter combinations</div>
                    <div>• Actual count will be lower due to:</div>
                    <div className="pl-3 text-[10px] space-y-0.5 text-muted-foreground">
                      <div>- Duplicate query removal</div>
                      <div>- Templates without matching parameters</div>
                      <div>- Incomplete parameter coverage</div>
                    </div>
                  </div>
                </div>
              </span>
            </span>
          </div>
          {preview.estimatedQueries > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(preview.parameterBreakdown).map(([key, count]) => (
                count > 0 && (
                  <span key={key} className="inline-flex items-center text-[10px] bg-background px-1.5 py-0.5 rounded">
                    {key.replace(/([A-Z])/g, ' $1').trim()}: {count}
                  </span>
                )
              ))}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground/70 italic">
            Final count excludes duplicates and incomplete matches
          </div>
        </div>
      )}

      {method === 'ai' && (
        <div className="text-[10px] text-muted-foreground px-2">
          Uses GPT-4 for creative queries
        </div>
      )}
    </div>
  );
}
