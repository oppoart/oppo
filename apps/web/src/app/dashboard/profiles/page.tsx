'use client';

import { useEffect, useState } from 'react';
import { Plus, User, Edit, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArtistProfile } from '@/types/profile';
import { profileApi } from '@/lib/api';
import { ProfileCreationForm } from '@/components/dashboard/profile-creation-form';
import { useToast } from '@/hooks/use-toast';

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  // Search and filter functionality removed

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await profileApi.getProfiles();
      setProfiles(data);
    } catch (err) {
      setError('Failed to load profiles');
      console.error('Error loading profiles:', err);
      toast({
        title: "Error",
        description: "Failed to load profiles",
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

  if (loading) {
    return (
      <DashboardLayout currentPage="profiles" title="Profiles">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profiles...</p>
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
      currentPage="profiles"
      title="Profiles"
      action={createButton}
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">No Artist Profiles Yet</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
            Create your first artist profile to start discovering opportunities and managing your artistic portfolio.
          </p>
          {createButton}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {profiles.map((profile) => (
                <Card key={profile.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{profile.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {profile.mediums.slice(0, 2).map(m => m.replace(/\b\w/g, l => l.toUpperCase())).join(', ')}
                            {profile.mediums.length > 2 && ` +${profile.mediums.length - 2} more`}
                          </CardDescription>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => window.location.href = `/dashboard/profile/${profile.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">

                    {/* Bio Preview */}
                    {profile.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {profile.bio}
                      </p>
                    )}

                    {/* Skills */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {profile.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {profile.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}


                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/dashboard/profile/${profile.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/dashboard/profile/${profile.id}/view`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}