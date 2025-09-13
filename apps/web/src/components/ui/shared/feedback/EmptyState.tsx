import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Icon or illustration to display */
  icon?: ReactNode;
  /** Primary title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show as a card */
  showCard?: boolean;
  /** Color theme */
  color?: 'default' | 'muted' | 'info' | 'warning' | 'error';
  /** Custom illustration */
  illustration?: 'search' | 'data' | 'connection' | 'settings' | 'upload' | 'custom';
  /** Additional content */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState - Displays empty states with optional actions
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Search className="h-12 w-12" />}
 *   title="No opportunities found"
 *   description="Try adjusting your search criteria or check back later"
 *   action={{
 *     label: "Refresh Search",
 *     onClick: handleRefresh
 *   }}
 *   size="lg"
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  showCard = false,
  color = 'default',
  illustration = 'custom',
  children,
  className
}: EmptyStateProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-8',
          icon: 'h-8 w-8 mb-3',
          title: 'text-lg font-semibold',
          description: 'text-sm',
          spacing: 'space-y-2'
        };
      case 'lg':
        return {
          container: 'py-16',
          icon: 'h-16 w-16 mb-6',
          title: 'text-2xl font-bold',
          description: 'text-base',
          spacing: 'space-y-4'
        };
      default:
        return {
          container: 'py-12',
          icon: 'h-12 w-12 mb-4',
          title: 'text-xl font-semibold',
          description: 'text-sm',
          spacing: 'space-y-3'
        };
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'muted':
        return {
          icon: 'text-muted-foreground/50',
          title: 'text-muted-foreground',
          description: 'text-muted-foreground/70'
        };
      case 'info':
        return {
          icon: 'text-blue-400',
          title: 'text-blue-900 dark:text-blue-100',
          description: 'text-blue-700 dark:text-blue-300'
        };
      case 'warning':
        return {
          icon: 'text-yellow-400',
          title: 'text-yellow-900 dark:text-yellow-100',
          description: 'text-yellow-700 dark:text-yellow-300'
        };
      case 'error':
        return {
          icon: 'text-red-400',
          title: 'text-red-900 dark:text-red-100',
          description: 'text-red-700 dark:text-red-300'
        };
      default:
        return {
          icon: 'text-muted-foreground',
          title: 'text-foreground',
          description: 'text-muted-foreground'
        };
    }
  };

  const getIllustration = () => {
    if (icon) return icon;
    
    const iconClass = cn(sizeClasses.icon, colorClasses.icon);
    
    switch (illustration) {
      case 'search':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'data':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'connection':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'settings':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'upload':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      default:
        return (
          <div className={cn(
            sizeClasses.icon,
            "rounded-full bg-muted flex items-center justify-center",
            colorClasses.icon
          )}>
            <svg className="h-1/2 w-1/2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const sizeClasses = getSizeClasses();
  const colorClasses = getColorClasses();

  const content = (
    <div className={cn(
      "text-center",
      sizeClasses.container,
      className
    )}>
      <div className={cn("flex flex-col items-center", sizeClasses.spacing)}>
        {/* Icon/Illustration */}
        <div className="flex justify-center">
          {getIllustration()}
        </div>

        {/* Title */}
        <h3 className={cn(sizeClasses.title, colorClasses.title)}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className={cn(
            sizeClasses.description,
            colorClasses.description,
            "max-w-md leading-relaxed"
          )}>
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                size={size === 'sm' ? 'sm' : 'default'}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || 'outline'}
                size={size === 'sm' ? 'sm' : 'default'}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}

        {/* Additional Content */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );

  if (showCard) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}