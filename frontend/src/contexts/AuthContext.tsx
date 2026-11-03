// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, refreshSession, setAccessToken, setSessionLostHandler } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Re-fetches the user (e.g. after the profile changes `profileComplete`). */
  refreshUser: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Restore the session from the httpOnly refresh cookie on first load.
  useEffect(() => {
    let active = true;
    refreshSession()
      .then((s) => active && setUser(s.user))
      .catch(() => active && setUser(null))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSessionLostHandler(clearSession);
    return () => setSessionLostHandler(null);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login(email, password);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { user: fresh } = await authApi.me();
    setUser(fresh);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser, clearSession }),
    [user, isLoading, login, logout, refreshUser, clearSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
