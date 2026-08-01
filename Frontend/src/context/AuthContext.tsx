import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api, { ensureFreshAccessToken } from '../services/api';
import type { User, Team } from '../types';

interface AuthState {
  user:    User | null;
  teams:   Team[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login:       (accessToken: string, refreshToken: string) => Promise<void>;
  logout:      () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, teams: [], loading: true });

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { setState({ user: null, teams: [], loading: false }); return; }
    try {
      await ensureFreshAccessToken();
      const { data } = await api.get('/auth/me');
      setState({ user: data.data.user, teams: data.data.teams ?? [], loading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setState({ user: null, teams: [], loading: false });
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = useCallback(async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token',  accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setState({ user: null, teams: [], loading: false });
  }, []);

  const refreshUser = useCallback(() => fetchMe(), [fetchMe]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
