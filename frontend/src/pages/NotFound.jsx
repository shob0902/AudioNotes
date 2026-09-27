// The 404 page shown for any route that doesn't match.
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { MicIcon } from "../components/icons.jsx";
// Renders the not-found state with links back home and to the docs.
export default function NotFound() {
  return (
    <div className="page">
      <EmptyState
        icon={<MicIcon />}
        eyebrow="404 // Dead air"
        title="Page not found"
        description="The page you're looking for doesn't exist — or it was moved."
        action={
          <>
            <Button to="/">Back to home</Button>
            <Button to="/architecture" variant="secondary">
              Read the docs
            </Button>
          </>
        }
      />
    </div>
  );
}
