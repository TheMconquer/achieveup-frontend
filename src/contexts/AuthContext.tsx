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

      // More flexible role checking - allow users who signed up without Canvas tokens
      const isInstructor =
        userData.canvasTokenType === 'instructor' ||
        userData.role === 'instructor' ||
        userData.role === 'admin' ||
        !userData.canvasTokenType; // Allow users without Canvas token

      if (!isInstructor) {
        console.warn('Non-instructor user detected, logging out');
        localStorage.removeItem('token');
        setUser(null);
        return;
      }

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

      // Ensure only instructor signups are allowed
      const signupData = {
        ...data,
        canvasTokenType: 'instructor' as const,
        role: 'instructor' as const,
      };

      const response = await authAPI.signup(signupData);

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

      // More flexible role checking - allow users who signed up without Canvas tokens
      const isInstructor =
        userData.canvasTokenType === 'instructor' ||
        userData.role === 'instructor' ||
        userData.role === 'admin' ||
        !userData.canvasTokenType; // Allow users without Canvas token

      if (!isInstructor) {
        console.warn('Non-instructor user detected, logging out');
        logout();
        return;
      }

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
