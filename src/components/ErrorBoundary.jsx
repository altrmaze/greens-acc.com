import { Component } from 'react';

/**
 * ErrorBoundary — catches JavaScript errors in child components and renders
 * a graceful fallback UI instead of crashing the entire admin panel.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeSection />
 *   </ErrorBoundary>
 *
 * Optional `fallback` prop overrides the default error card.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in development; a production app would send to an
    // observability service here.
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) return children;

    if (fallback) return fallback;

    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center space-y-4">
        <div className="text-3xl" aria-hidden="true">⚠️</div>
        <h3 className="text-base font-bold text-red-400">Something went wrong</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          {error?.message ?? 'An unexpected error occurred in this section.'}
        </p>
        <button
          onClick={this.handleReset}
          className="mt-2 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
