'use client';

import { useState } from 'react';
import { QueryGeneration } from '@/components/research/QueryGeneration';
import { QueryBucket } from '@/components/research/QueryBucket';
import { SocialMediaSearchProcess } from '@/components/research/SocialMediaSearchProcess';
import { ServiceLayout } from '@/components/research/ServiceLayout';
import { useResearchServices } from '@/hooks/useResearchServices';
import { analystApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function SocialMediaSearchPage() {
  const [generatedQueries, setGeneratedQueries] = useState<string[]>([]);
  const [queryBucket, setQueryBucket] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const serviceIds = ['query-generation', 'web-search', 'llm-search', 'social-media'];
  const serviceNames = {
    'query-generation': 'Query Generation',
    'web-search': 'Web Search',
    'llm-search': 'LLM Search',
    'social-media': 'Social Media Search'
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

  const handleGenerateQueries = async () => {
    if (!selectedProfile) {
      toast({
        title: "No Profile Selected",
        description: "Please select an artist profile to generate queries",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const result = await analystApi.generateQueries(selectedProfile.id, {
        maxQueries: 10,
        sourceTypes: ['social_media', 'instagram', 'twitter']
      });
      
      setGeneratedQueries(result.queries);
      toast({
        title: "Social Media Queries Generated",
        description: `Generated ${result.queries.length} social media search queries`
      });
    } catch (error: any) {
      console.error('Query generation error:', error);
      toast({
        title: "Query Generation Failed", 
        description: error.message || "Failed to generate queries. Please try again.",
        variant: "destructive"
      });
      
      // Fallback to some social media focused queries
      const fallbackQueries = [
        "art opportunities social media",
        "artist networking platforms", 
        "contemporary art Instagram",
        "art exhibition announcements",
        "digital art communities"
      ];
      setGeneratedQueries(fallbackQueries);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToBucket = (query: string) => {
    if (!queryBucket.includes(query)) {
      setQueryBucket([...queryBucket, query]);
    }
  };

  const handleRemoveFromBucket = (query: string) => {
    setQueryBucket(queryBucket.filter(q => q !== query));
  };

  if (loading) {
    return (
      <ServiceLayout
        currentPage="research-sm-search"
        title="Social Media Search"
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
            <p className="text-muted-foreground">Loading social media search dashboard...</p>
          </div>
        </div>
      </ServiceLayout>
    );
  }

  return (
    <ServiceLayout
      currentPage="research-sm-search"
      title="Social Media Search"
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
        {/* Left side - Query Generation and Bucket */}
        <div className="w-1/4 border-r-2 border-border flex flex-col">
          <QueryGeneration
            generatedQueries={generatedQueries}
            isGenerating={isGenerating}
            onGenerateQueries={handleGenerateQueries}
            onAddToBucket={handleAddToBucket}
            queryBucket={queryBucket}
          />
          <QueryBucket
            queryBucket={queryBucket}
            onRemoveFromBucket={handleRemoveFromBucket}
          />
        </div>

        {/* Right side - Social Media Search Process */}
        <SocialMediaSearchProcess queryBucket={queryBucket} />
      </div>
    </ServiceLayout>
  );
}
