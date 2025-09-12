'use client';

import { useState } from 'react';
import { ChevronDown, User, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ArtistProfile } from '@/types/profile';
import { cn } from '@/lib/utils';

interface ProfileSelectorProps {
  profiles: ArtistProfile[];
  selectedProfile: ArtistProfile | null;
  onProfileChange: (profile: ArtistProfile) => void;
}

export function ProfileSelector({ 
  profiles, 
  selectedProfile, 
  onProfileChange 
}: ProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (profiles.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Profiles Available</h3>
        <p className="text-muted-foreground mb-4">
          Create an artist profile to start using the research dashboard.
        </p>
        <Button onClick={() => window.location.href = '/dashboard/profiles'}>
          <Palette className="h-4 w-4 mr-2" />
          Create Profile
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Research Profile:</span>
          </div>
          
          {/* Horizontal Profile Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {profiles.map((profile) => (
              <Button
                key={profile.id}
                variant={selectedProfile?.id === profile.id ? "default" : "outline"}
                size="sm"
                className={cn(
                  "relative transition-all duration-200 flex-shrink-0",
                  selectedProfile?.id === profile.id && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => onProfileChange(profile)}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    selectedProfile?.id === profile.id ? "bg-primary-foreground" : "bg-muted-foreground"
                  )} />
                  <span className="font-medium">{profile.artistName}</span>
                  {profile.medium && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 text-xs px-1.5 py-0.5 hidden sm:inline-flex"
                    >
                      {profile.medium}
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Profile Details Dropdown */}
        {selectedProfile && (
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Profile Details
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Palette className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">{selectedProfile.artistName}</h4>
                    {selectedProfile.medium && (
                      <Badge variant="outline" className="mt-1">
                        {selectedProfile.medium}
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedProfile.bio && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2">Bio</h5>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProfile.bio}
                    </p>
                  </div>
                )}

                {selectedProfile.themes && selectedProfile.themes.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2">Themes</h5>
                    <div className="flex flex-wrap gap-1">
                      {selectedProfile.themes.map((theme, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.location.href = `/dashboard/profile/${selectedProfile.id}`}
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Active Profile Summary */}
      {selectedProfile && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Active research context:
              </span>
              <span className="font-medium">
                {selectedProfile.artistName}
                {selectedProfile.medium && ` (${selectedProfile.medium})`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-600 font-medium">Ready</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}