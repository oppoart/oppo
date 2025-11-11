'use client';

import { ReactNode, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, ChevronDown, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArtistProfile } from '@/types/profile';

interface ServiceSession {
  sessionId?: string;
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  results?: any[];
  error?: string;
  retryCount?: number;
  maxRetries?: number;
  startedAt?: Date;
  updatedAt?: Date;
}

interface ServiceLayoutProps {
  currentPage: 'research-web-search' | 'research-llm-search' | 'research-sm-search' | 'research-bookmarks' | 'research-newsletter';
  title: string;
  profiles: ArtistProfile[];
  selectedProfile: ArtistProfile | null;
  onProfileChange: (profile: ArtistProfile) => void;
  services: ServiceSession[];
  refreshing: boolean;
  exporting: boolean;
  pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  onRefresh: () => void;
  onExport: () => void;
  children: ReactNode;
}

export function ServiceLayout({
  currentPage,
  title,
  profiles,
  selectedProfile,
  onProfileChange,
  services,
  refreshing,
  exporting,
  pollingIntervalRef,
  onRefresh,
  onExport,
  children
}: ServiceLayoutProps) {
  const leftAction = (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Research Profile:</span>
      {selectedProfile && profiles.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="font-medium">
              <User className="h-4 w-4 mr-2" />
              {selectedProfile.name || 'Unknown Profile'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-56 max-w-md">
            {profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.id}
                onClick={() => onProfileChange(profile)}
                className={selectedProfile.id === profile.id ? 'bg-accent' : ''}
              >
                <User className="h-4 w-4 mr-2 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium">{profile.name}</span>
                  {profile.bio && (
                    <span className="text-xs text-muted-foreground">{profile.bio}</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/dashboard/profiles'}
          className="text-muted-foreground"
        >
          <User className="h-4 w-4 mr-2" />
          {profiles.length === 0 ? 'Create Profile' : 'Select Profile'}
        </Button>
      )}
    </div>
  );

  const rightAction = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing || !selectedProfile}
      >
        <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        disabled={exporting || !selectedProfile}
      >
        <Download className="h-4 w-4 mr-1" />
        {exporting ? 'Exporting...' : 'Export'}
      </Button>
    </div>
  );

  return (
    <DashboardLayout 
      currentPage={currentPage}
      leftAction={leftAction}
      rightAction={rightAction}
    >
      <div className="h-[calc(100vh-8rem)] flex flex-col relative">
        {/* Service Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

      </div>
    </DashboardLayout>
  );
}
