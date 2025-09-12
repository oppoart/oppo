'use client';

import { useState } from 'react';
import { 
  Play, 
  Square, 
  Share2, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  RotateCcw,
  Heart,
  MessageCircle,
  Repeat2,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SocialMediaResult {
  platform: string;
  mention: string;
  engagement: number;
  author?: string;
  date?: string;
  url?: string;
  metrics?: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
}

interface SocialMediaColumnProps {
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: SocialMediaResult[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  disabled?: boolean;
  isMobile?: boolean;
  isFullWidth?: boolean;
  consumedQueries?: string[];
  onStart: () => void;
  onStop: () => void;
  onRetry?: () => void;
}

const platformColors: Record<string, string> = {
  twitter: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  instagram: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
  facebook: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
  linkedin: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
  tiktok: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  youtube: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

export function SocialMediaColumn({
  status,
  progress,
  results = [],
  error,
  retryCount = 0,
  maxRetries = 3,
  disabled = false,
  isMobile = false,
  isFullWidth = false,
  consumedQueries = [],
  onStart,
  onStop,
  onRetry,
}: SocialMediaColumnProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllResults, setShowAllResults] = useState(false);

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
        return 'Searching social media...';
      case 'completed':
        return 'Search completed';
      case 'error':
        return retryCount > 0 ? `Failed (${retryCount}/${maxRetries})` : 'Error';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Ready to search';
    }
  };

  const displayResults = showAllResults ? results : results.slice(0, isFullWidth ? 5 : 3);

  const formatEngagement = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Full-width layout (no card wrapper)
  if (isFullWidth) {
    return (
      <div className="w-full bg-background">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background border border-border">
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Social Media Search Results</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Search across social platforms for mentions
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
            <div className="space-y-4">
              {/* Status and Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-sm font-medium">{getStatusText()}</span>
                  </div>
                  {consumedQueries.length > 0 && (
                    <Badge variant="secondary">
                      Using {consumedQueries.length} queries
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {results.length} mentions found
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {status === 'running' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onStop}
                      disabled={disabled}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={onStart}
                        variant="default"
                        disabled={disabled || (consumedQueries.length === 0 && results.length === 0)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start Search
                      </Button>
                      {status === 'error' && onRetry && retryCount < maxRetries && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onRetry}
                          disabled={disabled}
                          title="Manual retry"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Search Progress</span>
                    <span className="text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Results Grid */}
              {results.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Social Mentions</h4>
                    {results.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllResults(!showAllResults)}
                        className="text-xs"
                      >
                        {showAllResults ? 'Show Less' : `View All (${results.length})`}
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayResults.map((result, index) => (
                      <div 
                        key={index} 
                        className="p-4 bg-background rounded-lg border hover:border-pink-400 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", platformColors[result.platform.toLowerCase()] || 'bg-gray-100')}
                          >
                            {result.platform}
                          </Badge>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>{formatEngagement(result.engagement)}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm mb-2 line-clamp-3">{result.mention}</p>
                        
                        {result.author && (
                          <p className="text-xs text-muted-foreground mb-1">@{result.author}</p>
                        )}
                        
                        {result.metrics && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {result.metrics.likes !== undefined && (
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                <span>{formatEngagement(result.metrics.likes)}</span>
                              </div>
                            )}
                            {result.metrics.comments !== undefined && (
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                <span>{formatEngagement(result.metrics.comments)}</span>
                              </div>
                            )}
                            {result.metrics.shares !== undefined && (
                              <div className="flex items-center gap-1">
                                <Repeat2 className="h-3 w-3" />
                                <span>{formatEngagement(result.metrics.shares)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {result.date && (
                          <p className="text-xs text-muted-foreground mt-1">{result.date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {results.length === 0 && status !== 'running' && (
                <div className="py-12 text-center">
                  <Share2 className="h-12 w-12 mx-auto mb-3 text-pink-600 dark:text-pink-400 opacity-30" />
                  <p className="text-muted-foreground">
                    {disabled 
                      ? 'Select a profile to start' 
                      : consumedQueries.length === 0 
                        ? 'Waiting for queries from generator' 
                        : 'Click Start to search social media'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      isMobile 
        ? "w-full flex-shrink-0 transition-all duration-200" 
        : "w-full flex-shrink-0 h-full flex flex-col transition-all duration-200",
      "bg-background",
      disabled && "opacity-50"
    )}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border border-border">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">Social Media Search</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Search across social platforms for mentions
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

        {/* Control Panel */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Status and Progress */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
              <Badge variant="secondary">
                {results.length} mentions
              </Badge>
            </div>

            {progress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Search Progress</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Query Consumption Info */}
            {consumedQueries.length > 0 && (
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs border border-blue-200 dark:border-blue-800">
                <span className="text-blue-600 dark:text-blue-400">
                  Searching {consumedQueries.length} queries on social platforms
                </span>
              </div>
            )}

            {error && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                <div className="flex items-center justify-between">
                  <span className="flex-1">{error}</span>
                  {retryCount > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({retryCount}/{maxRetries} retries)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {status === 'running' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onStop}
                  className="flex-1"
                  disabled={disabled}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={onStart}
                    className="flex-1"
                    variant="default"
                    disabled={disabled || (consumedQueries.length === 0 && results.length === 0)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start Search
                  </Button>
                  {status === 'error' && onRetry && retryCount < maxRetries && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetry}
                      disabled={disabled}
                      title="Manual retry"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      {/* Results Area */}
      {isExpanded && results.length > 0 && (
        <>
          <Separator />
          <CardContent className={cn(
            "p-4 overflow-hidden",
            isMobile ? "max-h-96" : "flex-1"
          )}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Social Mentions</h4>
              {results.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllResults(!showAllResults)}
                  className="text-xs h-7"
                >
                  {showAllResults ? 'Show Less' : `View All (${results.length})`}
                </Button>
              )}
            </div>
            
            <ScrollArea className={cn(isMobile ? "h-80" : "h-full")}>
              <div className="space-y-3">
                {displayResults.map((result, index) => (
                  <div key={index} className="p-3 bg-background rounded-lg border hover:border-pink-400 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", platformColors[result.platform.toLowerCase()] || 'bg-gray-100')}
                      >
                        {result.platform}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>{formatEngagement(result.engagement)}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-2 line-clamp-3">{result.mention}</p>
                    
                    {result.author && (
                      <p className="text-xs text-muted-foreground mb-1">@{result.author}</p>
                    )}
                    
                    {result.metrics && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {result.metrics.likes !== undefined && (
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            <span>{formatEngagement(result.metrics.likes)}</span>
                          </div>
                        )}
                        {result.metrics.comments !== undefined && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{formatEngagement(result.metrics.comments)}</span>
                          </div>
                        )}
                        {result.metrics.shares !== undefined && (
                          <div className="flex items-center gap-1">
                            <Repeat2 className="h-3 w-3" />
                            <span>{formatEngagement(result.metrics.shares)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {result.date && (
                      <p className="text-xs text-muted-foreground mt-1">{result.date}</p>
                    )}
                  </div>
                ))}
                
                {!showAllResults && results.length > 3 && (
                  <div className="text-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllResults(true)}
                      className="text-xs"
                    >
                      +{results.length - 3} more mentions
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </>
      )}

      {/* Empty State */}
      {isExpanded && results.length === 0 && status !== 'running' && (
        <CardContent className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Share2 className="h-8 w-8 mx-auto mb-2 text-pink-600 dark:text-pink-400 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {disabled 
                ? 'Select a profile to start' 
                : consumedQueries.length === 0 
                  ? 'Waiting for queries from generator' 
                  : 'Click Start to search social media'}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}