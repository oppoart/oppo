import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, ExternalLink, MapPin, Star, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OpportunityData {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
  url: string;
  deadline?: string;
  location?: string;
  amount?: string;
  organization?: string;
  relevanceScore?: number;
  matchingCriteria?: string[];
  createdAt: string;
}

export interface OpportunityCardProps {
  /** Opportunity data */
  opportunity: OpportunityData;
  /** Whether the card is expanded to show details */
  expanded?: boolean;
  /** Toggle expansion handler */
  onToggleExpand?: () => void;
  /** Custom action buttons */
  customActions?: ReactNode;
  /** Whether to show relevance score */
  showRelevanceScore?: boolean;
  /** Whether to show matching criteria when expanded */
  showMatchingCriteria?: boolean;
  /** Custom type color mapping */
  getTypeColor?: (type: string) => string;
  /** Custom type label mapping */
  getTypeLabel?: (type: string) => string;
  /** Maximum description length before truncation */
  maxDescriptionLength?: number;
  /** Click handler for the entire card */
  onClick?: () => void;
  /** Whether the card is selectable */
  selectable?: boolean;
  /** Whether the card is selected */
  selected?: boolean;
  /** Selection change handler */
  onSelectionChange?: (selected: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * OpportunityCard - Displays opportunity information with expandable details
 * 
 * @example
 * ```tsx
 * <OpportunityCard
 *   opportunity={opportunityData}
 *   expanded={expandedId === opportunity.id}
 *   onToggleExpand={() => setExpandedId(expandedId === opportunity.id ? null : opportunity.id)}
 *   showRelevanceScore
 *   showMatchingCriteria
 * />
 * ```
 */
export function OpportunityCard({
  opportunity,
  expanded = false,
  onToggleExpand,
  customActions,
  showRelevanceScore = true,
  showMatchingCriteria = true,
  getTypeColor,
  getTypeLabel,
  maxDescriptionLength = 200,
  onClick,
  selectable = false,
  selected = false,
  onSelectionChange,
  className
}: OpportunityCardProps) {
  const defaultGetTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'grant': return 'bg-green-100 text-green-800 border-green-200';
      case 'residency': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'exhibition': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'competition': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'fellowship': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scholarship': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const defaultGetTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const typeColor = getTypeColor ? getTypeColor(opportunity.type) : defaultGetTypeColor(opportunity.type);
  const typeLabel = getTypeLabel ? getTypeLabel(opportunity.type) : defaultGetTypeLabel(opportunity.type);

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return date.toLocaleDateString();
  };

  const getDeadlineColor = (deadline?: string) => {
    if (!deadline) return 'text-muted-foreground';
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600';
    if (diffDays <= 3) return 'text-orange-600';
    if (diffDays <= 7) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const truncatedDescription = opportunity.description.length > maxDescriptionLength && !expanded
    ? `${opportunity.description.substring(0, maxDescriptionLength)}...`
    : opportunity.description;

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        onClick && "cursor-pointer",
        selectable && "hover:bg-accent/50",
        selected && "ring-2 ring-primary bg-accent/30",
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Type Badge and Metadata */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <Badge className={typeColor}>
                {typeLabel}
              </Badge>
              
              {showRelevanceScore && opportunity.relevanceScore && (
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-medium">
                    {Math.round(opportunity.relevanceScore * 100)}%
                  </span>
                </div>
              )}
              
              {opportunity.deadline && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className={cn("text-xs", getDeadlineColor(opportunity.deadline))}>
                    {formatDeadline(opportunity.deadline)}
                  </span>
                </div>
              )}
              
              {opportunity.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {opportunity.location}
                  </span>
                </div>
              )}
            </div>

            {/* Title and Source */}
            <CardTitle className="text-lg mb-1">{opportunity.title}</CardTitle>
            <CardDescription className="text-sm">
              {opportunity.source}
              {opportunity.organization && opportunity.organization !== opportunity.source && (
                <span> • {opportunity.organization}</span>
              )}
              {opportunity.amount && (
                <span className="font-medium text-green-600"> • {opportunity.amount}</span>
              )}
            </CardDescription>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            {selectable && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectionChange?.(e.target.checked);
                }}
                className="rounded"
              />
            )}
            
            {customActions}
            
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(opportunity.url, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
            
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
              >
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  expanded && "rotate-180"
                )} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {truncatedDescription}
        </p>
        
        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-3">
            <Separator />
            
            {/* Matching Criteria */}
            {showMatchingCriteria && opportunity.matchingCriteria && opportunity.matchingCriteria.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-2">
                  Matching Criteria
                </h5>
                <div className="flex flex-wrap gap-2">
                  {opportunity.matchingCriteria.map((criteria, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {criteria}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Metadata */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Added: {new Date(opportunity.createdAt).toLocaleDateString()}</p>
              <p>Source URL: {opportunity.url}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}