'use client';

import { useState } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  Settings,
  BarChart3,
  Zap,
  RefreshCw,
  Download,
  ExternalLink,
  Calendar,
  Tag,
  Rss,
  Bookmark,
  Star
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
  isStarred?: boolean;
}

interface ProcessPanelProps {
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: BookmarkResult[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  disabled?: boolean;
  selectedBookmark?: BookmarkResult | null;
  onStart: () => void;
  onStop: () => void;
  onRetry?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

export function ProcessPanel({
  status,
  progress,
  results = [],
  error,
  retryCount = 0,
  maxRetries = 3,
  disabled = false,
  selectedBookmark,
  onStart,
  onStop,
  onRetry,
  onExport,
  onRefresh
}: ProcessPanelProps) {
  const [activeTab, setActiveTab] = useState<'process' | 'details' | 'analytics'>('process');

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Activity className="h-5 w-5 animate-spin text-orange-600" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Searching bookmarks...';
      case 'completed':
        return 'Search completed';
      case 'error':
        return retryCount > 0 ? `Failed (${retryCount}/${maxRetries})` : 'Error occurred';
      case 'stopped':
        return 'Process stopped';
      default:
        return 'Ready to search';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-orange-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.category] = (stats[result.category] || 0) + 1;
    });
    return stats;
  };

  const getSourceStats = () => {
    const bookmarkCount = results.filter(r => r.source === 'bookmark').length;
    const rssCount = results.filter(r => r.source === 'rss').length;
    return { bookmarkCount, rssCount };
  };

  const categoryStats = getCategoryStats();
  const sourceStats = getSourceStats();

  return (
    <Card className="h-full flex flex-col bg-background">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">Process Control</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Manage bookmark search and analysis
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-muted rounded-lg p-1">
          {[
            { id: 'process', label: 'Process', icon: Settings },
            { id: 'details', label: 'Details', icon: BarChart3 },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 h-8 text-xs",
                activeTab === tab.id 
                  ? "bg-orange-600 hover:bg-orange-700 text-white" 
                  : "hover:bg-orange-100 dark:hover:bg-orange-900/20"
              )}
            >
              <tab.icon className="h-3 w-3 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Process Tab */}
            {activeTab === 'process' && (
              <div className="space-y-4">
                {/* Status Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <span className={cn("text-sm font-medium", getStatusColor())}>
                        {getStatusText()}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {results.length} items
                    </Badge>
                  </div>

                  {progress !== undefined && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Search Progress</span>
                        <span className="text-orange-600 font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium mb-1">Error Details</p>
                          <p className="text-muted-foreground">{error}</p>
                          {retryCount > 0 && (
                            <p className="text-muted-foreground mt-1">
                              Retry attempt: {retryCount}/{maxRetries}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="space-y-2">
                  {status === 'running' ? (
                    <Button
                      variant="outline"
                      onClick={onStop}
                      className="w-full"
                      disabled={disabled}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop Process
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={onStart}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        disabled={disabled}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Search
                      </Button>
                      
                      {status === 'error' && onRetry && retryCount < maxRetries && (
                        <Button
                          variant="outline"
                          onClick={onRetry}
                          className="w-full"
                          disabled={disabled}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry ({maxRetries - retryCount} left)
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {onRefresh && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        className="flex-1"
                        disabled={disabled}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                    )}
                    {onExport && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onExport}
                        className="flex-1"
                        disabled={disabled || results.length === 0}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    )}
                  </div>
                </div>

                {/* Service Info */}
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-2">
                    <Rss className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-orange-700 dark:text-orange-300 mb-1">
                        Independent Search Service
                      </p>
                      <p className="text-orange-600 dark:text-orange-400">
                        Searches through your saved bookmarks and RSS feeds independently of other services.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {selectedBookmark ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="font-medium text-sm flex-1">{selectedBookmark.title}</h4>
                        <div className="flex items-center gap-1">
                          {selectedBookmark.isStarred && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                          {selectedBookmark.source === 'rss' ? (
                            <Rss className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Bookmark className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                      </div>
                      
                      {selectedBookmark.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {selectedBookmark.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge 
                          variant="secondary" 
                          className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                        >
                          {selectedBookmark.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(selectedBookmark.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {selectedBookmark.tags && selectedBookmark.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {selectedBookmark.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs h-5">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {selectedBookmark.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => window.open(selectedBookmark.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Link
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bookmark className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Select a bookmark to view details
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-lg font-semibold text-orange-600">{results.length}</div>
                    <div className="text-xs text-muted-foreground">Total Items</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <div className="text-lg font-semibold text-orange-600">{Object.keys(categoryStats).length}</div>
                    <div className="text-xs text-muted-foreground">Categories</div>
                  </div>
                </div>

                {/* Source Distribution */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Source Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">Bookmarks</span>
                      </div>
                      <Badge variant="outline">{sourceStats.bookmarkCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Rss className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">RSS Feeds</span>
                      </div>
                      <Badge variant="outline">{sourceStats.rssCount}</Badge>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Categories</h4>
                  <div className="space-y-2">
                    {Object.entries(categoryStats).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Activity</h4>
                  <div className="text-xs text-muted-foreground">
                    <p>Last search: {status === 'completed' ? 'Just now' : 'Never'}</p>
                    <p>Items found: {results.length}</p>
                    <p>Success rate: {status === 'completed' ? '100%' : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

