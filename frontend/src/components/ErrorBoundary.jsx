import { Component } from "react";

import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";

/**
 * Catches render-time crashes in whatever it wraps and shows a recoverable
 * message instead of leaving that area silently blank. Scoped around just
 * the routed page content (see App.jsx's ShellPage) — not the whole app —
 * so a crash in one page still leaves the sidebar/topbar usable, and "Try
 * again" (a full reload) is always reachable instead of stranding the user.
 *
 * React error boundaries must be class components; there's no hooks
 * equivalent (see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in page content:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Card variant="elevated" className="p-6">
          <p className="text-sm font-semibold text-ink">Something went wrong loading this page.</p>
          <p className="mt-1 text-sm text-muted">
            {import.meta.env.DEV ? this.state.error.message : "Please try reloading the page."}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
