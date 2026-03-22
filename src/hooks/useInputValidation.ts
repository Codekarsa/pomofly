import { useState, useCallback } from 'react';
import { sanitizeTaskTitle, validateServerInput } from '@/lib/security';

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  error?: string;
}

export interface UseInputValidationOptions {
  maxLength?: number;
  minLength?: number;
  required?: boolean;
  customValidator?: (value: string) => ValidationResult;
}

export function useInputValidation(options: UseInputValidationOptions = {}) {
  const {
    maxLength = 200,
    minLength = 0,
    required = false,
    customValidator
  } = options;

  const [validationState, setValidationState] = useState<{
    [key: string]: ValidationResult;
  }>({});

  const validateInput = useCallback((
    value: string,
    fieldName: string = 'default'
  ): ValidationResult => {
    // First sanitize the input
    const sanitizedValue = sanitizeTaskTitle(value);

    // Apply custom validator if provided
    if (customValidator) {
      const customResult = customValidator(sanitizedValue);
      setValidationState(prev => ({ ...prev, [fieldName]: customResult }));
      return customResult;
    }

    // Apply built-in validation
    const serverValidation = validateServerInput(sanitizedValue, maxLength);
    
    if (!serverValidation.isValid) {
      const result = {
        isValid: false,
        sanitizedValue,
        error: serverValidation.error
      };
      setValidationState(prev => ({ ...prev, [fieldName]: result }));
      return result;
    }

    // Check minimum length
    if (required && sanitizedValue.length === 0) {
      const result = {
        isValid: false,
        sanitizedValue,
        error: 'This field is required'
      };
      setValidationState(prev => ({ ...prev, [fieldName]: result }));
      return result;
    }

    if (sanitizedValue.length < minLength) {
      const result = {
        isValid: false,
        sanitizedValue,
        error: `Minimum length is ${minLength} characters`
      };
      setValidationState(prev => ({ ...prev, [fieldName]: result }));
      return result;
    }

    // Success
    const result = {
      isValid: true,
      sanitizedValue,
    };
    setValidationState(prev => ({ ...prev, [fieldName]: result }));
    return result;
  }, [maxLength, minLength, required, customValidator]);

  const getValidationState = useCallback((fieldName: string = 'default') => {
    return validationState[fieldName] || { isValid: true, sanitizedValue: '' };
  }, [validationState]);

  const clearValidation = useCallback((fieldName: string = 'default') => {
    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
  }, []);

  const clearAllValidation = useCallback(() => {
    setValidationState({});
  }, []);

  return {
    validateInput,
    getValidationState,
    clearValidation,
    clearAllValidation,
    validationState
  };
}

// Specific hook for task titles
export function useTaskTitleValidation() {
  return useInputValidation({
    maxLength: 200,
    minLength: 1,
    required: true,
    customValidator: (value: string): ValidationResult => {
      const sanitized = sanitizeTaskTitle(value);
      
      // Check for potentially dangerous patterns after sanitization
      if (sanitized !== value) {
        return {
          isValid: false,
          sanitizedValue: sanitized,
          error: 'Title contains invalid characters that were removed'
        };
      }

      // Check for common task title anti-patterns
      if (sanitized.length > 200) {
        return {
          isValid: false,
          sanitizedValue: sanitized.substring(0, 200),
          error: 'Task title is too long (max 200 characters)'
        };
      }

      return {
        isValid: true,
        sanitizedValue: sanitized
      };
    }
  });
}

// Specific hook for project names
export function useProjectNameValidation() {
  return useInputValidation({
    maxLength: 100,
    minLength: 1,
    required: true,
    customValidator: (value: string): ValidationResult => {
      const sanitized = sanitizeTaskTitle(value);
      
      // Additional validation for project names
      const invalidChars = /[<>:"\/\\|?*]/g;
      if (invalidChars.test(sanitized)) {
        return {
          isValid: false,
          sanitizedValue: sanitized.replace(invalidChars, ''),
          error: 'Project name contains invalid characters'
        };
      }

      return {
        isValid: true,
        sanitizedValue: sanitized
      };
    }
  });
}