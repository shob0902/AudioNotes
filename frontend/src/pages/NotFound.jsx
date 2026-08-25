import { Link } from "react-router-dom";

import { MicIcon } from "../components/icons.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Button from "../components/ui/Button.jsx";

export default function NotFound() {
  return (
    <div className="py-10">
      <EmptyState
        icon={<MicIcon className="h-6 w-6" />}
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Link to="/">
            <Button variant="primary" size="sm">
              Back to home
            </Button>
          </Link>
        }
      />
    </div>
  );
}
