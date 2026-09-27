// Handles Google's redirect back to the app: checks state, swaps the code for a session, then moves on.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "./ui/Button.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import Spinner from "./ui/Spinner.jsx";
import GoogleButton from "./GoogleButton.jsx";
import { AlertIcon } from "./icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ApiError } from "../services/api.js";
import { clearPendingSignIn, consumePendingSignIn, exchangeOnce, readGoogleCallback } from "../utils/googleAuth.js";
// Turns Google's `error` query value into something a person can act on.
function describeGoogleError(error) {
  if (error === "access_denied") return "You cancelled Google sign-in.";
  return "Google couldn't complete the sign-in. Please try again.";
}
// Shows a spinner while signing in, or an error state with a retry button if anything goes wrong.
export default function GoogleCallback() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const callback = readGoogleCallback(location.search);
  const code = callback?.code;
  const state = callback?.state;
  const googleError = callback?.error;
  useEffect(() => {
    let active = true;
    if (googleError) {
      clearPendingSignIn();
      setError(describeGoogleError(googleError));
      return undefined;
    }
    const pending = consumePendingSignIn(state);
    if (!code || !pending) {
      setError("This sign-in link is invalid or has expired. Please try again.");
      return undefined;
    }
    exchangeOnce(code, loginWithGoogle)
      .then(() => {
        if (!active) return;
        clearPendingSignIn();
        navigate(pending.from, { replace: true });
      })
      .catch((err) => {
        if (!active) return;
        clearPendingSignIn();
        setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [code, state, googleError, loginWithGoogle, navigate]);
  return (
    <div className="page">
      {error ? (
        <EmptyState
          icon={<AlertIcon />}
          eyebrow="Sign in // Google"
          title="Sign-in failed"
          description={error}
          action={
            <>
              <GoogleButton label="Try again" size="md" />
              <Button to="/" variant="secondary" replace>
                Back home
              </Button>
            </>
          }
        />
      ) : (
        <EmptyState eyebrow="Sign in // Google" title="Signing you in" description={<Spinner label="Checking with Google…" />} />
      )}
    </div>
  );
}
