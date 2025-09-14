'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ChevronDown, Calendar, MapPin, Loader2, Plus, ThumbsUp, ThumbsDown, Eye, BookOpen, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Opportunity } from '@/types/analyst';
import { opportunityApi, liaisonApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { addOpportunityToTasks, isOpportunityInTasks } from '@/utils/tasks';
import { ExportDialog, ExportFilters, ExportOptions } from '@/components/opportunities/ExportDialog';
import { useWebSocket } from '@/lib/websocket';

const ITEMS_PER_PAGE = 10;

interface OpportunityFilters {
  search?: string;
  type?: string;
  minRelevanceScore?: number;
  deadlineBefore?: string;
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [error, setError] = useState<string | null>(null);
  const [likedOpportunities, setLikedOpportunities] = useState<Set<string>>(new Set());
  const [dislikedOpportunities, setDislikedOpportunities] = useState<Set<string>>(new Set());
  const [backlogOpportunities, setBacklogOpportunities] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Load backlog state from tasks on mount
  useEffect(() => {
    const loadBacklogState = () => {
      const backlogIds = new Set<string>();
      opportunities.forEach(opportunity => {
        if (isOpportunityInTasks(opportunity.id)) {
          backlogIds.add(opportunity.id);
        }
      });
      setBacklogOpportunities(backlogIds);
    };
    
    if (opportunities.length > 0) {
      loadBacklogState();
    }
  }, [opportunities]);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  // WebSocket integration for real-time updates
  const { connected } = useWebSocket(undefined, {
    autoConnect: true, // Re-enabled with native WebSocket backend
    onConnected: () => {
      console.log('Connected to OPPO WebSocket server');
    },
    onDisconnected: () => {
      console.log('Disconnected from OPPO WebSocket server');
    },
    onOpportunityAdded: (opportunity: Opportunity) => {
      console.log('New opportunity added:', opportunity);
      setOpportunities(prev => [opportunity, ...prev]);
      toast({
        title: 'New opportunity found!',
        description: `${opportunity.title} has been added to your opportunities.`,
      });
    },
    onOpportunityUpdated: (opportunity: Opportunity) => {
      console.log('Opportunity updated:', opportunity);
      setOpportunities(prev => 
        prev.map(opp => opp.id === opportunity.id ? opportunity : opp)
      );
      toast({
        title: 'Opportunity updated',
        description: `${opportunity.title} has been updated.`,
      });
    },
    onSyncCompleted: (data: any) => {
      console.log('Sync completed:', data);
      if (data.count > 0) {
        toast({
          title: 'Sync completed',
          description: `${data.count} opportunities were synchronized.`,
        });
        // Refresh the list to show any new opportunities
        loadOpportunities(true);
      }
    },
    onError: (error: Error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop !== 
      document.documentElement.offsetHeight ||
      loadingMore ||
      !hasMore
    ) {
      return;
    }
    loadMoreOpportunities();
  }, [loadingMore, hasMore]);

  // Load initial opportunities
  const loadOpportunities = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOpportunities([]);
        setPage(1);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);

      const response = await opportunityApi.getOpportunities({
        page: reset ? 1 : page,
        limit: ITEMS_PER_PAGE,
        ...processFilters(filters)
      });

      if (reset) {
        setOpportunities(response.data);
      } else {
        setOpportunities(prev => [...prev, ...response.data]);
      }

      setHasMore(response.data.length === ITEMS_PER_PAGE);
      setPage(prev => reset ? 2 : prev + 1);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load opportunities';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more opportunities for infinite scroll
  const loadMoreOpportunities = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadOpportunities(false);
    }
  }, [loadingMore, hasMore]);

  // Apply filters
  const applyFilters = () => {
    loadOpportunities(true);
  };

  // Process filters for API call
  const processFilters = (filters: any) => {
    const processed = { ...filters };
    
    // Convert "all" and "any" back to empty strings for API
    if (processed.type === 'all') processed.type = '';
    if (processed.minScore === 'any') processed.minScore = '';
    
    // Remove empty values
    Object.keys(processed).forEach(key => {
      if (processed[key] === '' || processed[key] === undefined) {
        delete processed[key];
      }
    });
    
    return processed;
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    loadOpportunities(true);
  };

  // Fetch new opportunities from research module
  const fetchNewOpportunities = async () => {
    try {
      setIsFetching(true);
      
      // Call the research module to find new opportunities
      const response = await fetch('/api/research/fetch-opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // You can add parameters here like search terms, filters, etc.
          searchTerms: filters.search || '',
          types: filters.type ? [filters.type] : [],
          minRelevanceScore: filters.minRelevanceScore || 0.5
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch new opportunities');
      }

      const result = await response.json();
      
      if (result.success) {
        const { data, meta } = result;
        const { newOpportunities, duplicates, message } = meta;
        
        if (data && data.length > 0) {
          // Add new opportunities to the existing list
          setOpportunities(prev => [...data, ...prev]);
          
          toast({
            title: 'Search completed!',
            description: message || `Found ${data.length} new opportunities and added them to your list.`,
          });
        } else if (duplicates > 0) {
          // Show specific message for duplicates
          toast({
            title: 'All opportunities already exist',
            description: message || `Found ${duplicates} opportunities, but all were already in your database. Check your existing opportunities above.`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'No opportunities found',
            description: message || 'No new opportunities were found for your search terms.',
          });
        }
      } else {
        toast({
          title: 'Search failed',
          description: 'Failed to search for new opportunities. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Error fetching new opportunities:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch new opportunities. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadOpportunities(true);
  }, []);

  // Infinite scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Toggle like with feedback capture
  const toggleLike = async (opportunityId: string) => {
    const isCurrentlyLiked = likedOpportunities.has(opportunityId);
    
    try {
      if (!isCurrentlyLiked) {
        // Capture feedback for accepting/liking the opportunity
        await liaisonApi.captureFeedback({
          opportunityId,
          action: 'accepted',
          reason: 'User liked the opportunity'
        });
      }

      setLikedOpportunities(prev => {
        const newSet = new Set(prev);
        if (newSet.has(opportunityId)) {
          newSet.delete(opportunityId);
          toast({
            title: 'Removed from likes',
            description: 'Opportunity removed from your liked list.',
          });
        } else {
          newSet.add(opportunityId);
          // Remove from disliked if it was there
          setDislikedOpportunities(prevDisliked => {
            const newDislikedSet = new Set(prevDisliked);
            newDislikedSet.delete(opportunityId);
            return newDislikedSet;
          });
          toast({
            title: 'Added to likes',
            description: 'Opportunity added to your liked list and marked as accepted.',
          });
        }
        return newSet;
      });
    } catch (error: any) {
      console.error('Error capturing feedback:', error);
      toast({
        title: 'Feedback error',
        description: 'Failed to capture feedback, but like status updated locally.',
        variant: 'destructive',
      });
    }
  };

  // Toggle dislike with feedback capture
  const toggleDislike = async (opportunityId: string) => {
    const isCurrentlyDisliked = dislikedOpportunities.has(opportunityId);
    
    try {
      if (!isCurrentlyDisliked) {
        // Capture feedback for rejecting/disliking the opportunity
        await liaisonApi.captureFeedback({
          opportunityId,
          action: 'rejected',
          reason: 'User disliked the opportunity'
        });
      }

      setDislikedOpportunities(prev => {
        const newSet = new Set(prev);
        if (newSet.has(opportunityId)) {
          newSet.delete(opportunityId);
          toast({
            title: 'Removed from dislikes',
            description: 'Opportunity removed from your disliked list.',
          });
        } else {
          newSet.add(opportunityId);
          // Remove from liked if it was there
          setLikedOpportunities(prevLiked => {
            const newLikedSet = new Set(prevLiked);
            newLikedSet.delete(opportunityId);
            return newLikedSet;
          });
          toast({
            title: 'Added to dislikes',
            description: 'Opportunity added to your disliked list and marked as rejected.',
          });
        }
        return newSet;
      });
    } catch (error: any) {
      console.error('Error capturing feedback:', error);
      toast({
        title: 'Feedback error',
        description: 'Failed to capture feedback, but dislike status updated locally.',
        variant: 'destructive',
      });
    }
  };

  // Toggle backlog with feedback capture
  const toggleBacklog = async (opportunityId: string) => {
    const opportunity = opportunities.find(opp => opp.id === opportunityId);
    if (!opportunity) return;

    try {
      if (backlogOpportunities.has(opportunityId)) {
        // Remove from backlog (this would require removing from tasks)
        setBacklogOpportunities(prev => {
          const newSet = new Set(prev);
          newSet.delete(opportunityId);
          return newSet;
        });
        toast({
          title: 'Removed from backlog',
          description: 'Opportunity removed from your backlog. Note: Task still exists in Task Management.',
          variant: 'default',
        });
      } else {
        // Add to backlog via tasks and capture feedback
        const added = addOpportunityToTasks(opportunity);
        if (added) {
          // Capture feedback for saving the opportunity
          await liaisonApi.captureFeedback({
            opportunityId,
            action: 'saved',
            reason: 'User added opportunity to backlog for later review'
          });

          setBacklogOpportunities(prev => new Set(prev).add(opportunityId));
          toast({
            title: 'Added to backlog',
            description: 'Opportunity saved to your task backlog. Check Task Management to track progress.',
          });
        } else {
          toast({
            title: 'Already in backlog',
            description: 'This opportunity is already in your task backlog.',
            variant: 'default',
          });
        }
      }
    } catch (error: any) {
      console.error('Error capturing feedback:', error);
      // Still show success message since the backlog action worked
      if (!backlogOpportunities.has(opportunityId)) {
        toast({
          title: 'Added to backlog',
          description: 'Opportunity added to backlog (feedback capture failed).',
        });
      }
    }
  };

  // View details
  const viewDetails = (opportunity: Opportunity) => {
    router.push(`/dashboard/opportunities/${opportunity.id}`);
  };

  // Export opportunities using liaison API
  const handleExport = async (exportFilters: ExportFilters, options: ExportOptions) => {
    setIsExporting(true);
    try {
      const blob = await liaisonApi.exportOpportunities(exportFilters, options);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = options.filename || `opportunities_${new Date().toISOString().split('T')[0]}.${options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export completed',
        description: `Successfully exported opportunities as ${options.format.toUpperCase()}.`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export opportunities',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    const colors = {
      grant: 'bg-green-100 text-green-800',
      residency: 'bg-blue-100 text-blue-800',
      exhibition: 'bg-purple-100 text-purple-800',
      competition: 'bg-orange-100 text-orange-800',
      fellowship: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const actionButtons = (
    <div className="flex items-center space-x-3">
      <Button 
        variant="outline" 
        onClick={fetchNewOpportunities}
        disabled={isFetching}
        className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
      >
        {isFetching ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        {isFetching ? 'Fetching...' : 'Fetch New'}
      </Button>
      <ExportDialog
        trigger={
          <Button variant="outline" disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
        onExport={handleExport}
        isExporting={isExporting}
      />
      <Button variant="outline" onClick={clearFilters}>
        Clear Filters
      </Button>
      <Button onClick={applyFilters}>
        <Search className="h-4 w-4 mr-2" />
        Apply Filters
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      currentPage="opportunities"
      title="Opportunities"
      action={actionButtons}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search opportunities..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              
              <Select
                value={filters.type || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="residency">Residency</SelectItem>
                  <SelectItem value="exhibition">Exhibition</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                  <SelectItem value="fellowship">Fellowship</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.minRelevanceScore?.toString() || ''}
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    minRelevanceScore: value ? parseFloat(value) : undefined 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Min relevance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any relevance</SelectItem>
                  <SelectItem value="0.7">70%+</SelectItem>
                  <SelectItem value="0.8">80%+</SelectItem>
                  <SelectItem value="0.9">90%+</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Deadline before"
                value={filters.deadlineBefore || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, deadlineBefore: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading opportunities...</p>
            </div>
          </div>
        ) : opportunities.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Opportunities List */
          <div className="space-y-6">
            {opportunities.map((opportunity) => (
              <Card key={opportunity.id} className="transition-shadow hover:shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                            {opportunity.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getTypeBadgeColor(opportunity.type)}>
                              {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)}
                            </Badge>
                            {opportunity.relevanceScore && (
                              <Badge variant="outline">
                                {Math.round(opportunity.relevanceScore * 100)}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleLike(opportunity.id)}
                            className={likedOpportunities.has(opportunity.id) ? "text-blue-600" : ""}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleDislike(opportunity.id)}
                            className={dislikedOpportunities.has(opportunity.id) ? "text-red-600" : ""}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-5 line-clamp-2">
                        {opportunity.description}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <span>Source:</span>
                          <span className="font-medium">{opportunity.source}</span>
                        </div>
                        
                        {opportunity.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{opportunity.location}</span>
                          </div>
                        )}

                        {opportunity.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {formatDate(opportunity.deadline)}</span>
                          </div>
                        )}
                      </div>

                      {/* Matching Criteria */}
                      {opportunity.matchingCriteria && opportunity.matchingCriteria.length > 0 && (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-1">
                            {opportunity.matchingCriteria.map((criteria, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {criteria}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bottom Action Buttons */}
                      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBacklog(opportunity.id)}
                          className={backlogOpportunities.has(opportunity.id) ? "text-green-600 border-green-600 bg-green-50" : ""}
                        >
                          <BookOpen className="h-4 w-4 mr-1" />
                          {backlogOpportunities.has(opportunity.id) ? "In Tasks" : "Add to Backlog"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewDetails(opportunity)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Loading more opportunities...
            </div>
          </div>
        )}

        {/* End of Results */}
        {!hasMore && opportunities.length > 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              You've reached the end of the opportunities list.
            </p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}