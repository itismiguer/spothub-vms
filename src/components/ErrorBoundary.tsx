import React from 'react';
import ServerError from '../pages/ServerError';

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  public componentDidCatch(error: any, errorInfo: any) {
    // Log error
  }

  public render() {
    if (this.state.hasError) {
      return <ServerError />;
    }

    return this.props.children;
  }
}
