'use client';

import { useState } from 'react';
import { 
  Play, 
  Square, 
  Mail, 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  RotateCcw,
  Inbox,
  User,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NewsletterResult {
  subject: string;
  sender: string;
  date: string;
  preview?: string;
  category?: string;
  relevance?: number;
  keywords?: string[];
}

interface NewsletterColumnProps {
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: NewsletterResult[];
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

export function NewsletterColumn({
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
}: NewsletterColumnProps) {
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
        return 'Searching newsletters...';
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

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (relevance >= 0.6) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    if (relevance >= 0.4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  return (
    <Card className={cn(
      isMobile 
        ? "w-full flex-shrink-0 transition-all duration-200" 
        : "w-80 flex-shrink-0 h-full flex flex-col transition-all duration-200",
      "bg-indigo-50 dark:bg-indigo-950/20",
      "border-indigo-200 dark:border-indigo-800",
      disabled && "opacity-50"
    )}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border-indigo-200 dark:border-indigo-800 border">
              <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">Newsletters</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Search through newsletter archives
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
              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400">
                {results.length} newsletters
              </Badge>
            </div>

            {progress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Search Progress</span>
                  <span className="text-indigo-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Independent Service Info */}
            <div className="p-2 bg-indigo-100/50 dark:bg-indigo-900/10 rounded text-xs border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-1">
                <Inbox className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                <span className="text-indigo-700 dark:text-indigo-300">
                  Independent search through newsletter archives
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
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={disabled}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Search Archives
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
              <h4 className="text-sm font-medium">Newsletter Archives</h4>
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
                  <div key={index} className="p-3 bg-background rounded-lg border hover:border-indigo-400 transition-colors">
                    <h4 className="font-medium text-sm mb-1 line-clamp-2">{result.subject}</h4>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{result.sender}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{result.date}</span>
                      </div>
                    </div>
                    
                    {result.preview && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {result.preview}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between gap-2">
                      {result.relevance !== undefined && (
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getRelevanceColor(result.relevance))}
                        >
                          {Math.round(result.relevance * 100)}% relevant
                        </Badge>
                      )}
                      {result.category && (
                        <Badge variant="outline" className="text-xs">
                          {result.category}
                        </Badge>
                      )}
                    </div>
                    
                    {result.keywords && result.keywords.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {result.keywords.slice(0, 3).map((keyword, keyIndex) => (
                          <Badge key={keyIndex} variant="secondary" className="text-xs h-5">
                            {keyword}
                          </Badge>
                        ))}
                        {result.keywords.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{result.keywords.length - 3}
                          </span>
                        )}
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
                      +{results.length - 3} more newsletters
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
            <Mail className="h-8 w-8 mx-auto mb-2 text-indigo-600 dark:text-indigo-400 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {disabled 
                ? 'Select a profile to start' 
                : 'Click Start to search newsletter archives'}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}