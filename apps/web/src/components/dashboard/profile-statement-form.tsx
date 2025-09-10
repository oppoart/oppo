'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ArtistProfile, UpdateProfileRequest } from '@/types/profile';
import { profileApi } from '@/lib/api';

const statementSchema = z.object({
  artistStatement: z.string()
    .max(2000, 'Artist statement must be less than 2000 characters')
    .optional(),
});

type StatementForm = z.infer<typeof statementSchema>;

interface ProfileStatementFormProps {
  profile: ArtistProfile;
  onProfileUpdate: (profile: ArtistProfile) => void;
}

export function ProfileStatementForm({ profile, onProfileUpdate }: ProfileStatementFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<StatementForm>({
    resolver: zodResolver(statementSchema),
    defaultValues: {
      artistStatement: profile.artistStatement || '',
    },
  });

  const onSubmit = async (data: StatementForm) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const request: UpdateProfileRequest = {
        artistStatement: data.artistStatement || undefined,
      };

      const updatedProfile = await profileApi.updateProfile(profile.id, request);
      onProfileUpdate(updatedProfile);
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update artist statement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = form.formState.isDirty;
  const currentLength = form.watch('artistStatement')?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artist Statement</CardTitle>
        <CardDescription>
          Share your artistic vision, philosophy, and what drives your creative practice. This helps opportunities match your artistic direction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="artistStatement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Artist Statement</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write about your artistic vision, what inspires your work, your creative process, and the themes you explore. Consider including:

• Your artistic philosophy and approach
• What drives your creative practice
• The themes or concepts you explore in your work
• Your creative process and methodology
• What you hope to achieve or communicate through your art
• How your work fits within contemporary artistic discourse"
                      className="min-h-[300px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A thoughtful artist statement helps curators, galleries, and grant committees understand your work ({currentLength}/2000 characters)
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
                <p className="text-green-800 text-sm">Artist statement updated successfully!</p>
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
                    Save Statement
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