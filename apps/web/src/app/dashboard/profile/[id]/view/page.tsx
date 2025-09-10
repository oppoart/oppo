'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArtistProfile } from '@/types/profile';
import { profileApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SystemPromptPreview } from '@/components/dashboard/system-prompt-preview';

export default function ProfileViewPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
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
      <div className="flex gap-6 w-full">
        {/* Profile Content */}
        <div className="flex-1 space-y-6">
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

        {/* System Prompt Preview Section */}
        <div className="w-80 xl:w-96 flex-shrink-0">
          <SystemPromptPreview profile={profile} />
        </div>
      </div>
    </DashboardLayout>
  );
}