'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { QueryGenerationWidget, GenerationMetadata } from '@/components/research/QueryGenerationWidget';
import { QueryBucket } from '@/components/research/QueryBucket';
import { SearchProcess } from '@/components/research/SearchProcess';
import { SearchResults } from '@/components/research/SearchResults';
import { ServiceLayout } from '@/components/research/ServiceLayout';
import { useResearchServices } from '@/hooks/useResearchServices';
import { queryBucketApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function WebSearchPage() {
  const [generatedQueries, setGeneratedQueries] = useState<string[]>([]);
  const [generationMetadata, setGenerationMetadata] = useState<GenerationMetadata | null>(null);
  const [queryBucket, setQueryBucket] = useState<string[]>([]);
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

  const handleQueriesGenerated = (queries: string[], metadata?: GenerationMetadata) => {
    setGeneratedQueries(queries);
    setGenerationMetadata(metadata || null);
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
      // Remove from generated queries
      setGeneratedQueries(generatedQueries.filter(q => q !== query));
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
        <div className="w-1/4 border-r-2 border-border flex flex-col overflow-hidden">
          {/* Query Generation Widget */}
          <div className="px-4 pt-3 pb-2 border-b border-border">
            {selectedProfile ? (
              <QueryGenerationWidget
                profileId={selectedProfile.id}
                sourceType="websearch"
                onQueriesGenerated={handleQueriesGenerated}
                defaultMethod="template"
              />
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                Select a profile to generate queries
              </div>
            )}
          </div>

          {/* Generated Queries List */}
          <div className="flex-1 overflow-hidden flex flex-col px-4 py-2 border-b border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold">Generated Queries</span>
              <span className="text-[10px] text-muted-foreground">
                {generatedQueries.length}
                {generationMetadata && (
                  <span className="ml-1">
                    {generationMetadata.method === 'template' ? '📋' : '🤖'}
                  </span>
                )}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {generatedQueries.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-3">
                  No queries yet
                </div>
              ) : (
                generatedQueries.map((query, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 rounded px-2 py-1.5 group">
                    <span className="flex-1 truncate" title={query}>{query}</span>
                    <button
                      onClick={() => handleAddToBucket(query)}
                      disabled={queryBucket.includes(query)}
                      className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex-shrink-0 transition-opacity"
                      title={queryBucket.includes(query) ? 'Already in bucket' : 'Add to bucket'}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Query Bucket */}
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
