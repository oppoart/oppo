'use client';

import { BarChart3, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MetricsGrid, EmptyState, useMetrics } from '@/components/ui/shared';
import type { AnalysisStats } from '@/types/analyst';
import { OPPORTUNITY_TYPES } from '@/types/analyst';

interface AnalysisStatsProps {
  analysisStats: AnalysisStats | null | undefined;
}

export function AnalysisStats({ analysisStats }: AnalysisStatsProps) {
  const { createCountMetric, createPercentageMetric } = useMetrics();

  if (!analysisStats) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-16 w-16" />}
        title="No Analysis Data Available"
        description="Run an analysis to see detailed statistics and insights here."
        illustration="data"
        size="lg"
        color="muted"
      />
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

  // Create metrics for the overview section
  const overviewMetrics = [
    createCountMetric(
      'total-analyses',
      analysisStats.totalAnalyses || 0,
      'Total Analyses',
      {
        icon: <BarChart3 className="h-4 w-4" />,
        color: 'blue'
      }
    ),
    createCountMetric(
      'total-opportunities',
      analysisStats.totalOpportunities || 0,
      'Total Opportunities',
      {
        icon: <Target className="h-4 w-4" />,
        color: 'green'
      }
    ),
    createPercentageMetric(
      'avg-relevance',
      Math.round((analysisStats.avgRelevanceScore || 0) * 100),
      'Avg Relevance Score',
      {
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'purple'
      }
    ),
    createCountMetric(
      'last-analysis',
      analysisStats.lastAnalysisDate 
        ? new Date(analysisStats.lastAnalysisDate).toLocaleDateString()
        : 'Never',
      'Last Analysis',
      {
        icon: <Calendar className="h-4 w-4" />,
        color: 'default',
        valueType: 'custom'
      }
    )
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats using MetricsGrid */}
      <MetricsGrid
        metrics={overviewMetrics}
        columns={4}
        responsive={{ sm: 1, md: 2, lg: 4 }}
        showTrends={false}
        cardSize="md"
      />

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
              <EmptyState
                icon={<Target className="h-12 w-12" />}
                title="No opportunity data available yet"
                description="Run an analysis to see type breakdown."
                size="sm"
                color="muted"
              />
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
            <EmptyState
              icon={<Award className="h-12 w-12" />}
              title="No matching criteria data available yet"
              description="Run an analysis to see your profile matches."
              size="sm"
              color="muted"
            />
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
            <EmptyState
              icon={<BarChart3 className="h-12 w-12" />}
              title="No Analysis Data Yet"
              description="Run your first profile analysis to see detailed statistics and insights."
              size="sm"
              color="muted"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}