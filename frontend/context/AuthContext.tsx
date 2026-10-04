import { createContext, type ReactNode } from 'react';

import type { User } from '../types/user';

// Auth state placeholder — JWT authentication will be implemented later.
export type AuthContextValue = {
  user: User | null;
};

export const AuthContext = createContext<AuthContextValue>({ user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={{ user: null }}>{children}</AuthContext.Provider>;
}
