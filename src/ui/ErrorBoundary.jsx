// src/ui/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Error boundary caught:', error, info);
  }
  // `fallback` replaces the default message (null = render nothing). Give the
  // boundary a `key` that changes on navigation so another page starts clean.
  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return <div style={{ padding: 16, color: '#ffb3b3' }}>
      <b>Something went wrong on this page.</b><br/>
      {String(this.state.error?.message || '')}<br/>
      <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 8 }}>Reload</button>
    </div>;
  }
}
