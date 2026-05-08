import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCcw, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('âŒ [Neural Crash] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
          {/* Decorative Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px]" />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full bg-card rounded-lg p-12 md:p-20 shadow-2xl border border-border relative z-10"
          >
            <div className="w-24 h-24 bg-muted text-rose-500 rounded-lg flex items-center justify-center mx-auto mb-10 shadow-inner">
              <ShieldAlert className="w-12 h-12" />
            </div>

            <div className="space-y-4 mb-12">
              <div className="flex items-center justify-center gap-2 text-rose-600 font-bold uppercase tracking-[0.2em] text-xs">
                <AlertTriangle className="w-4 h-4" />
                Neural Circuit Interrupted
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">System Anomaly</h1>
              <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                A minor disruption occurred in the neural workspace. Don't worry, your data is safe.
              </p>
              {this.state.error && (
                <div className="bg-muted/50 p-4 rounded-md border border-border mt-4 overflow-hidden">
                  <p className="font-mono text-xs text-muted-foreground truncate uppercase tracking-widest">Diagnostic Code</p>
                  <p className="font-mono text-xs font-bold text-foreground truncate mt-1">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-3 bg-primary text-primary-foreground font-semibold py-3 rounded-md hover:opacity-90 transition-all shadow-xl shadow-primary/10"
              >
                <RefreshCcw className="w-5 h-5" />
                Reboot System
              </button>
              <a 
                href="/"
                className="flex items-center justify-center gap-3 bg-card border-2 border-border text-foreground font-semibold py-3 rounded-md hover:bg-muted transition-all"
              >
                <Home className="w-5 h-5 text-muted-foreground" />
                Return Home
              </a>
            </div>

            <p className="mt-12 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
              Promptly Autonomous Protection Suite
            </p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
