'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArtistProfile } from '@/types/profile';
import { profileApi } from '@/lib/api';
import { ProfileBasicInfoForm } from '@/components/dashboard/profile-basic-info-form';
import { ProfileSkillsForm } from '@/components/dashboard/profile-skills-form';
import { ProfileStatementForm } from '@/components/dashboard/profile-statement-form';
import { ProfileQueryTypesForm } from '@/components/dashboard/profile-query-types-form';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/use-toast';

export default function ProfileEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = params.id as string;
  const { toast } = useToast();

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Get tab from URL parameter, default to 'basic'
  const activeTab = searchParams.get('tab') || 'basic';

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
    if (!profile) return;

    try {
      setDeleting(true);
      await profileApi.deleteProfile(profile.id);
      toast({
        title: 'Profile deleted',
        description: 'Your profile has been deleted successfully.',
      });
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to delete profile');
      console.error('Error deleting profile:', err);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
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

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      // This will trigger saves on all forms
      const event = new CustomEvent('saveAllForms');
      window.dispatchEvent(event);

      // Show success toast after a brief delay (forms will save)
      setTimeout(() => {
        toast({
          title: 'Profile saved',
          description: 'Your changes have been saved successfully.',
        });
        setSaving(false);
      }, 500);
    } catch (err) {
      setSaving(false);
      toast({
        title: 'Save failed',
        description: 'Failed to save profile changes.',
        variant: 'destructive',
      });
    }
  };

  const actionButtons = (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/dashboard/profile/${profile.id}/view`)}
        disabled={saving || deleting}
      >
        <Eye className="h-4 w-4 mr-2" />
        View Profile
      </Button>
      <Button
        size="sm"
        onClick={handleSaveAll}
        disabled={saving || deleting}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Changes
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            disabled={saving || deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Profile
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              profile "{profile.name}" and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <DashboardLayout
      currentPage="profiles"
      title={profile.name}
      action={actionButtons}
    >
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={(value) => router.push(`/dashboard/profile/${profileId}?tab=${value}`)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="skills">Skills & Interests</TabsTrigger>
            <TabsTrigger value="statement">Artist Statement</TabsTrigger>
            <TabsTrigger value="queries">Query Types</TabsTrigger>
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

          <TabsContent value="queries">
            <ProfileQueryTypesForm
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}