'use client';

import { useState } from 'react';
import { Wand2, Loader2, Plus, AlertCircle } from 'lucide-react';
import { analystApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface QueryGeneratorWidgetProps {
  profileId: string;
  profileName?: string;
  onQueriesGenerated?: (queries: string[]) => void;
  className?: string;
}

export function QueryGeneratorWidget({
  profileId,
  profileName,
  onQueriesGenerated,
  className = ''
}: QueryGeneratorWidgetProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQueries, setGeneratedQueries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const { toast } = useToast();

  const handleGenerateQueries = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const result = await analystApi.generateQueries(profileId, { maxQueries: 8 });
      
      setGeneratedQueries(result.queries);
      setMetadata(result.metadata || null);
      
      onQueriesGenerated?.(result.queries);
      
      toast({
        title: "Queries Generated",
        description: `Generated ${result.queries.length} search queries using AI`,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate queries';
      setError(errorMessage);
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearQueries = () => {
    setGeneratedQueries([]);
    setMetadata(null);
    setError(null);
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Wand2 className="h-4 w-4 mr-2 text-blue-600" />
          AI Query Generator
        </h3>
        
        <div className="flex items-center gap-2">
          {generatedQueries.length > 0 && (
            <button
              onClick={handleClearQueries}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
          
          <button
            onClick={handleGenerateQueries}
            disabled={isGenerating || !profileId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-3 w-3 mr-1" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {profileName && (
        <p className="text-sm text-gray-600 mb-3">
          Generating queries for <span className="font-medium">{profileName}</span>
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {generatedQueries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Generated Queries ({generatedQueries.length})
            </p>
            {metadata?.processingTimeMs && (
              <span className="text-xs text-gray-500">
                {metadata.processingTimeMs}ms
              </span>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-1">
            {generatedQueries.map((query, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-md p-2 text-sm border hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 flex-1">{query}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(query);
                      toast({
                        title: "Copied",
                        description: "Query copied to clipboard",
                        duration: 2000
                      });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-700 p-1 transition-opacity"
                    title="Copy query"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {generatedQueries.length === 0 && !isGenerating && !error && (
        <div className="text-center py-6 text-gray-500">
          <Wand2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Click Generate to create AI-powered search queries</p>
        </div>
      )}
    </div>
  );
}