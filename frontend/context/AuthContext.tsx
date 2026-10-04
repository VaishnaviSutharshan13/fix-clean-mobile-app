import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, setApiToken, setUnauthorizedHandler } from '../services/api';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RegisterProviderPayload,
  User,
  UserRole,
} from '../types/user';

// Thrown by login() when the account exists but has a different role than the
// login screen expects (e.g. a customer using Provider Login). No session is stored.
export class RoleMismatchError extends Error {
  constructor(public readonly actualRole: UserRole) {
    super(`This account is registered as a ${actualRole}.`);
    this.name = 'RoleMismatchError';
  }
}

export type LoginOptions = { expectedRole?: UserRole };

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  // True while a stored session is being restored on app start.
  isLoading: boolean;
  login: (payload: LoginPayload, options?: LoginOptions) => Promise<User>;
  registerCustomer: (payload: RegisterPayload) => Promise<User>;
  registerProvider: (payload: RegisterProviderPayload) => Promise<User>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session: validate the stored token against /auth/profile.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const storedToken = await tokenStorage.get();
        if (!storedToken) return;

        const profile = await authService.getProfile(storedToken);
        if (!cancelled) {
          setApiToken(storedToken);
          setToken(storedToken);
          setUser(profile);
        }
      } catch (error) {
        // Expired or invalid token — discard it. Keep it on network errors so
        // the user isn't logged out just for being offline at launch.
        if (error instanceof ApiError && error.status === 401) {
          await tokenStorage.clear();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(async ({ accessToken, user: authUser }: AuthResponse) => {
    await tokenStorage.set(accessToken);
    setApiToken(accessToken);
    setToken(accessToken);
    setUser(authUser);
    return authUser;
  }, []);

  const login = useCallback(
    async (payload: LoginPayload, options?: LoginOptions) => {
      const response = await authService.login(payload);
      if (options?.expectedRole && response.user.role !== options.expectedRole) {
        throw new RoleMismatchError(response.user.role);
      }
      return startSession(response);
    },
    [startSession],
  );

  const registerCustomer = useCallback(
    async (payload: RegisterPayload) => startSession(await authService.registerCustomer(payload)),
    [startSession],
  );

  const registerProvider = useCallback(
    async (payload: RegisterProviderPayload) => startSession(await authService.registerProvider(payload)),
    [startSession],
  );

  const logout = useCallback(async () => {
    setApiToken(null);
    await tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  // An expired or revoked token on any API call signs the user out; the route
  // guards then return them to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      role: user?.role ?? null,
      isAuthenticated: user !== null,
      isLoading,
      login,
      registerCustomer,
      registerProvider,
      logout,
    }),
    [user, token, isLoading, login, registerCustomer, registerProvider, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
