import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Icon to display next to title */
  icon?: ReactNode;
  /** Badge to display next to title */
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  /** Breadcrumb navigation */
  breadcrumbs?: Breadcrumb[];
  /** Back button configuration */
  backButton?: {
    label?: string;
    href?: string;
    onClick?: () => void;
  };
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: 'default' | 'outline' | 'secondary';
    loading?: boolean;
    disabled?: boolean;
  };
  /** Secondary actions */
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  }>;
  /** Additional actions menu */
  moreActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    destructive?: boolean;
  }>;
  /** Tabs or navigation items */
  tabs?: Array<{
    id: string;
    label: string;
    active?: boolean;
    onClick?: () => void;
    href?: string;
    count?: number;
  }>;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show a separator below */
  showSeparator?: boolean;
  /** Additional content below header */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PageHeader - Consistent page header with navigation and actions
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   title="Dashboard"
 *   description="Monitor your opportunities and research progress"
 *   icon={<BarChart3 className="h-6 w-6" />}
 *   badge={{ label: "Beta", variant: "secondary" }}
 *   breadcrumbs={[
 *     { label: "Home", href: "/" },
 *     { label: "Dashboard" }
 *   ]}
 *   primaryAction={{
 *     label: "New Analysis",
 *     onClick: handleNewAnalysis,
 *     icon: <Plus className="h-4 w-4" />
 *   }}
 *   tabs={navigationTabs}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  icon,
  badge,
  breadcrumbs,
  backButton,
  primaryAction,
  secondaryActions = [],
  moreActions = [],
  tabs,
  size = 'md',
  showSeparator = true,
  children,
  className
}: PageHeaderProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-4',
          title: 'text-xl font-semibold',
          description: 'text-sm'
        };
      case 'lg':
        return {
          container: 'py-8',
          title: 'text-3xl font-bold',
          description: 'text-lg'
        };
      default:
        return {
          container: 'py-6',
          title: 'text-2xl font-bold',
          description: 'text-base'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="font-medium text-foreground">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Main Header */}
      <div className={cn("flex items-start justify-between", sizeClasses.container)}>
        <div className="flex-1 min-w-0">
          {/* Back Button */}
          {backButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={backButton.onClick}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backButton.label || 'Back'}
            </Button>
          )}

          {/* Title Section */}
          <div className="flex items-center space-x-3 mb-2">
            {icon}
            <h1 className={cn(sizeClasses.title, "text-foreground")}>
              {title}
            </h1>
            {badge && (
              <Badge variant={badge.variant}>
                {badge.label}
              </Badge>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className={cn(sizeClasses.description, "text-muted-foreground max-w-3xl")}>
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(primaryAction || secondaryActions.length > 0 || moreActions.length > 0) && (
          <div className="flex items-center space-x-3 ml-6">
            {/* Secondary Actions */}
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                size="sm"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}

            {/* Primary Action */}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || 'default'}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
                size="sm"
              >
                {primaryAction.loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                ) : (
                  primaryAction.icon
                )}
                {primaryAction.label}
              </Button>
            )}

            {/* More Actions Menu */}
            {moreActions.length > 0 && (
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      {tabs && tabs.length > 0 && (
        <nav className="flex space-x-8 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={cn(
                "flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                tab.active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      )}

      {/* Additional Content */}
      {children}

      {/* Separator */}
      {showSeparator && !tabs && <Separator />}
    </div>
  );
}