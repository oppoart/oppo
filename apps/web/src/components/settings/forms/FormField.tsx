import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}

export function FormField({
  label,
  description,
  icon,
  children,
  htmlFor
}: FormFieldProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        {icon}
        <Label className="text-base font-medium" htmlFor={htmlFor}>
          {label}
        </Label>
      </div>
      {children}
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}