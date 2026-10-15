import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#09090b] text-[#fafafa]">
          <div className="max-w-md w-full rounded-2xl border border-[#27272a] bg-[#141417] p-8 text-center shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-rose-500/10 border border-rose-500/25 text-rose-400">
              <AlertCircle size={24} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-semibold tracking-tight text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                An unexpected interface error occurred during rendering. Your data is safe.
              </p>
              {this.state.error && (
                <p className="text-[11px] font-mono text-rose-400/80 bg-rose-500/5 border border-rose-500/15 rounded-lg p-2 mt-2 break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw size={13} />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#202024] hover:bg-[#27272a] border border-[#27272a] text-[#fafafa] text-xs font-medium transition-all cursor-pointer"
              >
                <Home size={13} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
