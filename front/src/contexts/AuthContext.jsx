/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState } from "react";
import { tokenStorage } from "../shared/lib/auth/tokenStorage";
import { loginRequest } from "../shared/lib/auth/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(tokenStorage.get());
  const [user, setUser] = useState(null);

  const isAuthed = Boolean(token);

  async function login({ login, password }) {
    const result = await loginRequest({ login, password });
    tokenStorage.set(result.token);
    setToken(result.token);
    setUser(result.user);
    return result;
  }

  function logout() {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ token, user, isAuthed, login, logout }), [token, user, isAuthed]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
