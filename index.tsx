import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-neutral-950 text-red-500 p-8 text-center font-mono">
          <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold uppercase tracking-widest mb-4 text-white">System Error</h1>
          <p className="text-xs text-neutral-400 mb-2">Something went wrong while loading the interface.</p>
          <pre className="bg-neutral-900 p-4 rounded text-[10px] text-left w-full max-w-md overflow-x-auto border border-white/5 mb-8">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors"
          >
            Factory Reset & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);