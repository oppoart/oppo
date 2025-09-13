'use client';

import { useState, useEffect } from 'react';
import { QueryGeneration } from '@/components/research/QueryGeneration';
import { QueryBucket } from '@/components/research/QueryBucket';
import { SearchProcess } from '@/components/research/SearchProcess';
import { SearchResults } from '@/components/research/SearchResults';
import { ServiceLayout } from '@/components/research/ServiceLayout';
import { useResearchServices } from '@/hooks/useResearchServices';
import { analystApi, queryBucketApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function WebSearchPage() {
  const [generatedQueries, setGeneratedQueries] = useState<string[]>([]);
  const [queryBucket, setQueryBucket] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Load query bucket from database on mount
  useEffect(() => {
    const loadQueryBucket = async () => {
      try {
        const queries = await queryBucketApi.getQueries();
        setQueryBucket(queries.map(q => q.query));
      } catch (error) {
        console.error('Failed to load query bucket from database:', error);
        toast({
          title: "Failed to Load Queries",
          description: "Could not load your saved queries. Please refresh the page.",
          variant: "destructive"
        });
      }
    };

    loadQueryBucket();
  }, []);

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

  const handleGenerateQueries = async (maxQueries: number = 10) => {
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
        maxQueries,
        sourceTypes: ['websearch']
      });
      
      setGeneratedQueries(result.queries);
      toast({
        title: "Queries Generated Successfully",
        description: `Generated ${result.queries.length} search queries using AI`
      });
    } catch (error: any) {
      console.error('Query generation error:', error);
      toast({
        title: "Query Generation Failed", 
        description: error.message || "Failed to generate queries. Please try again.",
        variant: "destructive"
      });
      
      // Fallback to some default queries if AI fails
      const fallbackQueries = [
        "art opportunities 2024",
        "artist grants and fellowships", 
        "contemporary art exhibitions",
        "art residency programs",
        "gallery submission calls"
      ];
      setGeneratedQueries(fallbackQueries);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToBucket = async (query: string) => {
    if (queryBucket.includes(query)) {
      toast({
        title: "Query Already Added",
        description: "This query is already in your bucket",
        variant: "destructive"
      });
      return;
    }

    try {
      await queryBucketApi.addQuery(query, {
        source: 'generated',
        profileId: selectedProfile?.id
      });
      setQueryBucket([...queryBucket, query]);
      toast({
        title: "Query Added",
        description: "Query has been saved to your bucket"
      });
    } catch (error: any) {
      console.error('Failed to add query to bucket:', error);
      toast({
        title: "Failed to Add Query",
        description: error.message || "Could not save query to bucket",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFromBucket = async (query: string) => {
    try {
      await queryBucketApi.removeQuery(query);
      setQueryBucket(queryBucket.filter(q => q !== query));
      toast({
        title: "Query Removed",
        description: "Query has been removed from your bucket"
      });
    } catch (error: any) {
      console.error('Failed to remove query from bucket:', error);
      toast({
        title: "Failed to Remove Query",
        description: error.message || "Could not remove query from bucket",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <ServiceLayout
        currentPage="research-web-search"
        title="Web Search"
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
            <p className="text-muted-foreground">Loading web search dashboard...</p>
          </div>
        </div>
      </ServiceLayout>
    );
  }

  return (
    <ServiceLayout
      currentPage="research-web-search"
      title="Web Search"
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

        {/* Right side - Search Process */}
        <SearchProcess queryBucket={queryBucket} />
      </div>
    </ServiceLayout>
  );
}
