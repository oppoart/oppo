'use client';

import { useState } from 'react';
import { Plus, Play } from 'lucide-react';

interface QueryGenerationProps {
  generatedQueries: string[];
  isGenerating: boolean;
  onGenerateQueries: (maxQueries: number) => void;
  onAddToBucket: (query: string) => void;
  queryBucket: string[];
}

export function QueryGeneration({
  generatedQueries,
  isGenerating,
  onGenerateQueries,
  onAddToBucket,
  queryBucket
}: QueryGenerationProps) {
  const [maxQueries, setMaxQueries] = useState<number>(10);
  return (
    <div className="flex-1 border-b border-border min-h-0">
      <div className="h-full pt-2 px-4 pb-4 flex flex-col">
        {/* Header with title and controls */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Query Generation</h3>
          <div className="flex items-center gap-3">
            {/* 🔢 Number Input for Query Count */}
            <div className="flex items-center gap-2">
              <label htmlFor="maxQueries" className="text-sm font-medium text-gray-600">
                Count:
              </label>
              <input
                id="maxQueries"
                type="number"
                min="1"
                max="20"
                value={maxQueries}
                onChange={(e) => setMaxQueries(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <button 
                onClick={() => onGenerateQueries(maxQueries)}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                title={isGenerating ? 'Generating...' : `Generate ${maxQueries} Queries`}
              >
                <Play className="h-4 w-4" />
                <span className="text-sm font-medium">Generate</span>
              </button>
            </div>
          </div>
        </div>
        <div className="border-b border-border mb-2 -mx-4 h-px"></div>

        {/* Generated Queries List */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Generated Queries:</span>
            <span className="font-medium">{generatedQueries.length} queries</span>
          </div>
          <div className="bg-gray-50 rounded-md p-3 h-full overflow-y-auto">
            {generatedQueries.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No queries generated yet
              </div>
            ) : (
              <div className="space-y-2">
                {generatedQueries.map((query, index) => (
                  <div key={index} className="bg-white rounded border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{query}</span>
                      <button 
                        onClick={() => onAddToBucket(query)}
                        disabled={queryBucket.includes(query)}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

