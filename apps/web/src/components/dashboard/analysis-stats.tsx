'use client';

import { BarChart3, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AnalysisStats } from '@/types/analyst';
import { OPPORTUNITY_TYPES } from '@/types/analyst';

interface AnalysisStatsProps {
  analysisStats: AnalysisStats | null | undefined;
}

export function AnalysisStats({ analysisStats }: AnalysisStatsProps) {
  if (!analysisStats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-gray-500">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No Analysis Data Available</h3>
            <p className="text-sm">Run an analysis to see detailed statistics and insights here.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalOpportunities = analysisStats.opportunitiesByType ? 
    Object.values(analysisStats.opportunitiesByType).reduce((sum, count) => sum + count, 0) : 0;

  const getTypeLabel = (type: string) => {
    return OPPORTUNITY_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'grant': return 'bg-green-500';
      case 'residency': return 'bg-purple-500';
      case 'exhibition': return 'bg-blue-500';
      case 'competition': return 'bg-orange-500';
      case 'fellowship': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{analysisStats.totalAnalyses || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Analyses</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{analysisStats.totalOpportunities || 0}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {Math.round((analysisStats.avgRelevanceScore || 0) * 100)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Avg Relevance Score</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-bold">
                {analysisStats.lastAnalysisDate 
                  ? new Date(analysisStats.lastAnalysisDate).toLocaleDateString()
                  : 'Never'
                }
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Last Analysis</p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Opportunities by Type</span>
          </CardTitle>
          <CardDescription>
            Distribution of discovered opportunities across different categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisStats.opportunitiesByType && Object.keys(analysisStats.opportunitiesByType).length > 0 ? (
              Object.entries(analysisStats.opportunitiesByType).map(([type, count]) => {
                const percentage = totalOpportunities > 0 ? (count / totalOpportunities) * 100 : 0;
                
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(type)}`} />
                        <span className="text-sm font-medium">{getTypeLabel(type)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm">
                  No opportunity data available yet. Run an analysis to see type breakdown.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Matching Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Top Matching Criteria</CardTitle>
          <CardDescription>
            Most frequently matched criteria from your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analysisStats.topMatchingCriteria || analysisStats.topMatchingCriteria.length === 0 ? (
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground text-sm">
                No matching criteria data available yet. Run an analysis to see your profile matches.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysisStats.topMatchingCriteria.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <Badge variant="outline" className="text-sm">
                    {item.criteria}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-muted-foreground">
                      {item.count} matches
                    </div>
                    <div className="w-20">
                      <Progress 
                        value={(item.count / Math.max(...analysisStats.topMatchingCriteria.map(c => c.count))) * 100} 
                        className="h-1" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis History Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
          <CardDescription>
            Overview of your profile analysis performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Success Rate</h4>
              <div className="flex items-center space-x-2">
                <Progress 
                  value={analysisStats.totalAnalyses > 0 ? 100 : 0} 
                  className="flex-1 h-2" 
                />
                <span className="text-sm font-medium">
                  {analysisStats.totalAnalyses > 0 ? '100%' : '0%'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Avg Opportunities per Analysis
              </h4>
              <div className="text-2xl font-bold">
                {analysisStats.totalAnalyses > 0 
                  ? Math.round((analysisStats.totalOpportunities || 0) / analysisStats.totalAnalyses)
                  : 0
                }
              </div>
            </div>
          </div>
          
          {analysisStats.totalAnalyses === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="font-medium mb-1">No Analysis Data Yet</h3>
              <p className="text-sm">
                Run your first profile analysis to see detailed statistics and insights.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}