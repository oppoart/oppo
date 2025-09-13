import { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle2, AlertCircle, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
}

export interface ProgressIndicatorProps {
  /** Progress type */
  type?: 'linear' | 'circular' | 'steps' | 'indeterminate';
  /** Progress value (0-100) for linear/circular types */
  value?: number;
  /** Progress steps for step-based progress */
  steps?: ProgressStep[];
  /** Current step index for step-based progress */
  currentStep?: number;
  /** Progress label */
  label?: string;
  /** Progress description */
  description?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Color theme */
  color?: 'default' | 'blue' | 'green' | 'orange' | 'red';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether progress is in error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Whether progress is completed */
  completed?: boolean;
  /** Completion message */
  completionMessage?: string;
  /** Custom icon for current state */
  customIcon?: ReactNode;
  /** Whether to animate progress changes */
  animated?: boolean;
  /** Additional content */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProgressIndicator - Versatile progress display component
 * 
 * @example
 * ```tsx
 * // Linear progress
 * <ProgressIndicator
 *   type="linear"
 *   value={75}
 *   label="Processing data"
 *   showPercentage
 *   color="blue"
 * />
 * 
 * // Step-based progress
 * <ProgressIndicator
 *   type="steps"
 *   steps={processSteps}
 *   currentStep={2}
 *   color="green"
 * />
 * ```
 */
export function ProgressIndicator({
  type = 'linear',
  value = 0,
  steps = [],
  currentStep = 0,
  label,
  description,
  showPercentage = false,
  color = 'default',
  size = 'md',
  error = false,
  errorMessage,
  completed = false,
  completionMessage,
  customIcon,
  animated = true,
  children,
  className
}: ProgressIndicatorProps) {
  const getColorClasses = () => {
    const colors = {
      default: {
        progress: '',
        text: 'text-foreground',
        accent: 'text-primary'
      },
      blue: {
        progress: 'bg-blue-600',
        text: 'text-blue-900',
        accent: 'text-blue-600'
      },
      green: {
        progress: 'bg-green-600',
        text: 'text-green-900',
        accent: 'text-green-600'
      },
      orange: {
        progress: 'bg-orange-600',
        text: 'text-orange-900',
        accent: 'text-orange-600'
      },
      red: {
        progress: 'bg-red-600',
        text: 'text-red-900',
        accent: 'text-red-600'
      }
    };
    
    return colors[color];
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          progress: 'h-1',
          text: 'text-sm',
          icon: 'h-4 w-4',
          spinner: 'sm' as const
        };
      case 'lg':
        return {
          progress: 'h-3',
          text: 'text-lg',
          icon: 'h-6 w-6',
          spinner: 'lg' as const
        };
      default:
        return {
          progress: 'h-2',
          text: 'text-base',
          icon: 'h-5 w-5',
          spinner: 'md' as const
        };
    }
  };

  const getStateIcon = () => {
    if (customIcon) return customIcon;
    
    if (error) return <AlertCircle className={cn(sizeClasses.icon, "text-destructive")} />;
    if (completed) return <CheckCircle2 className={cn(sizeClasses.icon, "text-green-600")} />;
    if (type === 'indeterminate' || (type === 'linear' && value > 0 && value < 100)) {
      return <LoadingSpinner size={sizeClasses.spinner} />;
    }
    
    return <Clock className={cn(sizeClasses.icon, "text-muted-foreground")} />;
  };

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'active':
        return <Activity className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const colorClasses = getColorClasses();
  const sizeClasses = getSizeClasses();

  if (type === 'steps') {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        {(label || description) && (
          <div className="space-y-1">
            {label && (
              <h3 className={cn(sizeClasses.text, "font-medium", colorClasses.text)}>
                {label}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              {/* Step Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>
              
              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "text-sm font-medium",
                    step.status === 'active' && colorClasses.accent,
                    step.status === 'completed' && "text-green-600",
                    step.status === 'error' && "text-destructive"
                  )}>
                    {step.label}
                  </h4>
                  
                  {step.progress !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(step.progress)}%
                    </span>
                  )}
                </div>
                
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
                
                {step.progress !== undefined && step.status === 'active' && (
                  <Progress 
                    value={step.progress} 
                    className={cn("mt-2", sizeClasses.progress)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {children}
      </div>
    );
  }

  if (type === 'circular') {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="relative">
          <svg className="transform -rotate-90 w-32 h-32">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-muted-foreground/20"
            />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn(colorClasses.accent, animated && "transition-all duration-500")}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {showPercentage && (
                <div className={cn("text-2xl font-bold", colorClasses.accent)}>
                  {Math.round(value)}%
                </div>
              )}
              {label && (
                <div className="text-sm text-muted-foreground">{label}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'indeterminate') {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <LoadingSpinner size={sizeClasses.spinner} />
        <div className="flex-1">
          {label && (
            <p className={cn(sizeClasses.text, "font-medium", colorClasses.text)}>
              {label}
            </p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    );
  }

  // Linear progress (default)
  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      {(label || description) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStateIcon()}
            <div>
              {label && (
                <p className={cn(sizeClasses.text, "font-medium", colorClasses.text)}>
                  {label}
                </p>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          
          {showPercentage && !error && (
            <span className={cn("text-sm font-medium", colorClasses.accent)}>
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <Progress 
        value={error ? 0 : value} 
        className={cn(
          sizeClasses.progress,
          error && "bg-destructive/20",
          animated && "transition-all duration-500"
        )}
      />

      {/* Messages */}
      {errorMessage && (
        <p className="text-sm text-destructive flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>{errorMessage}</span>
        </p>
      )}
      
      {completionMessage && completed && (
        <p className="text-sm text-green-600 flex items-center space-x-1">
          <CheckCircle2 className="h-3 w-3" />
          <span>{completionMessage}</span>
        </p>
      )}

      {children}
    </div>
  );
}