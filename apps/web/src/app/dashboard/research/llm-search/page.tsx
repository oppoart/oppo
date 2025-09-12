'use client';

import { useState } from 'react';
import { QueryGeneration } from '@/components/research/QueryGeneration';
import { QueryBucket } from '@/components/research/QueryBucket';
import { LLMSearchProcess } from '@/components/research/LLMSearchProcess';
import { ServiceLayout } from '@/components/research/ServiceLayout';
import { useResearchServices } from '@/hooks/useResearchServices';
import { analystApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function LLMSearchPage() {
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
        sourceTypes: ['llm', 'ai_research']
      });
      
      setGeneratedQueries(result.queries);
      toast({
        title: "LLM Queries Generated Successfully",
        description: `Generated ${result.queries.length} AI research queries`
      });
    } catch (error: any) {
      console.error('Query generation error:', error);
      toast({
        title: "Query Generation Failed", 
        description: error.message || "Failed to generate queries. Please try again.",
        variant: "destructive"
      });
      
      // Fallback to some AI-focused queries
      const fallbackQueries = [
        "AI art opportunities 2024",
        "machine learning grants for artists", 
        "generative art residencies",
        "digital art technology exhibitions",
        "AI creativity research funding"
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
        currentPage="research-llm-search"
        title="LLM Search"
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
            <p className="text-muted-foreground">Loading LLM search dashboard...</p>
          </div>
        </div>
      </ServiceLayout>
    );
  }

  return (
    <ServiceLayout
      currentPage="research-llm-search"
      title="LLM Search"
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

        {/* Right side - LLM Search Process */}
        <LLMSearchProcess queryBucket={queryBucket} />
      </div>
    </ServiceLayout>
  );
}
