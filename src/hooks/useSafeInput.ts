import { useState, useCallback, useMemo } from 'react';
import { sanitizeText, validateInput, ValidationRules } from '@/lib/sanitize';

type ValidationField = keyof typeof ValidationRules;

interface UseSafeInputOptions {
  field: ValidationField;
  initialValue?: string;
  onChange?: (value: string) => void;
  validateOnChange?: boolean;
}

interface UseSafeInputReturn {
  value: string;
  safeValue: string;
  isValid: boolean;
  error?: string;
  setValue: (value: string) => void;
  validate: () => boolean;
  reset: () => void;
}

/**
 * Hook for safe input handling with automatic sanitization and validation
 * Prevents XSS attacks and ensures input compliance with validation rules
 */
export function useSafeInput(options: UseSafeInputOptions): UseSafeInputReturn {
  const { field, initialValue = '', onChange, validateOnChange = true } = options;
  
  const [value, setValueInternal] = useState(initialValue);
  const [error, setError] = useState<string | undefined>();
  
  // Memoized safe value to avoid unnecessary re-sanitization
  const safeValue = useMemo(() => {
    return sanitizeText(value, ValidationRules[field].maxLength);
  }, [value, field]);
  
  // Validation result
  const validationResult = useMemo(() => {
    return validateInput(value, field);
  }, [value, field]);
  
  const setValue = useCallback((newValue: string) => {
    setValueInternal(newValue);
    
    if (validateOnChange) {
      const result = validateInput(newValue, field);
      setError(result.error);
    }
    
    // Call external onChange with sanitized value
    if (onChange) {
      const sanitized = sanitizeText(newValue, ValidationRules[field].maxLength);
      onChange(sanitized);
    }
  }, [field, onChange, validateOnChange]);
  
  const validate = useCallback(() => {
    const result = validateInput(value, field);
    setError(result.error);
    return result.isValid;
  }, [value, field]);
  
  const reset = useCallback(() => {
    setValueInternal(initialValue);
    setError(undefined);
  }, [initialValue]);
  
  return {
    value,
    safeValue,
    isValid: validationResult.isValid,
    error,
    setValue,
    validate,
    reset,
  };
}

/**
 * Hook specifically for task title input
 */
export function useSafeTaskTitle(initialValue = '', onChange?: (value: string) => void) {
  return useSafeInput({
    field: 'taskTitle',
    initialValue,
    onChange,
  });
}

/**
 * Hook specifically for project name input  
 */
export function useSafeProjectName(initialValue = '', onChange?: (value: string) => void) {
  return useSafeInput({
    field: 'projectName',
    initialValue,
    onChange,
  });
}

/**
 * Hook specifically for description input
 */
export function useSafeDescription(initialValue = '', onChange?: (value: string) => void) {
  return useSafeInput({
    field: 'description',
    initialValue,
    onChange,
  });
}