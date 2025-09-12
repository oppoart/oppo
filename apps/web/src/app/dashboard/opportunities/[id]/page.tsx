'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Opportunity } from '@/types/analyst';
import { opportunityApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { addOpportunityToTasks, isOpportunityInTasks } from '@/utils/tasks';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  ThumbsUp, 
  ThumbsDown, 
  BookOpen, 
  Plus,
  Loader2
} from 'lucide-react';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedOpportunities, setLikedOpportunities] = useState<Set<string>>(new Set());
  const [dislikedOpportunities, setDislikedOpportunities] = useState<Set<string>>(new Set());
  const [backlogOpportunities, setBacklogOpportunities] = useState<Set<string>>(new Set());

  // Check if opportunity is in tasks when opportunity loads
  useEffect(() => {
    if (opportunity && isOpportunityInTasks(opportunity.id)) {
      setBacklogOpportunities(new Set([opportunity.id]));
    }
  }, [opportunity]);

  // Load opportunity data
  useEffect(() => {
    const loadOpportunity = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await opportunityApi.getOpportunity(params.id as string);
        setOpportunity(response);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load opportunity details';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadOpportunity();
  }, [params.id, toast]);

  // Toggle like
  const toggleLike = (opportunityId: string) => {
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
          description: 'Opportunity added to your liked list.',
        });
      }
      return newSet;
    });
  };

  // Toggle dislike
  const toggleDislike = (opportunityId: string) => {
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
          description: 'Opportunity added to your disliked list.',
        });
      }
      return newSet;
    });
  };

  // Toggle backlog
  const toggleBacklog = (opportunityId: string) => {
    if (!opportunity) return;

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
      // Add to backlog via tasks
      const added = addOpportunityToTasks(opportunity);
      if (added) {
        setBacklogOpportunities(prev => new Set(prev).add(opportunityId));
        toast({
          title: 'Added to backlog',
          description: 'Opportunity added to your task backlog. Check Task Management to track progress.',
        });
      } else {
        toast({
          title: 'Already in backlog',
          description: 'This opportunity is already in your task backlog.',
          variant: 'default',
        });
      }
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  // Loading state
  if (loading) {
    return (
      <DashboardLayout
        currentPage="opportunities"
        title="Opportunity Details"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading opportunity details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !opportunity) {
    return (
      <DashboardLayout
        currentPage="opportunities"
        title="Opportunity Details"
      >
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  {error || 'Opportunity not found'}
                </h3>
                <p className="text-red-600 mb-4">
                  {error || 'The opportunity you\'re looking for could not be found.'}
                </p>
                <Button onClick={() => router.push('/dashboard/opportunities')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Opportunities
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      currentPage="opportunities"
      title="Opportunity Details"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard/opportunities')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Opportunities
        </Button>

        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{opportunity.title}</CardTitle>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getTypeBadgeColor(opportunity.type)}>
                    {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)}
                  </Badge>
                  {opportunity.relevanceScore && (
                    <Badge variant="outline">
                      {Math.round(opportunity.relevanceScore * 100)}% match
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-base">
                  {opportunity.description}
                </CardDescription>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleLike(opportunity.id)}
                  className={likedOpportunities.has(opportunity.id) ? "text-blue-600 bg-blue-50" : ""}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleDislike(opportunity.id)}
                  className={dislikedOpportunities.has(opportunity.id) ? "text-red-600 bg-red-50" : ""}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Source</h4>
                  <p className="text-gray-600">{opportunity.source}</p>
                </div>
                
                {opportunity.location && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
                    <div className="flex items-center gap-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{opportunity.location}</span>
                    </div>
                  </div>
                )}

                {opportunity.deadline && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Deadline</h4>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(opportunity.deadline)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Opportunity URL</h4>
                  <a 
                    href={opportunity.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visit Opportunity Page
                  </a>
                </div>
              </div>

              {/* Matching Criteria */}
              {opportunity.matchingCriteria && opportunity.matchingCriteria.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Matching Criteria</h4>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.matchingCriteria.map((criteria, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {criteria}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {(opportunity as any).requirements && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Requirements</h4>
                  <p className="text-gray-600">{(opportunity as any).requirements}</p>
                </div>
              )}

              {(opportunity as any).eligibility && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Eligibility</h4>
                  <p className="text-gray-600">{(opportunity as any).eligibility}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => toggleBacklog(opportunity.id)}
                variant={backlogOpportunities.has(opportunity.id) ? "default" : "outline"}
                className={`w-full ${backlogOpportunities.has(opportunity.id) ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {backlogOpportunities.has(opportunity.id) ? "In Tasks" : "Add to Backlog"}
              </Button>

              <Button
                onClick={() => window.open(opportunity.url, '_blank')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Apply Now
              </Button>

              {/* Stats */}
              <div className="pt-4 border-t space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Relevance Score</span>
                    <span className="font-medium">
                      {opportunity.relevanceScore ? `${Math.round(opportunity.relevanceScore * 100)}%` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">
                      {opportunity.createdAt ? new Date(opportunity.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Updated</span>
                    <span className="font-medium">
                      {opportunity.updatedAt ? new Date(opportunity.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}