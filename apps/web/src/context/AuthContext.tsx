import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, SignUpInput, LoginInput } from '@ledgr/shared';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignUpInput) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  exportAllData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = api.getToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await api.getMe();
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          created_at: new Date().toISOString(),
        });
        setToken(storedToken);
      } catch {
        api.setToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (input: LoginInput) => {
    const session = await api.login(input);
    setToken(session.token);
    setUser(session.user);
  };

  const signup = async (input: SignUpInput) => {
    const session = await api.signup(input);
    setToken(session.token);
    setUser(session.user);
  };

  const loginDemo = async () => {
    try {
      const session = await api.login({
        email: 'demo@logpast.app',
        password: 'password123',
      });
      setToken(session.token);
      setUser(session.user);
    } catch {
      // If demo user doesn't exist yet on backend, sign up
      try {
        const session = await api.signup({
          email: 'demo@logpast.app',
          password: 'password123',
          name: 'Demo Technician',
        });
        setToken(session.token);
        setUser(session.user);
      } catch {
        // Fallback to local session
        const mockToken = 'demo-guest-jwt-token';
        api.setToken(mockToken);
        setToken(mockToken);
        setUser({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'demo@logpast.app',
          name: 'Demo Technician',
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
  };

  const exportAllData = async () => {
    try {
      const data = await api.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logpast-account-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Unable to export data without active connection');
    }
  };

  const deleteAccount = async () => {
    if (confirm('Are you sure you want to permanently delete your account and all work history?')) {
      try {
        if (api.getToken()) {
          await api.deleteAccount();
        }
      } catch (err) {
        console.warn('Delete account error:', err);
      } finally {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        loginDemo,
        logout,
        exportAllData,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
