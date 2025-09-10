'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ARTIST_CATEGORIES, ArtistProfile, UpdateProfileRequest } from '@/types/profile';
import { profileApi } from '@/lib/api';

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(50, 'Profile name must be less than 50 characters'),
  mediums: z.array(z.string()).min(1, 'Please select at least one medium').max(5, 'Maximum 5 mediums allowed'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
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

  const form = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: profile.name,
      mediums: profile.mediums,
      bio: profile.bio || '',
    },
  });

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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mediums</FormLabel>
                  <div className="space-y-3">
                    {/* Selected mediums display */}
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((medium: string) => {
                          const categoryInfo = ARTIST_CATEGORIES.find(cat => cat.value === medium);
                          return (
                            <Badge key={medium} variant="outline">
                              {categoryInfo?.label || medium}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Checkboxes for medium selection */}
                    <div className="grid grid-cols-2 gap-3">
                      {ARTIST_CATEGORIES.map((category) => (
                        <div key={category.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`basic-${category.value}`}
                            checked={field.value?.includes(category.value) || false}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              if (checked) {
                                field.onChange([...currentValues, category.value]);
                              } else {
                                field.onChange(currentValues.filter((v: string) => v !== category.value));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`basic-${category.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {category.label}
                          </label>
                        </div>
                      ))}
                    </div>
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
                    A brief description of your artistic background and practice ({form.watch('bio')?.length || 0}/500 characters)
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

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={loading || !hasChanges}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}