import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 * 
 * Elder-friendly design with clear recovery options.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('📋 Error details:', errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRefresh = () => {
    // Clear error state and reload the page
    window.location.reload();
  };

  private handleGoHome = () => {
    // Clear error state and navigate to home
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-4 vibrant-texture">
          <div className="max-w-md w-full">
            <div className="memory-card p-8 text-center">
              {/* Error Icon */}
              <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              
              {/* Error Message */}
              <h1 className="text-2xl mb-3 text-foreground">
                Oops! Something went wrong
              </h1>
              
              <p className="text-muted-foreground mb-6 text-lg">
                Don't worry, your data is safe. This is just a temporary hiccup.
              </p>
              
              {/* Error Details (for debugging) */}
              {this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
                    Technical Details (for support)
                  </summary>
                  <div className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-40">
                    <p className="text-destructive mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-muted-foreground whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
              
              {/* Recovery Actions */}
              <div className="space-y-3">
                <Button
                  onClick={this.handleRefresh}
                  className="w-full vibrant-button text-white"
                  size="lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Go to Home
                </Button>
              </div>
              
              {/* Helpful Tips */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> If this keeps happening, try clearing your browser cache or contact support.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
