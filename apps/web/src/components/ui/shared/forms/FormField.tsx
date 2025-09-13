import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Optional description or help text */
  description?: string;
  /** Icon to display next to label */
  icon?: ReactNode;
  /** Form input element */
  children: ReactNode;
  /** HTML id for the input (for label association) */
  htmlFor?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Field validation state */
  validationState?: 'idle' | 'valid' | 'invalid' | 'warning';
  /** Error message to display */
  errorMessage?: string;
  /** Success message to display */
  successMessage?: string;
  /** Warning message to display */
  warningMessage?: string;
  /** Additional help text */
  helpText?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Custom layout orientation */
  orientation?: 'vertical' | 'horizontal';
  /** Additional CSS classes */
  className?: string;
  /** Show character count for text inputs */
  showCharCount?: boolean;
  /** Maximum character count */
  maxLength?: number;
  /** Current character count */
  currentLength?: number;
}

/**
 * FormField - Enhanced form field component with validation states and help text
 * 
 * @example
 * ```tsx
 * <FormField
 *   label="Email Address"
 *   description="We'll use this for important notifications"
 *   icon={<Mail className="h-4 w-4" />}
 *   required
 *   validationState="valid"
 *   successMessage="Email verified"
 *   htmlFor="email"
 * >
 *   <Input id="email" type="email" />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  description,
  icon,
  children,
  htmlFor,
  required = false,
  validationState = 'idle',
  errorMessage,
  successMessage,
  warningMessage,
  helpText,
  disabled = false,
  orientation = 'vertical',
  className,
  showCharCount = false,
  maxLength,
  currentLength
}: FormFieldProps) {
  const isHorizontal = orientation === 'horizontal';

  const getValidationIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getValidationMessage = () => {
    if (errorMessage) {
      return (
        <div className="flex items-center space-x-2 text-sm text-destructive">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      );
    }

    if (successMessage) {
      return (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      );
    }

    if (warningMessage) {
      return (
        <div className="flex items-center space-x-2 text-sm text-yellow-600">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{warningMessage}</span>
        </div>
      );
    }

    return null;
  };

  const getCharacterCount = () => {
    if (!showCharCount || currentLength === undefined) return null;

    const isOverLimit = maxLength && currentLength > maxLength;
    const isNearLimit = maxLength && currentLength > maxLength * 0.8;

    return (
      <div className={cn(
        "text-xs text-right",
        isOverLimit ? "text-destructive" : 
        isNearLimit ? "text-yellow-600" : 
        "text-muted-foreground"
      )}>
        {currentLength}{maxLength && ` / ${maxLength}`}
      </div>
    );
  };

  return (
    <div className={cn(
      isHorizontal ? "flex items-start space-x-4" : "space-y-2",
      disabled && "opacity-50",
      className
    )}>
      {/* Label Section */}
      <div className={cn(
        isHorizontal ? "flex-shrink-0 w-48" : "space-y-1"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <Label 
              htmlFor={htmlFor}
              className={cn(
                "text-sm font-medium",
                validationState === 'invalid' && "text-destructive",
                validationState === 'valid' && "text-green-600"
              )}
            >
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {getValidationIcon()}
          </div>
        </div>

        {description && !isHorizontal && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Input Section */}
      <div className={cn(
        isHorizontal ? "flex-1" : "space-y-2"
      )}>
        {description && isHorizontal && (
          <p className="text-xs text-muted-foreground mb-2">
            {description}
          </p>
        )}

        <div className="space-y-1">
          {children}
          
          {/* Character count */}
          {getCharacterCount()}
        </div>

        {/* Messages */}
        <div className="space-y-1">
          {getValidationMessage()}
          
          {helpText && !errorMessage && !successMessage && !warningMessage && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 flex-shrink-0" />
              <span>{helpText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}