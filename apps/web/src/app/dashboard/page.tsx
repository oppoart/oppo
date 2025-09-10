'use client';

import { useEffect, useState } from 'react';
import { Plus, User, TrendingUp, Eye, Palette, ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArtistProfile } from '@/types/profile';
import { profileApi, userApi } from '@/lib/api';
import { ProfileCreationForm } from '@/components/dashboard/profile-creation-form';
import { WelcomeFlow } from '@/components/onboarding/WelcomeFlow';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load both profiles and preferences
      const [profilesData, preferencesData] = await Promise.all([
        profileApi.getProfiles(),
        userApi.getPreferences().catch(() => null) // Don't fail if preferences fail
      ]);
      
      setProfiles(profilesData);
      setUserPreferences(preferencesData);
      
      // Show welcome flow for new users
      if (preferencesData && !preferencesData.preferences?.hasSeenOnboarding) {
        setShowWelcome(true);
      }
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCreated = (newProfile: ArtistProfile) => {
    setProfiles(prev => [...prev, newProfile]);
    setShowCreateDialog(false);
    toast({
      title: "Success",
      description: "Profile created successfully!",
    });
  };

  const handleWelcomeClose = async () => {
    setShowWelcome(false);
    
    // Mark onboarding as completed
    try {
      await userApi.updatePreferences({ hasSeenOnboarding: true });
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  };

  const handleCreateProfileFromOnboarding = () => {
    setShowCreateDialog(true);
  };

  const handleOpenSettingsFromOnboarding = () => {
    window.location.href = '/dashboard/settings';
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const createButton = (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Artist Profile</DialogTitle>
          <DialogDescription>
            Create a specialized profile for different artistic mediums or themes.
          </DialogDescription>
        </DialogHeader>
        <ProfileCreationForm onProfileCreated={handleProfileCreated} />
      </DialogContent>
    </Dialog>
  );

  return (
    <DashboardLayout
      currentPage="dashboard"
      title="Dashboard"
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
            <p className="text-xs text-muted-foreground">
              Active artist profiles
            </p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      {profiles.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Palette className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">Welcome to OPPO</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
            Create your first artist profile to start discovering opportunities and managing your artistic portfolio.
          </p>
          {createButton}
        </div>
      ) : (
        /* Quick Actions */
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard/profiles'}
            >
              View All Profiles
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowCreateDialog(true)}>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-primary" />
                  Create New Profile
                </CardTitle>
                <CardDescription>
                  Start building another specialized artist profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/profiles'}>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Manage Profiles
                </CardTitle>
                <CardDescription>
                  Edit and update your existing artist profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View Profiles
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow opacity-60">
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-muted-foreground" />
                  Discover Opportunities
                </CardTitle>
                <CardDescription>
                  Find grants, residencies, and exhibitions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled className="w-full">
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Welcome flow for new users */}
      <WelcomeFlow
        open={showWelcome}
        onOpenChange={handleWelcomeClose}
        userName={user?.name || undefined}
        hasProfiles={profiles.length > 0}
        hasPreferences={userPreferences?.preferences?.minFundingAmount !== undefined || 
                       userPreferences?.preferences?.preferredLocations?.length > 0 ||
                       userPreferences?.preferences?.opportunityTypes?.length > 0}
        onCreateProfile={handleCreateProfileFromOnboarding}
        onOpenSettings={handleOpenSettingsFromOnboarding}
      />
    </DashboardLayout>
  );
}