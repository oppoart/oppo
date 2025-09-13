import { ReactNode } from 'react';
import { StatCard } from './StatCard';
import { cn } from '@/lib/utils';

export interface Metric {
  id: string;
  value: string | number;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  change?: number;
  changePeriod?: string;
  valueType?: 'number' | 'currency' | 'percentage' | 'time' | 'custom';
  color?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo';
  loading?: boolean;
  error?: string;
  onClick?: () => void;
}

export interface MetricsGridProps {
  /** Array of metrics to display */
  metrics: Metric[];
  /** Grid layout columns */
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Responsive column breakpoints */
  responsive?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Card size for all metrics */
  cardSize?: 'sm' | 'md' | 'lg';
  /** Whether to show trend indicators */
  showTrends?: boolean;
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg';
  /** Loading state for the entire grid */
  loading?: boolean;
  /** Error state for the entire grid */
  error?: string;
  /** Empty state configuration */
  emptyState?: {
    title: string;
    description?: string;
    icon?: ReactNode;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * MetricsGrid - Displays metrics in a responsive grid layout
 * 
 * @example
 * ```tsx
 * <MetricsGrid
 *   metrics={[
 *     {
 *       id: 'total-opportunities',
 *       value: 1234,
 *       label: 'Total Opportunities',
 *       icon: <Target className="h-4 w-4" />,
 *       change: 12.5,
 *       changePeriod: 'vs last month',
 *       color: 'green'
 *     },
 *     {
 *       id: 'avg-relevance',
 *       value: 85,
 *       label: 'Avg Relevance Score',
 *       icon: <TrendingUp className="h-4 w-4" />,
 *       valueType: 'percentage',
 *       color: 'blue'
 *     }
 *   ]}
 *   columns={4}
 *   responsive={{ sm: 1, md: 2, lg: 4 }}
 *   showTrends
 * />
 * ```
 */
export function MetricsGrid({
  metrics,
  columns = 4,
  responsive,
  cardSize = 'md',
  showTrends = true,
  gap = 'md',
  loading = false,
  error,
  emptyState,
  className
}: MetricsGridProps) {
  const getGridClasses = () => {
    const gapClasses = {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6'
    };

    if (responsive) {
      const { sm = 1, md = 2, lg = columns, xl = columns } = responsive;
      return cn(
        'grid',
        gapClasses[gap],
        `grid-cols-${sm}`,
        `sm:grid-cols-${sm}`,
        `md:grid-cols-${md}`,
        `lg:grid-cols-${lg}`,
        `xl:grid-cols-${xl}`
      );
    }

    return cn(
      'grid',
      gapClasses[gap],
      `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(columns, 4)} xl:grid-cols-${columns}`
    );
  };

  // Loading state
  if (loading) {
    const skeletonCount = columns;
    return (
      <div className={cn(getGridClasses(), className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse bg-muted rounded-lg h-24"
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="text-destructive">
          <svg className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-1">Failed to Load Metrics</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (metrics.length === 0) {
    if (emptyState) {
      return (
        <div className={cn("text-center py-8", className)}>
          <div className="text-muted-foreground">
            {emptyState.icon && (
              <div className="flex justify-center mb-3">
                {emptyState.icon}
              </div>
            )}
            <h3 className="text-lg font-semibold mb-1">{emptyState.title}</h3>
            {emptyState.description && (
              <p className="text-sm">{emptyState.description}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <svg className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-semibold mb-1">No Metrics Available</h3>
        <p className="text-sm">Metrics will appear here once data is available.</p>
      </div>
    );
  }

  // Metrics grid
  return (
    <div className={cn(getGridClasses(), className)}>
      {metrics.map((metric) => (
        <StatCard
          key={metric.id}
          value={metric.value}
          label={metric.label}
          subtitle={metric.subtitle}
          icon={metric.icon}
          change={showTrends ? metric.change : undefined}
          changePeriod={showTrends ? metric.changePeriod : undefined}
          valueType={metric.valueType}
          color={metric.color}
          size={cardSize}
          showTrend={showTrends}
          loading={metric.loading}
          error={metric.error}
          onClick={metric.onClick}
        />
      ))}
    </div>
  );
}

// Helper hook for building metrics data
export function useMetrics() {
  const createMetric = (
    id: string,
    value: string | number,
    label: string,
    options: Partial<Omit<Metric, 'id' | 'value' | 'label'>> = {}
  ): Metric => ({
    id,
    value,
    label,
    ...options
  });

  const createPercentageMetric = (
    id: string,
    value: number,
    label: string,
    options: Partial<Omit<Metric, 'id' | 'value' | 'label' | 'valueType'>> = {}
  ): Metric => ({
    id,
    value,
    label,
    valueType: 'percentage',
    ...options
  });

  const createCurrencyMetric = (
    id: string,
    value: number,
    label: string,
    options: Partial<Omit<Metric, 'id' | 'value' | 'label' | 'valueType'>> = {}
  ): Metric => ({
    id,
    value,
    label,
    valueType: 'currency',
    ...options
  });

  const createCountMetric = (
    id: string,
    value: number,
    label: string,
    options: Partial<Omit<Metric, 'id' | 'value' | 'label' | 'valueType'>> = {}
  ): Metric => ({
    id,
    value,
    label,
    valueType: 'number',
    ...options
  });

  return {
    createMetric,
    createPercentageMetric,
    createCurrencyMetric,
    createCountMetric
  };
}