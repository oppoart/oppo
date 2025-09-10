'use client';

import { ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArtistProfile } from '@/types/profile';

interface ProfileSelectorProps {
  profiles: ArtistProfile[];
  selectedProfile: ArtistProfile | null;
  onProfileChange: (profile: ArtistProfile) => void;
}

export function ProfileSelector({ profiles, selectedProfile, onProfileChange }: ProfileSelectorProps) {
  if (profiles.length === 0) {
    return null;
  }

  if (profiles.length === 1) {
    const profile = profiles[0];
    return (
      <div className="flex items-center space-x-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{profile.name}</span>
        <Badge variant="outline" className="text-xs">
          {profile.category.replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedProfile?.id || ''}
        onValueChange={(value) => {
          const profile = profiles.find(p => p.id === value);
          if (profile) {
            onProfileChange(profile);
          }
        }}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue>
            {selectedProfile ? (
              <div className="flex items-center space-x-2">
                <span className="font-medium">{selectedProfile.name}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedProfile.category.replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            ) : (
              'Select a profile'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center space-x-2">
                <span>{profile.name}</span>
                <Badge variant="outline" className="text-xs">
                  {profile.category.replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}