'use client';

import { useState } from 'react';
import { 
  Play, 
  Square, 
  Bookmark, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  RotateCcw,
  Rss,
  Calendar,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface BookmarkResult {
  title: string;
  url?: string;
  category: string;
  date: string;
  source: 'bookmark' | 'rss';
  description?: string;
  tags?: string[];
}

interface BookmarksColumnProps {
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: BookmarkResult[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  disabled?: boolean;
  isMobile?: boolean;
  isFullWidth?: boolean;
  onStart: () => void;
  onStop: () => void;
  onRetry?: () => void;
}

export function BookmarksColumn({
  status,
  progress,
  results = [],
  error,
  retryCount = 0,
  maxRetries = 3,
  disabled = false,
  isMobile = false,
  isFullWidth = false,
  onStart,
  onStop,
  onRetry,
}: BookmarksColumnProps) {
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
        return 'Searching bookmarks...';
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

  const displayResults = showAllResults ? results : results.slice(0, 3);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'article': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'video': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'tool': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'tutorial': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'news': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  return (
    <Card className={cn(
      isMobile 
        ? "w-full flex-shrink-0 transition-all duration-200" 
        : "w-80 flex-shrink-0 h-full flex flex-col transition-all duration-200",
      "bg-orange-50 dark:bg-orange-950/20",
      "border-orange-200 dark:border-orange-800",
      disabled && "opacity-50"
    )}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border-orange-200 dark:border-orange-800 border">
              <Bookmark className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">Bookmarks/RSS</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Search through saved bookmarks and RSS feeds
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
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                {results.length} items
              </Badge>
            </div>

            {progress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Search Progress</span>
                  <span className="text-orange-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Independent Service Info */}
            <div className="p-2 bg-orange-100/50 dark:bg-orange-900/10 rounded text-xs border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-1">
                <Rss className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                <span className="text-orange-700 dark:text-orange-300">
                  Independent search through your saved content
                </span>
              </div>
            </div>

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
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={disabled}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Search Bookmarks
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
              <h4 className="text-sm font-medium">Saved Content</h4>
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
                  <div key={index} className="p-3 bg-background rounded-lg border hover:border-orange-400 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm flex-1 line-clamp-1">{result.title}</h4>
                      <div className="flex items-center gap-1">
                        {result.source === 'rss' ? (
                          <Rss className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <Bookmark className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                    </div>
                    
                    {result.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between gap-2">
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getCategoryColor(result.category))}
                      >
                        {result.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{result.date}</span>
                      </div>
                    </div>
                    
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {result.tags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="text-xs h-5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
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
                      +{results.length - 3} more items
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
            <Bookmark className="h-8 w-8 mx-auto mb-2 text-orange-600 dark:text-orange-400 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {disabled 
                ? 'Select a profile to start' 
                : 'Click Start to search your bookmarks and RSS feeds'}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}