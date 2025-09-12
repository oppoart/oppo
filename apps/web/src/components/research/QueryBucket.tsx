'use client';

import { Plus } from 'lucide-react';

interface QueryBucketProps {
  queryBucket: string[];
  onRemoveFromBucket: (query: string) => void;
}

export function QueryBucket({ queryBucket, onRemoveFromBucket }: QueryBucketProps) {
  return (
    <div className="flex-1 min-h-0">
      <div className="h-full pt-2 px-4 pb-4 flex flex-col">
        <h3 className="text-lg font-semibold mb-2">Query Bucket</h3>
        <div className="border-b border-border mb-2 -mx-4 h-px"></div>
        
        {/* Bucket Stats */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Selected:</span>
            <span className="font-medium">{queryBucket.length} queries</span>
          </div>
        </div>

        {/* Query Bucket List */}
        <div className="flex-1 overflow-hidden">
          <div className="text-sm text-muted-foreground mb-2">Selected Queries:</div>
          <div className="bg-gray-50 rounded-md p-3 h-full overflow-y-auto">
            {queryBucket.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No queries selected yet
              </div>
            ) : (
              <div className="space-y-2">
                {queryBucket.map((query, index) => (
                  <div key={index} className="bg-white rounded border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">{query}</span>
                      <button 
                        onClick={() => onRemoveFromBucket(query)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Plus className="h-4 w-4 rotate-45" />
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

