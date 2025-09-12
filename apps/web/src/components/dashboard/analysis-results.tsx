'use client';

import { useState } from 'react';
import { Calendar, ExternalLink, MapPin, Search, Star, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AnalysisResult, Opportunity, OPPORTUNITY_TYPES } from '@/types/analyst';

interface AnalysisResultsProps {
  analysisResult: AnalysisResult;
}

export function AnalysisResults({ analysisResult }: AnalysisResultsProps) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'deadline' | 'recent'>('relevance');
  const [expandedOpportunity, setExpandedOpportunity] = useState<string | null>(null);

  // Filter opportunities by type
  const filteredOpportunities = analysisResult.opportunities.filter(opp => 
    selectedType === 'all' || opp.type === selectedType
  );

  // Sort opportunities
  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      case 'deadline':
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: Opportunity['type']) => {
    switch (type) {
      case 'grant': return 'bg-green-100 text-green-800 border-green-200';
      case 'residency': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'exhibition': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'competition': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'fellowship': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Analysis Results</span>
              </CardTitle>
              <CardDescription>
                Analysis completed on {new Date(analysisResult.analysisDate).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {analysisResult.totalOpportunities}
              </div>
              <div className="text-sm text-muted-foreground">
                Opportunities Found
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Search Queries Used</h4>
              <div className="flex flex-wrap gap-2">
                {analysisResult.queriesUsed.map((query, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {query}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Sorting */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-sm border border-gray-200 rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                {OPPORTUNITY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-200 rounded px-2 py-1"
              >
                <option value="relevance">Relevance Score</option>
                <option value="deadline">Deadline</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {sortedOpportunities.length} of {analysisResult.totalOpportunities} opportunities
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      <div className="space-y-4">
        {sortedOpportunities.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No opportunities found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          sortedOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getTypeColor(opportunity.type)}>
                        {OPPORTUNITY_TYPES.find(t => t.value === opportunity.type)?.label || opportunity.type}
                      </Badge>
                      {opportunity.relevanceScore && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs font-medium">
                            {Math.round(opportunity.relevanceScore * 100)}%
                          </span>
                        </div>
                      )}
                      {opportunity.deadline && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDeadline(opportunity.deadline)}
                          </span>
                        </div>
                      )}
                      {opportunity.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {opportunity.location}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {opportunity.source}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(opportunity.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedOpportunity(
                        expandedOpportunity === opportunity.id ? null : opportunity.id
                      )}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        expandedOpportunity === opportunity.id ? 'rotate-180' : ''
                      }`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {opportunity.description.length > 200 && expandedOpportunity !== opportunity.id
                    ? `${opportunity.description.substring(0, 200)}...`
                    : opportunity.description}
                </p>
                
                {expandedOpportunity === opportunity.id && (
                  <div className="mt-4 space-y-3">
                    <Separator />
                    {opportunity.matchingCriteria && opportunity.matchingCriteria.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">
                          Matching Criteria
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.matchingCriteria.map((criteria, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {criteria}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      <p>Added: {new Date(opportunity.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}