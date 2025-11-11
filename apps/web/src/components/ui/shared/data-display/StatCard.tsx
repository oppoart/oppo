import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  /** Primary statistic value */
  value: string | number;
  /** Statistic label */
  label: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon to display */
  icon?: ReactNode;
  /** Change percentage or value */
  change?: number;
  /** Change period (e.g., "vs last month") */
  changePeriod?: string;
  /** Value formatting type */
  valueType?: 'number' | 'currency' | 'percentage' | 'time' | 'custom';
  /** Color theme for the card */
  color?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo';
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show trend indicator */
  showTrend?: boolean;
  /** Custom trend icon */
  customTrendIcon?: ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Additional content below the main stat */
  children?: ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * StatCard - Displays key statistics with optional trend indicators
 * 
 * @example
 * ```tsx
 * <StatCard
 *   value={1234}
 *   label="Total Opportunities"
 *   icon={<Target className="h-4 w-4" />}
 *   change={12.5}
 *   changePeriod="vs last month"
 *   color="green"
 *   showTrend
 * />
 * ```
 */
export function StatCard({
  value,
  label,
  subtitle,
  icon,
  change,
  changePeriod,
  valueType = 'number',
  color = 'default',
  size = 'md',
  showTrend = true,
  customTrendIcon,
  loading = false,
  error,
  children,
  onClick,
  className
}: StatCardProps) {
  const formatValue = (val: string | number): string => {
    if (loading) return '...';
    if (error) return '--';
    
    switch (valueType) {
      case 'currency':
        return typeof val === 'number' ? `$${val.toLocaleString()}` : val.toString();
      case 'percentage':
        return typeof val === 'number' ? `${val}%` : val.toString();
      case 'number':
        return typeof val === 'number' ? val.toLocaleString() : val.toString();
      case 'time':
        return val.toString();
      default:
        return val.toString();
    }
  };

  const getColorClasses = () => {
    const colors = {
      default: {
        text: 'text-foreground',
        icon: 'text-muted-foreground',
        accent: 'text-primary'
      },
      blue: {
        text: 'text-blue-900',
        icon: 'text-blue-600',
        accent: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200'
      },
      green: {
        text: 'text-green-900',
        icon: 'text-green-600', 
        accent: 'text-green-600',
        bg: 'bg-green-50 border-green-200'
      },
      red: {
        text: 'text-red-900',
        icon: 'text-red-600',
        accent: 'text-red-600',
        bg: 'bg-red-50 border-red-200'
      },
      yellow: {
        text: 'text-yellow-900',
        icon: 'text-yellow-600',
        accent: 'text-yellow-600',
        bg: 'bg-yellow-50 border-yellow-200'
      },
      purple: {
        text: 'text-purple-900',
        icon: 'text-purple-600',
        accent: 'text-purple-600',
        bg: 'bg-purple-50 border-purple-200'
      },
      indigo: {
        text: 'text-indigo-900',
        icon: 'text-indigo-600',
        accent: 'text-indigo-600',
        bg: 'bg-indigo-50 border-indigo-200'
      }
    };
    
    return colors[color];
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          padding: 'p-4',
          valueText: 'text-xl font-bold',
          labelText: 'text-xs',
          iconSize: 'h-3 w-3'
        };
      case 'lg':
        return {
          padding: 'p-8',
          valueText: 'text-4xl font-bold',
          labelText: 'text-base',
          iconSize: 'h-6 w-6'
        };
      default:
        return {
          padding: 'p-6',
          valueText: 'text-2xl font-bold',
          labelText: 'text-sm',
          iconSize: 'h-4 w-4'
        };
    }
  };

  const getTrendIcon = () => {
    if (customTrendIcon) return customTrendIcon;
    if (change === undefined || change === null) return null;
    
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-muted-foreground';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const colorClasses = getColorClasses();
  const sizeClasses = getSizeClasses();

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        'bg' in colorClasses ? colorClasses.bg : '',
        onClick && "cursor-pointer hover:shadow-md",
        loading && "animate-pulse",
        error && "border-destructive/20 bg-destructive/5",
        className
      )}
      onClick={onClick}
    >
      <CardContent className={sizeClasses.padding}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {icon && (
              <div className={cn(colorClasses.icon, sizeClasses.iconSize)}>
                {icon}
              </div>
            )}
            <p className={cn(sizeClasses.labelText, "text-muted-foreground font-medium")}>
              {label}
            </p>
          </div>
          
          {showTrend && change !== undefined && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                getTrendColor(),
                "border-current/20 bg-current/10"
              )}
            >
              <div className="flex items-center space-x-1">
                {getTrendIcon()}
                <span>{Math.abs(change)}%</span>
              </div>
            </Badge>
          )}
        </div>

        {/* Main Value */}
        <div className={cn(
          sizeClasses.valueText,
          colorClasses.accent,
          "mb-1"
        )}>
          {formatValue(value)}
        </div>

        {/* Subtitle and Change Period */}
        <div className="space-y-1">
          {subtitle && (
            <p className={cn(sizeClasses.labelText, "text-muted-foreground")}>
              {subtitle}
            </p>
          )}
          
          {changePeriod && change !== undefined && (
            <p className={cn(sizeClasses.labelText, "text-muted-foreground")}>
              {changePeriod}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-xs text-destructive mt-2">{error}</p>
        )}

        {/* Additional Content */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}