'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArtistProfile } from '@/types/profile';
import { profileApi } from '@/lib/api';
import { ProfileBasicInfoForm } from '@/components/dashboard/profile-basic-info-form';
import { ProfileSkillsForm } from '@/components/dashboard/profile-skills-form';
import { ProfileStatementForm } from '@/components/dashboard/profile-statement-form';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ProfileEditPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleProfileUpdate = (updatedProfile: ArtistProfile) => {
    setProfile(updatedProfile);
  };

  const handleDeleteProfile = async () => {
    if (!profile || !confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await profileApi.deleteProfile(profile.id);
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to delete profile');
      console.error('Error deleting profile:', err);
    } finally {
      setSaving(false);
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
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const actionButtons = (
    <div className="flex space-x-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => router.push(`/dashboard/profile/${profile.id}/view`)}
      >
        <Eye className="h-4 w-4 mr-2" />
        View Profile
      </Button>
      <Button 
        variant="destructive" 
        size="sm"
        onClick={handleDeleteProfile}
        disabled={saving}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Profile
      </Button>
    </div>
  );

  return (
    <DashboardLayout
      currentPage="profiles"
      title={profile.name}
      action={actionButtons}
    >
      <div className="max-w-4xl">

        {/* Profile Editing Tabs */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs sm:text-sm">Skills</TabsTrigger>
            <TabsTrigger value="statement" className="text-xs sm:text-sm">Statement</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ProfileBasicInfoForm 
              profile={profile} 
              onProfileUpdate={handleProfileUpdate}
            />
          </TabsContent>

          <TabsContent value="skills">
            <ProfileSkillsForm 
              profile={profile} 
              onProfileUpdate={handleProfileUpdate}
            />
          </TabsContent>


          <TabsContent value="statement">
            <ProfileStatementForm 
              profile={profile} 
              onProfileUpdate={handleProfileUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}