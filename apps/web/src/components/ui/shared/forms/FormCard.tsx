import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Optional icon to display next to title */
  icon?: ReactNode;
  /** Form content */
  children: ReactNode;
  /** Save button click handler */
  onSave?: () => void;
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Custom save button text */
  saveButtonText?: string;
  /** Whether to show save button */
  showSaveButton?: boolean;
  /** Form validation state */
  validationState?: 'idle' | 'valid' | 'invalid';
  /** Error message to display */
  errorMessage?: string;
  /** Success message to display */
  successMessage?: string;
  /** Custom actions to render instead of save button */
  customActions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether the card is disabled */
  disabled?: boolean;
}

/**
 * FormCard - A reusable card component for forms with consistent styling
 * 
 * @example
 * ```tsx
 * <FormCard
 *   title="User Settings"
 *   description="Update your account preferences"
 *   icon={<Settings className="h-5 w-5" />}
 *   onSave={handleSave}
 *   loading={isLoading}
 *   validationState="valid"
 * >
 *   <FormField label="Name">
 *     <Input value={name} onChange={setName} />
 *   </FormField>
 * </FormCard>
 * ```
 */
export function FormCard({
  title,
  description,
  icon,
  children,
  onSave,
  loading = false,
  saveButtonText = "Save Changes",
  showSaveButton = true,
  validationState = 'idle',
  errorMessage,
  successMessage,
  customActions,
  className,
  disabled = false
}: FormCardProps) {
  const getValidationIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getValidationBorder = () => {
    switch (validationState) {
      case 'valid':
        return 'border-green-200';
      case 'invalid':
        return 'border-destructive/20';
      default:
        return '';
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      getValidationBorder(),
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </div>
          {getValidationIcon()}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Form Content */}
        <div className={cn(disabled && "pointer-events-none")}>
          {children}
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        {/* Actions */}
        {customActions ? (
          <div className="flex justify-end">
            {customActions}
          </div>
        ) : showSaveButton && onSave && (
          <div className="flex justify-end">
            <Button 
              onClick={onSave} 
              disabled={loading || disabled || validationState === 'invalid'}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {saveButtonText}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}