'use client';

import { useState } from 'react';
import { 
  Play, 
  Square, 
  Search, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  RotateCcw,
  Sparkles,
  Globe,
  Brain,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface QueryGenerationColumnProps {
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: string[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  disabled?: boolean;
  isMobile?: boolean;
  generatedQueries?: {
    web: string[];
    llm: string[];
    social: string[];
  };
  onStart: () => void;
  onStop: () => void;
  onRetry?: () => void;
  onQueryGenerated?: (type: 'web' | 'llm' | 'social', queries: string[]) => void;
}

export function QueryGenerationColumn({
  status,
  progress,
  results = [],
  error,
  retryCount = 0,
  maxRetries = 3,
  disabled = false,
  isMobile = false,
  generatedQueries = { web: [], llm: [], social: [] },
  onStart,
  onStop,
  onRetry,
  onQueryGenerated,
}: QueryGenerationColumnProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeQueryType, setActiveQueryType] = useState<'web' | 'llm' | 'social' | null>(null);
  const [showAllResults, setShowAllResults] = useState<Record<string, boolean>>({
    web: false,
    llm: false,
    social: false
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return activeQueryType ? `Generating ${activeQueryType} queries...` : 'Generating queries...';
      case 'completed':
        return 'Generation completed';
      case 'error':
        return retryCount > 0 ? `Failed (${retryCount}/${maxRetries})` : 'Error';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Ready to generate';
    }
  };

  const handleGenerateQueries = (type: 'web' | 'llm' | 'social') => {
    setActiveQueryType(type);
    // Simulate generating type-specific queries
    const mockQueries = generateMockQueries(type);
    if (onQueryGenerated) {
      onQueryGenerated(type, mockQueries);
    }
  };

  const generateMockQueries = (type: 'web' | 'llm' | 'social'): string[] => {
    // In production, this would call the actual API
    const baseQueries = results.length > 0 ? results : [
      'latest trends',
      'upcoming events',
      'industry news',
      'market analysis',
      'competitor insights'
    ];

    const prefixes: Record<string, string> = {
      web: 'site:',
      llm: 'analyze:',
      social: '@'
    };

    return baseQueries.map(q => `${prefixes[type]}${q}`);
  };

  const querySubsections = [
    {
      id: 'web',
      title: 'Web Search Queries',
      icon: Globe,
      color: 'green',
      queries: generatedQueries.web
    },
    {
      id: 'llm',
      title: 'LLM Search Queries',
      icon: Brain,
      color: 'purple',
      queries: generatedQueries.llm
    },
    {
      id: 'social',
      title: 'Social Media Queries',
      icon: Users,
      color: 'red',
      queries: generatedQueries.social
    }
  ];

  return (
    <div className="w-full">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border-blue-200 dark:border-blue-800 border">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Search Query Generation</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate optimized queries for each search service
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <>
            {/* Master Controls - Moved to top */}
            <div className="flex gap-2 mb-6">
              {status === 'running' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onStop}
                  className="flex-1"
                  disabled={disabled}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop All Generation
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={onStart}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={disabled}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Generate All Queries
                  </Button>
                  {status === 'error' && onRetry && retryCount < maxRetries && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetry}
                      disabled={disabled}
                      title="Retry generation"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between mb-6 p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  Total: {generatedQueries.web.length + generatedQueries.llm.length + generatedQueries.social.length} queries
                </Badge>
                {error && (
                  <Badge variant="destructive">
                    Error: {error}
                  </Badge>
                )}
              </div>
            </div>

            {/* Query Subsections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {querySubsections.map((subsection) => {
                const Icon = subsection.icon;
                const queries = subsection.queries || [];
                const displayQueries = showAllResults[subsection.id] ? queries : queries.slice(0, 3);

                return (
                  <div
                    key={subsection.id}
                    className="rounded-lg border p-4 bg-background transition-all duration-200 h-full flex flex-col"
                  >
                    {/* Subsection Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-sm">{subsection.title}</h3>
                    </div>

                    {/* Generate Button */}
                    <Button
                      size="sm"
                      onClick={() => handleGenerateQueries(subsection.id as 'web' | 'llm' | 'social')}
                      className="w-full mb-3"
                      variant="outline"
                      disabled={disabled || status === 'running'}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Generate
                    </Button>

                    {/* Query List */}
                    <div className="flex-1 flex flex-col">
                      {queries.length > 0 ? (
                        <div className="space-y-2 flex-1 flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {queries.length} queries ready
                            </span>
                            {queries.length > 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllResults(prev => ({
                                  ...prev,
                                  [subsection.id]: !prev[subsection.id]
                                }))}
                                className="h-6 text-xs px-2"
                              >
                                {showAllResults[subsection.id] ? 'Show Less' : 'Show All'}
                              </Button>
                            )}
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="space-y-1">
                              {displayQueries.map((query, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-background/50 rounded text-xs font-mono truncate"
                                  title={query}
                                >
                                  {query}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-xs text-muted-foreground text-center">
                            No queries generated yet.<br />
                            Click Generate to create queries.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Connection Indicator */}
                    <div className="mt-3 pt-3 border-t border-muted">
                      <div className="flex items-center gap-1">
                        <div className={cn("w-2 h-2 rounded-full", 
                          queries.length > 0 ? 'bg-green-500' : 'bg-muted-foreground'
                        )} />
                        <span className="text-xs text-muted-foreground">
                          {subsection.id === 'web' && 'Feeds Web Search'}
                          {subsection.id === 'llm' && 'Feeds LLM Search'}
                          {subsection.id === 'social' && 'Feeds Social Media'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            {progress !== undefined && (
              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Overall Progress</span>
                  <span className="text-blue-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}