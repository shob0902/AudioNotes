// Catches render crashes in the page content and shows a recoverable message instead of a blank area.
import { Component } from "react";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
export default class ErrorBoundary extends Component {
  // Starts with no error recorded.
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  // Moves the boundary into its error state when a child throws during render.
  static getDerivedStateFromError(error) {
    return { error };
  }
  // Logs the crash and the component stack to the console.
  componentDidCatch(error, info) {
    console.error("Unhandled error in page content:", error, info.componentStack);
  }
  // Shows the fallback card once something has thrown, otherwise the children as normal.
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
