import { createContext, useContext } from 'react';
import type { components } from '../api/schema';

export type AuthUser = components['schemas']['User'];
export type RegisterValues = components['schemas']['RegisterRequest'];

export type AuthContextValue = {
  token: string | null;
  /** Identity from login/register or the startup /me. Live points come from useMe. */
  user: AuthUser | null;
  /** True only while a saved token is being checked with /me at startup. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (values: RegisterValues) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
