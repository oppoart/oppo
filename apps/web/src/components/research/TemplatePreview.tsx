'use client';

import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

interface ExpansionPreview {
  totalTemplates: number;
  totalCombinations: number;
  estimatedQueries: number;
  parameterBreakdown: Record<string, number>;
}

interface TemplatePreviewProps {
  preview: ExpansionPreview | null;
  isLoading?: boolean;
}

export function TemplatePreview({ preview, isLoading }: TemplatePreviewProps) {
  if (isLoading) {
    return (
      <div className="bg-muted rounded-md p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Loading preview...</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="bg-muted rounded-md p-4 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <span className="text-sm text-muted-foreground">Preview not available</span>
      </div>
    );
  }

  const hasParameters = preview.estimatedQueries > 0;

  return (
    <div className={`rounded-md p-4 space-y-3 ${hasParameters ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      {/* Status */}
      <div className="flex items-center gap-2">
        {hasParameters ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Ready to generate</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-900">No parameters configured</span>
          </>
        )}
      </div>

      {/* Stats */}
      {hasParameters ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white rounded p-2">
              <div className="text-muted-foreground text-xs">Templates</div>
              <div className="font-semibold text-lg">{preview.totalTemplates}</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-muted-foreground text-xs">Queries</div>
              <div className="font-semibold text-lg text-green-600">{preview.estimatedQueries}</div>
            </div>
          </div>

          {/* Parameter Breakdown */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Parameters:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preview.parameterBreakdown).map(([key, count]) => (
                count > 0 && (
                  <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white border">
                    {key.replace(/([A-Z])/g, ' $1').trim()}: {count}
                  </span>
                )
              ))}
            </div>
          </div>

          {/* Combination info */}
          {preview.totalCombinations > 0 && (
            <div className="text-xs text-muted-foreground">
              {preview.totalCombinations} parameter combination{preview.totalCombinations !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-yellow-800">
          <p className="mb-2">To use template expansion, configure your profile parameters:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Locations (cities, countries)</li>
            <li>Opportunity types (grants, residencies, etc.)</li>
            <li>Amount ranges (funding levels)</li>
            <li>Themes (artistic interests)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
