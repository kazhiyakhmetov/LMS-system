/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onUnauthorized } from "../shared/lib/api/httpClient";
import { fetchCurrentUser, loginRequest, logoutRequest } from "../shared/lib/auth/authService";
import { tokenStorage } from "../shared/lib/auth/tokenStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const me = await fetchCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          tokenStorage.clear();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return onUnauthorized(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const result = await loginRequest({ email, password });
    tokenStorage.set(result.token);
    setToken(result.token);

    try {
      const me = await fetchCurrentUser();
      setUser(me);
      return { token: result.token, user: me };
    } catch {
      setUser(result.user);
      return result;
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      isAuthed: Boolean(token && user),
      login,
      logout,
    }),
    [token, user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
