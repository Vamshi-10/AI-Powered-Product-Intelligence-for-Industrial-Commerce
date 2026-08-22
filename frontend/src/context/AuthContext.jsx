import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [sessionMode, setSessionMode] = useState(() => localStorage.getItem('adharra_session_mode') || null);
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const isGuest = sessionMode === 'guest';

  // Sync state on load
  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setSessionMode(localStorage.getItem('adharra_session_mode') || null);
    setUser(authService.getCurrentUser());
  }, []);

  /**
   * Real login handler calling authService.login()
   */
  const login = async (email, password, rememberMe = false) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.login(email, password, rememberMe);
      if (result.success) {
        setIsAuthenticated(true);
        setUser(result.user || { email, role: 'User' });
        return { success: true };
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setAuthError(result.error || 'Authentication failed.');
        return { success: false, error: result.error };
      }
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
      const msg = err.message || 'An unexpected error occurred during login.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Real register handler calling authService.register()
   */
  const register = async (userData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.register(userData);
      return result;
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Google OAuth handler
   */
  const loginWithGoogle = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.loginWithGoogle();
      if (!result.success) {
        setAuthError(result.error);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Microsoft OAuth handler
   */
  const loginWithMicrosoft = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.loginWithMicrosoft();
      if (!result.success) {
        setAuthError(result.error);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Forgot password handler
   */
  const forgotPassword = async (email) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.forgotPassword(email);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Guest mode login (local only, no backend)
   */
  const loginAsGuest = () => {
    localStorage.setItem('adharra_session_mode', 'guest');
    setSessionMode('guest');
    setUser({
      id: 'guest',
      name: 'Guest User',
      role: 'Local Tester',
      sessionMode: 'guest'
    });
  };

  const exitGuestMode = () => {
    localStorage.removeItem('adharra_session_mode');
    setSessionMode(null);
    if (!isAuthenticated) {
      setUser(null);
    }
  };

  /**
   * Real logout handler calling authService.logout()
   */
  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    exitGuestMode();
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        authError,
        setAuthError,
        login,
        register,
        loginWithGoogle,
        loginWithMicrosoft,
        forgotPassword,
        logout,
        sessionMode,
        isGuest,
        loginAsGuest,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
