import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  login as apiLogin,
  setAuthToken,
  setUnauthorizedHandler,
  signup as apiSignup,
} from "../services/api.js";

const TOKEN_STORAGE_KEY = "audio-notes:token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  // Distinguishes "still checking a stored token" from "checked, no user" —
  // ProtectedRoute needs this to avoid bouncing straight to /login on every
  // refresh before the /auth/me call has had a chance to respond.
  const [isLoading, setIsLoading] = useState(true);

  const persistToken = useCallback((nextToken) => {
    setToken(nextToken);
    setAuthToken(nextToken);
    if (nextToken) localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Restore a session from a stored token on first load.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setAuthToken(token);
      try {
        const me = await getCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        // Expired/invalid token — setUnauthorizedHandler already clears it
        // for a 401; this catch just covers network errors on first load.
        if (!cancelled) persistToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
    // Intentionally only on mount — token changes from login/logout below
    // set `user` directly rather than re-running this restore effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { access_token: accessToken } = await apiLogin(email, password);
      persistToken(accessToken);
      const me = await getCurrentUser();
      setUser(me);
    },
    [persistToken]
  );

  const signup = useCallback(
    async (email, password) => {
      const { access_token: accessToken } = await apiSignup(email, password);
      persistToken(accessToken);
      const me = await getCurrentUser();
      setUser(me);
    },
    [persistToken]
  );

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, signup, logout }),
    [user, isLoading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
