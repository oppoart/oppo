import { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

interface FormSectionProps {
  children: ReactNode;
  className?: string;
}

export function FormSection({ children, className }: FormSectionProps) {
  return (
    <>
      <div className={className}>
        {children}
      </div>
      <Separator />
    </>
  );
}