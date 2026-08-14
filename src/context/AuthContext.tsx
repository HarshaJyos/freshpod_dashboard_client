'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance from '../lib/axios';

export interface User {
  uid?: string;
  name: string;
  email: string;
  role: 'admin' | 'dealership' | 'customer' | 'operator';
  phoneNumber?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{
    success: boolean;
    user?: User;
    role?: string;
    isFirstLogin?: boolean;
    error?: string;
  }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  userRole: string | undefined;
  isAdmin: boolean;
  isDealership: boolean;
  isCustomer: boolean;
  isOperator: boolean;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      console.log('🔐 Initializing auth...');
      console.log('📌 Token exists:', !!token);
      console.log('📌 Stored user:', storedUser);

      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser) as User;
          console.log('📌 Parsed user role:', userData?.role);
          
          setUser(userData);
          setAccessToken(token);
          
          // Set default axios header
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token with backend
          const response = await axiosInstance.get('/user/profile');
          console.log('✅ Profile verified:', response.data);
          console.log('📌 Verified user role:', response.data?.role);
          
          if (response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('❌ Auth check failed:', error);
          // Token might be expired, clear localStorage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          delete axiosInstance.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const response = await axiosInstance.post('/user/login', { email, password });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, isFirstLogin } = response.data;

      console.log('✅ Login successful!');
      
      // Store tokens
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Set axios header
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      setAccessToken(newAccessToken);
      
      // Get full user profile
      const profileResponse = await axiosInstance.get('/user/profile');
      const userData = profileResponse.data as User;
      
      console.log('✅ User profile fetched:', userData.name, userData.role);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { 
        success: true, 
        user: userData, 
        role: userData.role, 
        isFirstLogin 
      };
    } catch (error: any) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = async () => {
    console.log('🔐 Logging out...');
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await axiosInstance.post('/user/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Logout API call successful');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      delete axiosInstance.defaults.headers.common['Authorization'];
      setUser(null);
      setAccessToken(null);
      console.log('✅ User logged out, state cleared');
    }
  };

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      console.log('❌ No refresh token found');
      return false;
    }

    try {
      console.log('🔄 Refreshing token...');
      const response = await axiosInstance.post('/user/refresh-token', { refreshToken: refreshTokenValue });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      setAccessToken(newAccessToken);
      
      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user,
    userRole: user?.role,
    isAdmin: user?.role === 'admin',
    isDealership: user?.role === 'dealership',
    isCustomer: user?.role === 'customer',
    isOperator: user?.role === 'operator',
    accessToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
