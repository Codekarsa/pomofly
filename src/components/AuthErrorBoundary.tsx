import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isAuthError = this.state.error?.message?.includes('auth') || 
                         this.state.error?.name?.includes('Auth') ||
                         this.state.error?.message?.includes('Firebase');

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-xl text-red-600">
                {isAuthError ? 'Authentication Error' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-gray-600">
                {isAuthError ? (
                  <>
                    <p className="mb-2">
                      There was a problem with authentication. This could be due to:
                    </p>
                    <ul className="text-sm text-left space-y-1 bg-gray-50 p-3 rounded">
                      <li>• Network connectivity issues</li>
                      <li>• Expired session</li>
                      <li>• Browser security settings</li>
                      <li>• Temporary service disruption</li>
                    </ul>
                  </>
                ) : (
                  <p>An unexpected error occurred while loading the application.</p>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs bg-red-50 p-3 rounded border">
                  <summary className="cursor-pointer font-medium text-red-800">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-red-700">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        {'\n\nComponent Stack:'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                {isAuthError && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()} 
                    className="w-full"
                  >
                    Reload Page
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = '/'} 
                  className="w-full text-sm"
                >
                  Go to Home
                </Button>
              </div>

              {isAuthError && (
                <div className="text-xs text-gray-500 text-center pt-4 border-t">
                  <p>
                    If the problem persists, try clearing your browser cache or 
                    using an incognito/private window.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;