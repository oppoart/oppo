'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, User, FileText, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArtistProfile } from '@/types/profile';
import { AnalysisResult, AnalysisStats } from '@/types/analyst';
import { QueryTemplate, QueryTemplateGroup } from '@/types/query-template';
import { profileApi, analystApi, queryTemplatesApi } from '@/lib/api';
import { generateExample } from '@/lib/query-template-utils';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SystemPromptPreview } from '@/components/dashboard/system-prompt-preview';
import { AnalysisResults } from '@/components/dashboard/analysis-results';
import { AnalysisStats as AnalysisStatsComponent } from '@/components/dashboard/analysis-stats';

export default function ProfileViewPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysisTab, setShowAnalysisTab] = useState('profile'); // 'profile', 'queries'
  const [userTemplates, setUserTemplates] = useState<QueryTemplate[]>([]);
  const [allGroups, setAllGroups] = useState<QueryTemplateGroup[]>([]);

  useEffect(() => {
    loadProfile();
    loadAnalysisStats();
    loadQueryTemplates();
  }, [profileId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileApi.getProfile(profileId);
      setProfile(data);
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisStats = async () => {
    try {
      const stats = await analystApi.getStats(profileId);
      setAnalysisStats(stats);
    } catch (err) {
      console.error('Error loading analysis stats:', err);
      // Don't set error state for stats failure - it's not critical
    }
  };

  const loadQueryTemplates = async () => {
    try {
      const [templates, groups] = await Promise.all([
        queryTemplatesApi.getProfileTemplates(profileId),
        queryTemplatesApi.getGroups(),
      ]);
      setUserTemplates(templates);
      setAllGroups(groups);
    } catch (err) {
      console.error('Error loading query templates:', err);
    }
  };

  const handleAnalyzeProfile = async () => {
    if (!profile) return;
    
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analystApi.analyze(profileId);
      setAnalysisResult(result);
      setShowAnalysisTab('results');
      
      // Refresh stats after analysis
      await loadAnalysisStats();
    } catch (err: any) {
      setError(err.message || 'Failed to analyze profile');
      console.error('Error analyzing profile:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="profiles" title="Loading Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout currentPage="profiles" title="Profile Not Found">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The requested profile could not be found.'}</p>
          <Button onClick={() => router.push('/dashboard/profiles')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profiles
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const actionButtons = (
    <div className="flex space-x-2">
      <Button 
        variant="outline" 
        onClick={() => router.push('/dashboard/profiles')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Profiles
      </Button>
      <Button 
        variant="outline"
        onClick={handleAnalyzeProfile}
        disabled={analyzing}
      >
        {analyzing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        {analyzing ? 'Analyzing...' : 'Analyze Profile'}
      </Button>
      <Button onClick={() => router.push(`/dashboard/profile/${profile.id}`)}>
        <Edit className="h-4 w-4 mr-2" />
        Edit Profile
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      currentPage="profiles"
      title={profile.name}
      action={actionButtons}
    >
      <div className="w-full space-y-6">
        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              showAnalysisTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setShowAnalysisTab('profile')}
          >
            <User className="h-4 w-4 mr-2 inline" />
            Profile Details
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              showAnalysisTab === 'queries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setShowAnalysisTab('queries')}
          >
            <FileText className="h-4 w-4 mr-2 inline" />
            Query Types
          </button>
        </div>

        <div className="flex gap-6 w-full">
          {/* Main Content */}
          <div className="flex-1">
            {showAnalysisTab === 'profile' && (
              <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Profile Name</h3>
                <p className="text-lg font-semibold">{profile.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Mediums</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.mediums.map((medium, index) => (
                    <Badge key={index} variant="outline">
                      {medium.replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Bio */}
        {profile.bio && (
          <Card>
            <CardHeader>
              <CardTitle>Biography</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Skills and Interests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills & Techniques</CardTitle>
              <CardDescription>
                Artistic skills and techniques you work with
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No skills added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interests & Focus Areas</CardTitle>
              <CardDescription>
                Areas of interest that drive your artistic practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.interests && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No interests added yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Artist Statement */}
        {profile.artistStatement && (
          <Card>
            <CardHeader>
              <CardTitle>Artist Statement</CardTitle>
              <CardDescription>
                Your artistic vision, philosophy, and approach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {profile.artistStatement}
              </p>
            </CardContent>
          </Card>
        )}

                <Separator />

                {/* Profile Metadata */}
                <div className="text-sm text-muted-foreground">
                  <p>Created: {new Date(profile.createdAt).toLocaleDateString()}</p>
                  <p>Last updated: {new Date(profile.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            {showAnalysisTab === 'queries' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Query Templates</CardTitle>
                    <CardDescription>
                      Query templates you've selected for finding opportunities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userTemplates.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          No query templates selected yet
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/dashboard/profile/${profile.id}?tab=queries`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Configure Templates
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {allGroups.map((group) => {
                          const groupTemplates = userTemplates.filter(
                            (t) => t.groupId === group.id
                          );

                          if (groupTemplates.length === 0) return null;

                          return (
                            <div key={group.id}>
                              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                {group.name}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {groupTemplates.map((template) => {
                                  const example = generateExample(template, profile);
                                  return (
                                    <div
                                      key={template.id}
                                      className="bg-gray-50 p-3 rounded-md"
                                    >
                                      <code className="text-sm block mb-1">
                                        {template.template}
                                      </code>
                                      <p className="text-xs text-gray-600">
                                        Example: "{example}"
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* System Prompt Preview Section - Only show on profile tab */}
          {showAnalysisTab === 'profile' && (
            <div className="w-80 xl:w-96 flex-shrink-0">
              <SystemPromptPreview profile={profile} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}