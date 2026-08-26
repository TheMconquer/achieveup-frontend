import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
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
  isInstructor: boolean;
  isStudent: boolean;
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
    } catch (error: unknown) {
      console.error('Auth check failed:', error);

      // Handle different error types. The network-code check only applies to
      // real axios errors (that's where .code comes from); the message
      // check is a broader fallback that should catch any error - axios or
      // not - whose message mentions a fetch failure.
      const isNetworkFailure =
        (axios.isAxiosError(error) && error.code === 'NETWORK_ERROR') ||
        (error instanceof Error && error.message?.includes('fetch'));
      if (isNetworkFailure) {
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
        } catch (meError: unknown) {
          console.error('Failed to get user data after login:', meError);
          setUser(response.data.user);
          setBackendAvailable(true);
          return;
        }
      }

      throw new Error('Login failed. Please try again.');
    } catch (error: unknown) {
      console.error('Login failed:', error);

      if (axios.isAxiosError(error) && error.code === 'NETWORK_ERROR') {
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
        } catch (meError: unknown) {
          console.error('Failed to get user data after signup:', meError);
          setUser(response.data.user);
          setBackendAvailable(true);
          return;
        }
      }

      throw new Error('Signup failed. Please try again.');
    } catch (error: unknown) {
      console.error('Signup failed:', error);

      if (axios.isAxiosError(error) && error.code === 'NETWORK_ERROR') {
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
    isInstructor,
    isStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
