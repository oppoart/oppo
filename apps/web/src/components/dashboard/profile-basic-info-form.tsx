'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Settings, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { ARTIST_CATEGORIES, ArtistProfile, UpdateProfileRequest } from '@/types/profile';
import { profileApi } from '@/lib/api';

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(50, 'Profile name must be less than 50 characters'),
  mediums: z.array(z.string()).min(1, 'Please select at least one medium').max(5, 'Maximum 5 mediums allowed'),
  bio: z.string().max(3000, 'Bio must be less than 3000 characters').optional(),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;

interface ProfileBasicInfoFormProps {
  profile: ArtistProfile;
  onProfileUpdate: (profile: ArtistProfile) => void;
}

export function ProfileBasicInfoForm({ profile, onProfileUpdate }: ProfileBasicInfoFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Medium management state
  const [mediums, setMediums] = useState<Array<{value: string, label: string}>>([...ARTIST_CATEGORIES]);
  const [showMediumManager, setShowMediumManager] = useState(false);
  const [newMedium, setNewMedium] = useState('');
  const [editingMedium, setEditingMedium] = useState<{value: string, label: string} | null>(null);
  const [editedLabel, setEditedLabel] = useState('');

  const form = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: profile.name,
      mediums: profile.mediums,
      bio: profile.bio || '',
    },
  });

  // Listen for global save event
  useEffect(() => {
    const handleSaveAll = () => {
      form.handleSubmit(onSubmit)();
    };

    window.addEventListener('saveAllForms', handleSaveAll);
    return () => window.removeEventListener('saveAllForms', handleSaveAll);
  }, [form]);

  // Medium management functions
  const handleAddMedium = () => {
    if (!newMedium.trim()) return;
    
    const value = newMedium.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const label = newMedium.trim();
    
    if (mediums.find(m => m.value === value || m.label === label)) {
      return; // Already exists
    }
    
    setMediums([...mediums, { value, label }]);
    setNewMedium('');
  };

  const handleDeleteMedium = (valueToDelete: string) => {
    setMediums(mediums.filter(m => m.value !== valueToDelete));
  };

  const handleStartEdit = (medium: {value: string, label: string}) => {
    setEditingMedium(medium);
    setEditedLabel(medium.label);
  };

  const handleSaveEdit = () => {
    if (!editingMedium || !editedLabel.trim()) return;
    
    setMediums(mediums.map(m => 
      m.value === editingMedium.value 
        ? { ...m, label: editedLabel.trim() }
        : m
    ));
    setEditingMedium(null);
    setEditedLabel('');
  };

  const handleCancelEdit = () => {
    setEditingMedium(null);
    setEditedLabel('');
  };

  const onSubmit = async (data: BasicInfoForm) => {
    const request: UpdateProfileRequest = {
      name: data.name,
      mediums: data.mediums as any,
      bio: data.bio || undefined,
    };

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const updatedProfile = await profileApi.updateProfile(profile.id, request);
      onProfileUpdate(updatedProfile);
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Request payload:', request);
      console.error('Profile ID:', profile.id);
      
      let errorMessage = 'Failed to update profile. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Update failed: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = form.formState.isDirty;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Update your profile name, medium, and bio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Digital Art Portfolio, Textile Experiments..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a name that describes this specific artistic focus or medium
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mediums"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <FormLabel className="text-base">Mediums</FormLabel>
                        <FormDescription>
                          Select the artistic mediums this profile specializes in (max 5)
                        </FormDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMediumManager(true)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {mediums.map((item) => (
                      <FormField
                        key={item.value}
                        control={form.control}
                        name="mediums"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.value}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.value)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      if (currentValues.length < 5) {
                                        field.onChange([...currentValues, item.value]);
                                      }
                                    } else {
                                      field.onChange(
                                        currentValues.filter((value) => value !== item.value)
                                      );
                                    }
                                  }}
                                  disabled={!field.value?.includes(item.value) && field.value?.length >= 5}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your background, artistic practice, and what makes your work unique..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description of your artistic background and practice ({form.watch('bio')?.length || 0}/3000 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">Profile updated successfully!</p>
              </div>
            )}

          </form>
        </Form>
      </CardContent>

      {/* Medium Management Dialog */}
      <Dialog open={showMediumManager} onOpenChange={setShowMediumManager}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Artistic Mediums</DialogTitle>
            <DialogDescription>
              Add, edit, or remove artistic medium categories
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Add new medium */}
            <div className="flex gap-2">
              <Input
                placeholder="Add new medium (e.g., Digital Sculpture)"
                value={newMedium}
                onChange={(e) => setNewMedium(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMedium()}
              />
              <Button onClick={handleAddMedium} disabled={!newMedium.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <Separator />

            {/* Existing mediums */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Current Mediums ({mediums.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mediums.map((medium) => (
                  <div key={medium.value} className="flex items-center justify-between p-3 border rounded-lg">
                    {editingMedium?.value === medium.value ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editedLabel}
                          onChange={(e) => setEditedLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{medium.label}</Badge>
                          <span className="text-sm text-muted-foreground">({medium.value})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(medium)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Medium</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{medium.label}"? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleDeleteMedium(medium.value)}
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p><strong>Note:</strong> Changes to mediums will affect all profiles. Existing profiles using deleted mediums will keep their selections, but the medium won't be available for new selections.</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowMediumManager(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}