import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { User, SignupRequest } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  backendAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);

  const isStudent = user?.role === 'student';
  const isInstructor = user?.role === 'instructor';

  // Check authentication status on app load
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setUser(null);
        setBackendAvailable(true);
        return;
      }

      // Verify token and get user info
      const response = await authAPI.me();
      const userData = response.data.user || response.data;

      setUser(userData);
      setBackendAvailable(true);
    } catch (error: any) {
      console.error('Auth check failed:', error);

      // Handle different error types
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
        setBackendAvailable(false);
      } else {
        setBackendAvailable(true);
      }

      // Clear invalid token
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);

      const response = await authAPI.login({ email, password });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);

        // Get user data. Any authenticated account is let in and which dashboard they will be determined by routing,
        // not a login-time gate.
        try {
          const userResponse = await authAPI.me();
          const userData = userResponse.data.user || userResponse.data;
          setUser(userData);
          setBackendAvailable(true);
          return;
        } catch (meError: any) {
          console.error('Failed to get user data after login:', meError);
          setUser(response.data.user);
          setBackendAvailable(true);
          return;
        }
      }

      throw new Error('Login failed. Please try again.');
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error.code === 'NETWORK_ERROR') {
        setBackendAvailable(false);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupRequest): Promise<void> => {
    try {
      setLoading(true);

      if (!data.canvasApiToken) {
        throw new Error('A Canvas API token is required to sign up.');
      }

      // role/canvas_token_type are not set in frontend - the backend infers them entirely from validating the submitted Canvas API token.
      const response = await authAPI.signup(data);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);

        // Get user data after successful signup
        try {
          const userResponse = await authAPI.me();
          const userData = userResponse.data.user || userResponse.data;
          setUser(userData);
          setBackendAvailable(true);
          return;
        } catch (meError: any) {
          console.error('Failed to get user data after signup:', meError);
          setUser(response.data.user);
          setBackendAvailable(true);
          return;
        }
      }

      throw new Error('Signup failed. Please try again.');
    } catch (error: any) {
      console.error('Signup failed:', error);

      if (error.code === 'NETWORK_ERROR') {
        setBackendAvailable(false);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      const userData = response.data.user || response.data;

      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    backendAvailable,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
