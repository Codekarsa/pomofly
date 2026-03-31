import React, { useCallback, useContext, createContext, ReactNode, useReducer, useEffect } from 'react';
import { errorManager, ErrorInfo, ErrorContext as ErrorContextType, FeedbackData } from '@/lib/errorHandling';

interface ErrorState {
  errors: ErrorInfo[];
  isLoading: boolean;
  retryCount: number;
}

interface ErrorAction {
  type: 'ADD_ERROR' | 'REMOVE_ERROR' | 'CLEAR_ERRORS' | 'SET_LOADING' | 'INCREMENT_RETRY';
  payload?: any;
}

const initialState: ErrorState = {
  errors: [],
  isLoading: false,
  retryCount: 0
};

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
        isLoading: false
      };
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload)
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        retryCount: 0
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1
      };
    default:
      return state;
  }
}

interface ErrorContextValue {
  state: ErrorState;
  handleError: (error: Error | string, context?: ErrorContextType) => ErrorInfo;
  clearErrors: () => void;
  removeError: (errorId: string) => void;
  setLoading: (loading: boolean) => void;
  retryOperation: (operation: () => Promise<any> | any) => Promise<void>;
  collectFeedback: (data: Omit<FeedbackData, 'id' | 'timestamp' | 'userAgent'>) => string;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  const handleError = useCallback((error: Error | string, context: ErrorContextType = {}) => {
    const errorInfo = errorManager.handleError(error, context);
    dispatch({ type: 'ADD_ERROR', payload: errorInfo });
    return errorInfo;
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
    errorManager.clearErrors();
  }, []);

  const removeError = useCallback((errorId: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: errorId });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const retryOperation = useCallback(async (operation: () => Promise<any> | any) => {
    dispatch({ type: 'INCREMENT_RETRY' });
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await operation();
      dispatch({ type: 'CLEAR_ERRORS' });
    } catch (error) {
      handleError(error as Error, { action: 'retry', retryCount: state.retryCount + 1 });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleError, state.retryCount]);

  const collectFeedback = useCallback((data: Omit<FeedbackData, 'id' | 'timestamp' | 'userAgent'>) => {
    return errorManager.collectFeedback(data);
  }, []);

  const contextValue: ErrorContextValue = {
    state,
    handleError,
    clearErrors,
    removeError,
    setLoading,
    retryOperation,
    collectFeedback
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandling() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorHandling must be used within an ErrorProvider');
  }
  return context;
}

// Convenience hook for simple error handling
export function useSimpleErrorHandler() {
  const { handleError, setLoading, retryOperation } = useErrorHandling();

  const withErrorHandling = useCallback(
    <T extends any[], R>(
      operation: (...args: T) => Promise<R> | R,
      context: ErrorContextType = {}
    ) => {
      return async (...args: T): Promise<R | undefined> => {
        setLoading(true);
        try {
          const result = await operation(...args);
          return result;
        } catch (error) {
          handleError(error as Error, context);
          return undefined;
        } finally {
          setLoading(false);
        }
      };
    },
    [handleError, setLoading]
  );

  return {
    withErrorHandling,
    handleError,
    setLoading,
    retryOperation
  };
}

// Hook for form validation errors
export function useFormErrorHandling() {
  const { handleError, state } = useErrorHandling();

  const validateField = useCallback((
    value: any,
    rules: Array<{ test: (value: any) => boolean; message: string }>,
    fieldName: string
  ) => {
    for (const rule of rules) {
      if (!rule.test(value)) {
        handleError(rule.message, {
          component: 'form-validation',
          metadata: { fieldName, value }
        });
        return false;
      }
    }
    return true;
  }, [handleError]);

  const validateForm = useCallback((
    formData: Record<string, any>,
    validationSchema: Record<string, Array<{ test: (value: any) => boolean; message: string }>>
  ) => {
    let isValid = true;
    
    for (const [fieldName, rules] of Object.entries(validationSchema)) {
      const fieldValue = formData[fieldName];
      if (!validateField(fieldValue, rules, fieldName)) {
        isValid = false;
      }
    }
    
    return isValid;
  }, [validateField]);

  return {
    validateField,
    validateForm,
    hasErrors: state.errors.length > 0,
    validationErrors: state.errors.filter(error => error.type === 'validation')
  };
}

// Hook for API error handling
export function useApiErrorHandling() {
  const { handleError, retryOperation, state } = useErrorHandling();

  const handleApiError = useCallback((error: any, endpoint: string) => {
    const context: ErrorContextType = {
      component: 'api',
      action: endpoint,
      metadata: {
        status: error.status,
        statusText: error.statusText,
        endpoint
      }
    };

    if (error.status === 401) {
      return handleError('Authentication required. Please sign in again.', context);
    } else if (error.status === 403) {
      return handleError('You do not have permission to access this resource.', context);
    } else if (error.status === 404) {
      return handleError('The requested resource was not found.', context);
    } else if (error.status >= 500) {
      return handleError('Server error. Please try again later.', context);
    } else if (error.status === 0 || error.name === 'NetworkError') {
      return handleError('Network error. Please check your connection.', context);
    } else {
      return handleError(error.message || 'An unexpected error occurred.', context);
    }
  }, [handleError]);

  const apiCall = useCallback(async <T>(
    operation: () => Promise<T>,
    endpoint: string
  ): Promise<T | undefined> => {
    try {
      return await operation();
    } catch (error) {
      handleApiError(error, endpoint);
      return undefined;
    }
  }, [handleApiError]);

  const retryApiCall = useCallback(async <T>(
    operation: () => Promise<T>,
    endpoint: string
  ): Promise<void> => {
    await retryOperation(async () => {
      return await operation();
    });
  }, [retryOperation]);

  return {
    handleApiError,
    apiCall,
    retryApiCall,
    hasNetworkErrors: state.errors.some(error => error.type === 'network'),
    hasAuthErrors: state.errors.some(error => error.type === 'auth')
  };
}