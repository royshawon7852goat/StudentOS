import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('studentos_token'));
  const [loading, setLoading] = useState(true);

  // Initialize and check current user
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const storedToken = localStorage.getItem('studentos_token');
      if (!storedToken) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const userData = await api.auth.me();
        if (mounted) {
          setUser(userData);
          setToken(storedToken);
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        localStorage.removeItem('studentos_token');
        if (mounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('studentos:unauthorized', handleUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener('studentos:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('studentos_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.auth.register(userData);
    localStorage.setItem('studentos_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const loginDemo = async () => {
    const res = await api.auth.demo();
    localStorage.setItem('studentos_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('studentos_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated) => {
    setUser(prev => ({ ...prev, ...updated }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginDemo, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
