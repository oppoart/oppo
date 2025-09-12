'use client';

import { useState } from 'react';
import { BookmarkedSites } from '@/components/research/BookmarkedSites';
import { BookmarksProcess } from '@/components/research/BookmarksProcess';
import { ServiceLayout } from '@/components/research/ServiceLayout';
import { useResearchServices } from '@/hooks/useResearchServices';

export default function BookmarksPage() {
  const [bookmarkedSites, setBookmarkedSites] = useState<Array<{
    id: string;
    name: string;
    url: string;
    category: string;
    addedDate: Date;
    lastChecked: Date | null;
    status: 'active' | 'inactive' | 'checking';
  }>>([
    {
      id: '1',
      name: 'Artsy',
      url: 'https://www.artsy.net',
      category: 'Art Platform',
      addedDate: new Date('2024-01-15'),
      lastChecked: new Date('2024-03-10'),
      status: 'active'
    },
    {
      id: '2',
      name: 'Creative Applications',
      url: 'https://www.creativeapplications.net',
      category: 'Digital Art',
      addedDate: new Date('2024-02-20'),
      lastChecked: new Date('2024-03-09'),
      status: 'active'
    },
    {
      id: '3',
      name: 'Colossal',
      url: 'https://www.thisiscolossal.com',
      category: 'Art Blog',
      addedDate: new Date('2024-01-10'),
      lastChecked: new Date('2024-03-08'),
      status: 'active'
    },
    {
      id: '4',
      name: 'Behance',
      url: 'https://www.behance.net',
      category: 'Portfolio',
      addedDate: new Date('2024-01-05'),
      lastChecked: null,
      status: 'inactive'
    },
    {
      id: '5',
      name: 'Art Basel',
      url: 'https://www.artbasel.com',
      category: 'Art Fair',
      addedDate: new Date('2024-02-01'),
      lastChecked: new Date('2024-03-07'),
      status: 'active'
    },
    {
      id: '6',
      name: 'Hyperallergic',
      url: 'https://hyperallergic.com',
      category: 'Art News',
      addedDate: new Date('2024-01-25'),
      lastChecked: new Date('2024-03-10'),
      status: 'active'
    },
    {
      id: '7',
      name: 'Juxtapoz',
      url: 'https://www.juxtapoz.com',
      category: 'Art Magazine',
      addedDate: new Date('2024-02-15'),
      lastChecked: new Date('2024-03-09'),
      status: 'active'
    },
    {
      id: '8',
      name: 'Contemporary Art Daily',
      url: 'https://www.contemporaryartdaily.com',
      category: 'Gallery',
      addedDate: new Date('2024-01-20'),
      lastChecked: new Date('2024-03-06'),
      status: 'active'
    }
  ]);

  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const serviceIds = ['bookmarks'];
  const serviceNames = {
    'bookmarks': 'Bookmarks Monitor'
  };

  const {
    profiles,
    selectedProfile,
    loading,
    services,
    refreshing,
    exporting,
    pollingIntervalRef,
    handleProfileChange,
    handleServiceStart,
    handleServiceStop,
    handleRefreshAll,
    handleExportResults,
  } = useResearchServices({ serviceIds, serviceNames });

  const handleToggleSelection = (id: string) => {
    if (selectedSites.includes(id)) {
      setSelectedSites(selectedSites.filter(siteId => siteId !== id));
    } else {
      setSelectedSites([...selectedSites, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSites.length === bookmarkedSites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(bookmarkedSites.map(site => site.id));
    }
  };

  const handleAddBookmark = (site: any) => {
    setBookmarkedSites([...bookmarkedSites, {
      ...site,
      id: Date.now().toString(),
      addedDate: new Date(),
      lastChecked: null,
      status: 'inactive' as const
    }]);
  };

  const handleRemoveBookmark = (id: string) => {
    setBookmarkedSites(bookmarkedSites.filter(site => site.id !== id));
    setSelectedSites(selectedSites.filter(siteId => siteId !== id));
  };

  if (loading) {
    return (
      <ServiceLayout
        currentPage="research-bookmarks"
        title="Bookmarks"
        profiles={profiles}
        selectedProfile={selectedProfile}
        onProfileChange={handleProfileChange}
        services={services}
        refreshing={refreshing}
        exporting={exporting}
        pollingIntervalRef={pollingIntervalRef}
        onRefresh={handleRefreshAll}
        onExport={() => handleExportResults('json')}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading bookmarks dashboard...</p>
          </div>
        </div>
      </ServiceLayout>
    );
  }

  return (
    <ServiceLayout
      currentPage="research-bookmarks"
      title="Bookmarks"
      profiles={profiles}
      selectedProfile={selectedProfile}
      onProfileChange={handleProfileChange}
      services={services}
      refreshing={refreshing}
      exporting={exporting}
      pollingIntervalRef={pollingIntervalRef}
      onRefresh={handleRefreshAll}
      onExport={() => handleExportResults('json')}
    >
      <div className="absolute inset-0 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 flex">
        {/* Left side - Bookmarked Sites */}
        <div className="w-1/4 border-r-2 border-border flex flex-col">
          <BookmarkedSites
            bookmarkedSites={bookmarkedSites}
            selectedSites={selectedSites}
            onToggleSelection={handleToggleSelection}
            onSelectAll={handleSelectAll}
            onAddBookmark={handleAddBookmark}
            onRemoveBookmark={handleRemoveBookmark}
          />
        </div>

        {/* Right side - Bookmarks Process */}
        <BookmarksProcess 
          bookmarkedSites={bookmarkedSites}
          selectedSites={selectedSites}
          onUpdateSiteStatus={(id, status) => {
            setBookmarkedSites(bookmarkedSites.map(site => 
              site.id === id ? { ...site, status, lastChecked: new Date() } : site
            ));
          }}
        />
      </div>
    </ServiceLayout>
  );
}
