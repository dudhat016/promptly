import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';
import Button from '../primitives/Button';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Lightweight error boundary for individual widgets (charts, tables, cards).
 * Catches render errors in its subtree without crashing the entire page.
 *
 * Usage:
 *   <ComponentErrorBoundary fallbackTitle="Chart failed to load">
 *     <RevenueChart />
 *   </ComponentErrorBoundary>
 */
export class ComponentErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ComponentErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-muted/20 rounded-xl border border-dashed border-border">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
          <p className="text-sm font-bold text-foreground mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            {this.props.fallbackMessage || 'This section encountered an error. Try refreshing it.'}
          </p>
          <Button size="sm" variant="outline" leftIcon={RefreshCw} onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;
