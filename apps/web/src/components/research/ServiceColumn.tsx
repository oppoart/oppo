'use client';

import { useState } from 'react';
import { 
  Play, 
  Square, 
  Search, 
  Globe, 
  Brain, 
  Share2, 
  Bookmark, 
  Mail,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ServiceColumnProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: any[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  disabled?: boolean;
  isMobile?: boolean;
  onStart: () => void;
  onStop: () => void;
  onRetry?: () => void;
}

const iconMap = {
  search: Search,
  globe: Globe,
  brain: Brain,
  share: Share2,
  bookmark: Bookmark,
  mail: Mail,
};

const colorMap = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    progress: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700 text-white',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    progress: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    progress: 'text-purple-600',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-950/20',
    border: 'border-pink-200 dark:border-pink-800',
    icon: 'text-pink-600 dark:text-pink-400',
    button: 'bg-pink-600 hover:bg-pink-700 text-white',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
    progress: 'text-pink-600',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700 text-white',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    progress: 'text-orange-600',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: 'text-indigo-600 dark:text-indigo-400',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    progress: 'text-indigo-600',
  },
};

export function ServiceColumn({
  id,
  title,
  description,
  icon,
  color,
  status,
  progress,
  results = [],
  error,
  retryCount = 0,
  maxRetries = 3,
  disabled = false,
  isMobile = false,
  onStart,
  onStop,
  onRetry,
}: ServiceColumnProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllResults, setShowAllResults] = useState(false);

  const IconComponent = iconMap[icon as keyof typeof iconMap] || Search;
  const colors = colorMap[color as keyof typeof colorMap] || colorMap.blue;

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
        return 'Running...';
      case 'completed':
        return 'Completed';
      case 'error':
        return retryCount > 0 ? `Failed (${retryCount}/${maxRetries})` : 'Error';
      case 'stopped':
        return 'Stopped';
      default:
        return 'Ready';
    }
  };

  const displayResults = showAllResults ? results : results.slice(0, 3);

  const renderResult = (result: any, index: number) => {
    // Handle different result types based on service
    switch (id) {
      case 'query-generation':
        return (
          <div key={index} className="p-3 bg-background rounded-lg border">
            <code className="text-sm font-mono">{result}</code>
          </div>
        );
      
      case 'web-search':
        return (
          <div key={index} className="p-3 bg-background rounded-lg border">
            <h4 className="font-medium text-sm mb-1">{result.title}</h4>
            <p className="text-xs text-muted-foreground mb-2">{result.snippet}</p>
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              {result.url}
            </a>
          </div>
        );
      
      case 'llm-search':
        return (
          <div key={index} className="p-3 bg-background rounded-lg border">
            <p className="text-sm mb-2">{result.insight}</p>
            <Badge variant="secondary" className="text-xs">
              Confidence: {Math.round(result.confidence * 100)}%
            </Badge>
          </div>
        );
      
      case 'social-media':
        return (
          <div key={index} className="p-3 bg-background rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">{result.platform}</Badge>
              <span className="text-xs text-muted-foreground">{result.engagement} engagements</span>
            </div>
            <p className="text-sm">{result.mention}</p>
          </div>
        );
      
      case 'bookmarks':
        return (
          <div key={index} className="p-3 bg-background rounded-lg border">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm">{result.title}</h4>
              <Badge variant="secondary" className="text-xs">{result.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{result.date}</p>
          </div>
        );
      
      case 'newsletters':
        return (
          <div key={index} className="p-3 bg-background rounded-lg border">
            <h4 className="font-medium text-sm mb-1">{result.subject}</h4>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{result.sender}</span>
              <span>{result.date}</span>
            </div>
          </div>
        );
      
      default:
        return (
          <div key={index} className="p-3 bg-background rounded-lg border">
            <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <Card className={cn(
      isMobile 
        ? "w-full flex-shrink-0 transition-all duration-200" 
        : "w-80 flex-shrink-0 h-full flex flex-col transition-all duration-200",
      colors.bg,
      colors.border,
      disabled && "opacity-50"
    )}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-background", colors.border)}>
              <IconComponent className={cn("h-5 w-5", colors.icon)} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
              <Badge className={colors.badge}>
                {results.length} results
              </Badge>
            </div>

            {progress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Progress</span>
                  <span className={colors.progress}>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
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
                    className={cn("flex-1", colors.button)}
                    disabled={disabled}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
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
              <h4 className="text-sm font-medium">Results</h4>
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
                {displayResults.map((result, index) => renderResult(result, index))}
                
                {!showAllResults && results.length > 3 && (
                  <div className="text-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllResults(true)}
                      className="text-xs"
                    >
                      +{results.length - 3} more results
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
            <IconComponent className={cn("h-8 w-8 mx-auto mb-2", colors.icon, "opacity-50")} />
            <p className="text-sm text-muted-foreground">
              {disabled ? 'Select a profile to start' : 'Click Start to begin research'}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}