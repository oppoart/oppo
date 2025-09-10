'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ARTIST_CATEGORIES, ArtistProfile, CreateProfileRequest } from '@/types/profile';
import { profileApi } from '@/lib/api';

const createProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(50, 'Profile name must be less than 50 characters'),
  mediums: z.array(z.string()).min(1, 'Please select at least one medium').max(5, 'Maximum 5 mediums allowed'),
});

type CreateProfileForm = z.infer<typeof createProfileSchema>;

interface ProfileCreationFormProps {
  onProfileCreated: (profile: ArtistProfile) => void;
}

export function ProfileCreationForm({ onProfileCreated }: ProfileCreationFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateProfileForm>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      name: '',
      mediums: [],
    },
  });

  const onSubmit = async (data: CreateProfileForm) => {
    try {
      setLoading(true);
      
      const request: CreateProfileRequest = {
        name: data.name,
        mediums: data.mediums as any,
      };

      const newProfile = await profileApi.createProfile(request);
      onProfileCreated(newProfile);
      form.reset();
    } catch (error) {
      console.error('Error creating profile:', error);
      // TODO: Add proper error handling/toast
    } finally {
      setLoading(false);
    }
  };

  return (
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
                        id={category.value}
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
                        htmlFor={category.value} 
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


        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={loading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </Form>
  );
}