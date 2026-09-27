// Catches render crashes in the page content and shows a recoverable message instead of a blank area.
import { Component } from "react";
import Button from "./ui/Button.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import { AlertIcon } from "./icons.jsx";
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
  // Shows the fallback state once something has thrown, otherwise the children as normal.
  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <EmptyState
            icon={<AlertIcon />}
            eyebrow="Error // Render crash"
            title="Something broke"
            description={import.meta.env.DEV ? this.state.error.message : "Please try reloading the page."}
            action={
              <>
                <Button onClick={() => window.location.reload()}>Reload page</Button>
                <Button variant="secondary" href="/">
                  Go home
                </Button>
              </>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
