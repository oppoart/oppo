'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, Globe, Search, Loader2 } from 'lucide-react';
import { searchApi } from '@/lib/api';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  domain?: string;
  date?: string;
}

interface SearchResultsProps {
  queries: string[];
  onSearchStart?: () => void;
  onSearchComplete?: (results: any[]) => void;
  onSearchError?: (error: string) => void;
}

export function SearchResults({ 
  queries, 
  onSearchStart,
  onSearchComplete,
  onSearchError 
}: SearchResultsProps) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState<{
    totalQueries: number;
    successfulQueries: number;
    totalResults: number;
    searchTime: number;
  } | null>(null);

  const handleSearch = async () => {
    if (queries.length === 0) return;

    setIsSearching(true);
    setSearchResults([]);
    setSearchStats(null);
    onSearchStart?.();

    try {
      const startTime = Date.now();
      const response = await searchApi.searchMultipleQueries(queries, {
        num: 20,
        artFocus: true
      });

      const totalResults = response.results.reduce((sum, result) => 
        sum + (result.results?.length || 0), 0
      );

      setSearchResults(response.results);
      setSearchStats({
        totalQueries: response.totalQueries,
        successfulQueries: response.successfulQueries,
        totalResults,
        searchTime: Date.now() - startTime
      });

      onSearchComplete?.(response.results);

    } catch (error: any) {
      console.error('Search failed:', error);
      const errorMessage = error.message || 'Search failed. Please try again.';
      onSearchError?.(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const formatSearchTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Search Results
          </CardTitle>
          <CardDescription>
            Search Google for art opportunities using your generated queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {queries.length} queries ready to search
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isSearching || queries.length === 0}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Google
                </>
              )}
            </Button>
          </div>

          {/* Search Stats */}
          {searchStats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-blue-900">Queries</div>
                  <div className="text-blue-700">
                    {searchStats.successfulQueries}/{searchStats.totalQueries}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">Results</div>
                  <div className="text-blue-700">{searchStats.totalResults}</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">Search Time</div>
                  <div className="text-blue-700">{formatSearchTime(searchStats.searchTime)}</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">Status</div>
                  <div className="text-green-700">Complete</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          {searchResults.map((queryResult, queryIndex) => (
            <Card key={queryIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Query: "{queryResult.query}"
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {queryResult.results?.length || 0} results
                    </Badge>
                    {queryResult.searchTime && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatSearchTime(queryResult.searchTime)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {queryResult.error ? (
                  <div className="text-red-600 text-sm p-4 bg-red-50 rounded-md">
                    Error: {queryResult.error}
                  </div>
                ) : queryResult.results?.length > 0 ? (
                  <div className="space-y-4">
                    {queryResult.results.map((result: SearchResult, resultIndex: number) => (
                      <div 
                        key={resultIndex}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-blue-600 hover:text-blue-800">
                              <a 
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2"
                              >
                                {result.title}
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <Globe className="h-3 w-3" />
                              <span>{result.domain || new URL(result.link).hostname}</span>
                              {result.date && (
                                <>
                                  <span>•</span>
                                  <span>{formatDate(result.date)}</span>
                                </>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                              {result.snippet}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-4 text-xs">
                            #{result.position}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    No results found for this query
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}