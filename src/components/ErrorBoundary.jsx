import React from 'react';

/**
 * ErrorBoundary — catches unhandled render errors anywhere in the
 * wrapped subtree and displays a safe fallback UI instead of a blank
 * white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * For admin sections, wrap individual sections so a crash in one panel
 * does not tear down the entire Control Room layout.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in development; swap for a real error-reporting
    // service (e.g. Sentry) in production.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback } = this.props;

    if (fallback) {
      return typeof fallback === 'function'
        ? fallback({ error: this.state.error, reset: this.handleReset })
        : fallback;
    }

    return (
      <div className="rounded-2xl border border-red-800 bg-red-950/30 p-6 m-4 text-red-300">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">⚠️</span>
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide">
            Component Error
          </h2>
        </div>
        <p className="text-xs text-red-400/70 mb-4">
          This section encountered an unexpected error and could not render.
          The rest of the application is unaffected.
        </p>
        {this.state.error && (
          <pre className="text-[10px] font-mono text-red-500/60 bg-red-950/50
            rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all mb-4">
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={this.handleReset}
          className="text-xs font-semibold bg-red-900/40 hover:bg-red-900/60
            border border-red-700/50 text-red-300 px-4 py-2 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
