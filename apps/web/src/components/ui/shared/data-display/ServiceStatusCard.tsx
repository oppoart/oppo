import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Square, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  RotateCcw 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ServiceStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped';

export interface ServiceResult {
  id: string;
  content: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ServiceStatusCardProps {
  /** Service identifier */
  id: string;
  /** Service display name */
  title: string;
  /** Service description */
  description: string;
  /** Service icon */
  icon: ReactNode;
  /** Service status */
  status: ServiceStatus;
  /** Color theme */
  color?: 'blue' | 'green' | 'purple' | 'pink' | 'orange' | 'indigo';
  /** Progress percentage (0-100) */
  progress?: number;
  /** Service results */
  results?: ServiceResult[];
  /** Error message */
  error?: string;
  /** Retry count */
  retryCount?: number;
  /** Maximum retries allowed */
  maxRetries?: number;
  /** Whether service is disabled */
  disabled?: boolean;
  /** Mobile layout optimization */
  isMobile?: boolean;
  /** Start handler */
  onStart: () => void;
  /** Stop handler */
  onStop: () => void;
  /** Retry handler */
  onRetry?: () => void;
  /** Custom result renderer */
  renderResult?: (result: ServiceResult, index: number) => ReactNode;
  /** Whether to show results section */
  showResults?: boolean;
  /** Whether card is initially expanded */
  defaultExpanded?: boolean;
  /** Custom status text */
  customStatusText?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ServiceStatusCard - Displays service status with controls and results
 * 
 * @example
 * ```tsx
 * <ServiceStatusCard
 *   id="web-search"
 *   title="Web Search"
 *   description="Search for opportunities online"
 *   icon={<Globe className="h-5 w-5" />}
 *   status="running"
 *   progress={65}
 *   color="blue"
 *   onStart={handleStart}
 *   onStop={handleStop}
 *   results={searchResults}
 * />
 * ```
 */
export function ServiceStatusCard({
  id,
  title,
  description,
  icon,
  status,
  color = 'blue',
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
  renderResult,
  showResults = true,
  defaultExpanded = true,
  customStatusText,
  className
}: ServiceStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAllResults, setShowAllResults] = useState(false);

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

  const colors = colorMap[color];

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
    if (customStatusText) return customStatusText;
    
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

  const defaultRenderResult = (result: ServiceResult, index: number) => (
    <div key={result.id || index} className="p-3 bg-background rounded-lg border">
      <pre className="text-xs overflow-auto">{JSON.stringify(result.content, null, 2)}</pre>
      {result.metadata && (
        <div className="mt-2 text-xs text-muted-foreground">
          {new Date(result.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );

  return (
    <Card className={cn(
      isMobile 
        ? "w-full flex-shrink-0 transition-all duration-200" 
        : "w-80 flex-shrink-0 h-full flex flex-col transition-all duration-200",
      colors.bg,
      colors.border,
      disabled && "opacity-50",
      className
    )}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-background", colors.border)}>
              <div className={cn(colors.icon)}>
                {icon}
              </div>
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
      {isExpanded && showResults && results.length > 0 && (
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
                {displayResults.map((result, index) => 
                  renderResult ? renderResult(result, index) : defaultRenderResult(result, index)
                )}
                
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
      {isExpanded && showResults && results.length === 0 && status !== 'running' && (
        <CardContent className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className={cn(colors.icon, "opacity-50 mb-2")}>
              {icon}
            </div>
            <p className="text-sm text-muted-foreground">
              {disabled ? 'Service disabled' : 'Click Start to begin'}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}