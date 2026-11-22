import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../api';
import { AuthContext, type AuthUser, type RegisterValues } from './AuthContext';

const TOKEN_KEY = 'unlock.token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode): the session just won't persist
  }
}

// Set before the first render so requests made by children already carry the token.
const initialToken = readToken();
api.setAuthToken(initialToken);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(initialToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(initialToken !== null);

  const applyToken = useCallback((next: string | null) => {
    api.setAuthToken(next);
    writeToken(next);
    setToken(next);
  }, []);

  const clearSession = useCallback(() => {
    applyToken(null);
    setUser(null);
    queryClient.clear();
  }, [applyToken, queryClient]);

  // Any authenticated request that returns 401 ends the session; route guards then send the user to /login.
  useEffect(() => {
    api.setUnauthorizedHandler(clearSession);
    return () => api.setUnauthorizedHandler(null);
  }, [clearSession]);

  // On start with a saved token, load /me.
  useEffect(() => {
    if (!initialToken) return;
    let cancelled = false;
    api
      .getMe()
      .then((me) => {
        if (!cancelled) setUser({ id: me.id, name: me.name, role: me.role, points: me.points });
      })
      .catch(() => {
        // 401 is handled by clearSession. Other errors (server down): no user, so the guards show /login.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      queryClient.clear();
      applyToken(res.token);
      setUser(res.user);
      setIsLoading(false);
      return res.user;
    },
    [applyToken, queryClient],
  );

  const register = useCallback(
    async (values: RegisterValues) => {
      const res = await api.register(values);
      queryClient.clear();
      applyToken(res.token);
      setUser(res.user);
      setIsLoading(false);
      return res.user;
    },
    [applyToken, queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // token may already be invalid or the server down; log out locally anyway
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ token, user, isLoading, login, register, logout }),
    [token, user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
