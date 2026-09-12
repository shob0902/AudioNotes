// Auth context that holds the logged-in user and the token, and restores a session on reload.
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
// Provides the auth state and the login, signup and logout actions to the whole app.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
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
        if (!cancelled) persistToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
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
// Reads the auth context and complains if it is used outside the provider.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
