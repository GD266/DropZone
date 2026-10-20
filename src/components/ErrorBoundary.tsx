import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DropZone] Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
        <div className="w-full max-w-md border border-border rounded-lg bg-surface-1 p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mx-auto mb-4">
            <AlertTriangle size={24} className="text-error" />
          </div>
          <h1 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h1>
          <p className="text-sm text-text-muted mb-2">
            DropZone hit an unexpected error. Your uploaded files are not affected.
          </p>
          {this.state.message && (
            <p className="text-xs text-text-muted font-mono break-words bg-surface-2 border border-border rounded-md p-3 mb-5">
              {this.state.message}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
            >
              <RefreshCw size={15} />
              Reload DropZone
            </button>
            <a
              href="#/"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-surface-2 border border-border hover:border-border-hover text-text-primary text-sm font-medium transition-colors"
            >
              Go to upload
            </a>
          </div>
        </div>
      </div>
    );
  }
}
