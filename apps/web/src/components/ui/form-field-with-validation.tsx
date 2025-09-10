'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { validateField } from '@/lib/validation';

interface FormFieldWithValidationProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'password' | 'url' | 'textarea';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  schema?: z.ZodSchema;
  error?: string;
  success?: boolean;
  showValidation?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  className?: string;
  rows?: number;
  maxLength?: number;
  helperText?: string;
}

export const FormFieldWithValidation: React.FC<FormFieldWithValidationProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  schema,
  error: externalError,
  success: externalSuccess,
  showValidation = true,
  validateOnChange = false,
  validateOnBlur = true,
  className,
  rows = 4,
  maxLength,
  helperText,
}) => {
  const [internalError, setInternalError] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Validate the field value
  const validate = () => {
    if (!schema) return;

    const result = validateField(schema, value);
    if (result.success) {
      setInternalError(undefined);
      setIsValid(true);
    } else {
      setInternalError(result.error);
      setIsValid(false);
    }
  };

  // Handle change event
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (validateOnChange && touched) {
      validate();
    }
  };

  // Handle blur event
  const handleBlur = () => {
    setTouched(true);
    
    if (validateOnBlur) {
      validate();
    }
    
    if (onBlur) {
      onBlur();
    }
  };

  // Update validation when value changes (if already touched)
  useEffect(() => {
    if (touched && schema) {
      validate();
    }
  }, [value]);

  // Determine which error to show
  const displayError = externalError || (touched ? internalError : undefined);
  const showSuccess = !displayError && (externalSuccess || (touched && isValid && value));

  // Input/Textarea classes
  const inputClasses = cn(
    'transition-colors',
    displayError && 'border-destructive focus:ring-destructive',
    showSuccess && 'border-green-500 focus:ring-green-500',
    className
  );

  // Render appropriate input component
  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <Textarea
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={!!displayError}
          aria-describedby={`${id}-error`}
        />
      );
    }

    return (
      <Input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        maxLength={maxLength}
        aria-invalid={!!displayError}
        aria-describedby={`${id}-error`}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}>
          {label}
        </Label>
        {maxLength && type === 'textarea' && (
          <span className="text-xs text-muted-foreground">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      <div className="relative">
        {renderInput()}
        
        {showValidation && (displayError || showSuccess) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            {displayError ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : showSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      {helperText && !displayError && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}

      {/* Error message */}
      {showValidation && displayError && (
        <p id={`${id}-error`} className="text-sm text-destructive flex items-center gap-1">
          {displayError}
        </p>
      )}

      {/* Success message */}
      {showValidation && showSuccess && !displayError && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          Looks good!
        </p>
      )}
    </div>
  );
};

export default FormFieldWithValidation;