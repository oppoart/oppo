'use client';

import { AlertCircle, CheckCircle2, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProfileQualityAnalysis } from '@/types/analyst';

interface ProfileQualityAnalysisProps {
  analysis: ProfileQualityAnalysis;
}

export function ProfileQualityAnalysisDisplay({ analysis }: ProfileQualityAnalysisProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Completeness Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Profile Completeness</span>
              </CardTitle>
              <CardDescription>
                Analyzed on {new Date(analysis.analyzedAt).toLocaleString()}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.completenessScore)}`}>
                {analysis.completenessScore}
              </div>
              <div className="text-sm text-muted-foreground">
                {getScoreLabel(analysis.completenessScore)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={analysis.completenessScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Metrics</CardTitle>
          <CardDescription>Quantitative breakdown of your profile content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Biography</p>
              <p className="text-2xl font-bold">{analysis.metrics.bioLength}</p>
              <p className="text-xs text-muted-foreground">characters</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Artist Statement</p>
              <p className="text-2xl font-bold">{analysis.metrics.statementLength}</p>
              <p className="text-xs text-muted-foreground">characters</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Skills</p>
              <p className="text-2xl font-bold">{analysis.metrics.skillsCount}</p>
              <p className="text-xs text-muted-foreground">documented</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Interests</p>
              <p className="text-2xl font-bold">{analysis.metrics.interestsCount}</p>
              <p className="text-xs text-muted-foreground">defined</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Query Parameters</p>
              <p className="text-2xl font-bold">{analysis.metrics.queryParamsCount}</p>
              <p className="text-xs text-muted-foreground">configured</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Strengths</span>
            </CardTitle>
            <CardDescription>What your profile does well</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span>Areas for Improvement</span>
            </CardTitle>
            <CardDescription>Profile sections that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Actionable steps to improve your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(rec.priority)}
                      <h4 className="font-semibold text-sm">{rec.area}</h4>
                    </div>
                    <Badge className={getPriorityColor(rec.priority)}>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.message}</p>
                  <div className="bg-gray-50 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="text-blue-600">Action:</span> {rec.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
