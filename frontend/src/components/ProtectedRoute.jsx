// Guards a page by sending anyone who isn't logged in back to the landing page.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
// Redirects once the auth check finishes and no user is present, remembering where they were headed.
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
