import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

/**
 * Redirects to "/" (the landing page — it has clear Log in / Get Started
 * actions) if there's no logged-in user, preserving the originally-
 * requested path in location state so Login can send them back after auth
 * (Landing.jsx forwards this state along to its "Log in" links).
 *
 * This intentionally targets the SAME route ("/") that the explicit logout
 * buttons (Sidebar/Settings) navigate to, rather than "/login" — logging
 * out synchronously flips isAuthenticated, which also fires this effect,
 * and having two different targets raced: the explicit navigate("/") and
 * this effect's navigate("/login") fired back-to-back, and whichever ran
 * last silently won, so logout sometimes landed on /login instead of "/".
 * With a single shared target there's nothing left to race.
 *
 * The redirect is done imperatively (useEffect + navigate) rather than by
 * rendering <Navigate> directly: this tree sits inside AnimatePresence
 * mode="wait" (see App.jsx), which deliberately keeps an "exiting" route
 * mounted for its exit animation. A declarative <Navigate> re-renders (and
 * re-fires) on every one of those extra render passes, which raced with
 * React Router's own navigation and blew React's "Maximum update depth
 * exceeded" limit. An effect only re-runs when its dependencies actually
 * change, so the redirect fires exactly once.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/", { state: { from: location.pathname }, replace: true });
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  if (isLoading || !isAuthenticated) return null;

  return children;
}
