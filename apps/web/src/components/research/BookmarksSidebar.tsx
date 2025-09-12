'use client';

import { useState } from 'react';
import { 
  Bookmark, 
  Rss,
  Calendar,
  Tag,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface BookmarkResult {
  title: string;
  url?: string;
  category: string;
  date: string;
  source: 'bookmark' | 'rss';
  description?: string;
  tags?: string[];
  isStarred?: boolean;
}

interface BookmarksSidebarProps {
  results?: BookmarkResult[];
  onBookmarkSelect?: (bookmark: BookmarkResult) => void;
  selectedBookmark?: BookmarkResult | null;
  loading?: boolean;
}

export function BookmarksSidebar({
  results = [],
  onBookmarkSelect,
  selectedBookmark,
  loading = false
}: BookmarksSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(results.map(r => r.category)))];

  // Filter results based on search and category
  const filteredResults = results.filter(result => {
    const matchesSearch = result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         result.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         result.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || result.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'article': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'video': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'tool': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'tutorial': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'news': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="h-full flex flex-col bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background border-orange-200 dark:border-orange-800 border">
              <Bookmark className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">Bookmarks & RSS</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {results.length} saved items
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Category</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "h-7 text-xs",
                      selectedCategory === category 
                        ? "bg-orange-600 hover:bg-orange-700 text-white" 
                        : "hover:bg-orange-100 dark:hover:bg-orange-900/20"
                    )}
                  >
                    {category === 'all' ? 'All' : category}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Results List */}
      {isExpanded && (
        <>
          <Separator />
          <CardContent className="flex-1 p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto mb-2"></div>
                  <p className="text-xs text-muted-foreground">Loading bookmarks...</p>
                </div>
              </div>
            ) : filteredResults.length > 0 ? (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {filteredResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => onBookmarkSelect?.(result)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm",
                        selectedBookmark?.title === result.title
                          ? "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700"
                          : "bg-background hover:border-orange-200 dark:hover:border-orange-700"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm flex-1 line-clamp-2 leading-tight">
                          {result.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {result.isStarred && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                          {result.source === 'rss' ? (
                            <Rss className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Bookmark className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                      </div>
                      
                      {result.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between gap-2">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getCategoryColor(result.category))}
                        >
                          {result.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(result.date)}</span>
                        </div>
                      </div>
                      
                      {result.tags && result.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {result.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs h-5">
                              {tag}
                            </Badge>
                          ))}
                          {result.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{result.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-32 p-4">
                <div className="text-center">
                  <Bookmark className="h-8 w-8 mx-auto mb-2 text-orange-600 dark:text-orange-400 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'No bookmarks match your filters' 
                      : 'No bookmarks found'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="mt-2 text-xs"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}

