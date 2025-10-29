// src/components/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Error boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 16, color: '#ffb3b3' }}>
        <b>Something went wrong in this tab.</b><br/>
        {String(this.state.error?.message || '')}
      </div>;
    }
    return this.props.children;
  }
}
