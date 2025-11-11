'use client';

import { Plus } from 'lucide-react';

interface QueryBucketProps {
  queryBucket: string[];
  onRemoveFromBucket: (query: string) => void;
}

export function QueryBucket({ queryBucket, onRemoveFromBucket }: QueryBucketProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 py-2">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold">Query Bucket</span>
        <span className="text-[10px] text-muted-foreground">{queryBucket.length}</span>
      </div>

      {/* Query List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {queryBucket.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-3">
            No queries selected
          </div>
        ) : (
          queryBucket.map((query, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 rounded px-2 py-1.5 group">
              <span className="flex-1 truncate" title={query}>{query}</span>
              <button
                onClick={() => onRemoveFromBucket(query)}
                className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 flex-shrink-0 transition-opacity"
                title="Remove from bucket"
              >
                <Plus className="h-3.5 w-3.5 rotate-45" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

