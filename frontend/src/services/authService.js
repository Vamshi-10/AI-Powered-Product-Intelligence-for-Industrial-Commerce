/**
 * ADHARRA Authentication Service Layer
 * 
 * Provides isolated authentication integration for the ADHARRA frontend.
 * Prepares real authentication methods (Email/Password, Google OAuth, Microsoft OAuth, Registration, Password Reset)
 * without hardcoded mock credentials or fake auto-logins.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'adharra_token';
const USER_KEY = 'adharra_user';
const REMEMBER_KEY = 'adharra_remember_email';

export const authService = {
  /**
   * Log in with Email and Password
   * @param {string} email 
   * @param {string} password 
   * @param {boolean} rememberMe 
   * @returns {Promise<{ success: boolean, user?: object, token?: string, error?: string }>}
   */
  async login(email, password, rememberMe = false) {
    if (rememberMe) {
      try {
        localStorage.setItem(REMEMBER_KEY, email);
      } catch (e) {
        // Ignore storage errors
      }
    } else {
      try {
        localStorage.removeItem(REMEMBER_KEY);
      } catch (e) {
        // Ignore storage errors
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        return {
          success: false,
          error: data.message || 'Invalid credentials or authentication failed.',
        };
      }

      // Store real token and user details
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, data.token);
      if (data.user) {
        storage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } catch (err) {
      // Backend not yet reachable or network failure
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please check backend service status.',
      };
    }
  },

  /**
   * Register a new user account
   * @param {{ fullName: string, email: string, password: string }} userData
   * @returns {Promise<{ success: boolean, user?: object, message?: string, error?: string }>}
   */
  async register({ fullName, email, password }) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Registration failed. Please try again.',
        };
      }

      return {
        success: true,
        user: data.user,
        message: data.message || 'Account created successfully. Please sign in.',
      };
    } catch (err) {
      return {
        success: false,
        error: 'Unable to reach registration service. Please verify backend API connectivity.',
      };
    }
  },

  /**
   * Initiate Google OAuth sign-in flow
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async loginWithGoogle() {
    try {
      // If backend provides an OAuth redirect endpoint:
      const oauthUrl = `${API_BASE_URL}/auth/google`;
      
      // Test if endpoint is configured or redirect
      const check = await fetch(oauthUrl, { method: 'HEAD' }).catch(() => null);
      if (check && check.ok) {
        window.location.href = oauthUrl;
        return { success: true };
      }

      return {
        success: false,
        error: 'Google OAuth is not configured on the authentication backend yet.',
      };
    } catch (err) {
      return {
        success: false,
        error: 'Google OAuth service unavailable.',
      };
    }
  },

  /**
   * Initiate Microsoft OAuth sign-in flow
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async loginWithMicrosoft() {
    try {
      const oauthUrl = `${API_BASE_URL}/auth/microsoft`;
      
      const check = await fetch(oauthUrl, { method: 'HEAD' }).catch(() => null);
      if (check && check.ok) {
        window.location.href = oauthUrl;
        return { success: true };
      }

      return {
        success: false,
        error: 'Microsoft OAuth is not configured on the authentication backend yet.',
      };
    } catch (err) {
      return {
        success: false,
        error: 'Microsoft OAuth service unavailable.',
      };
    }
  },

  /**
   * Request password reset link
   * @param {string} email 
   * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
   */
  async forgotPassword(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send password reset link.',
        };
      }

      return {
        success: true,
        message: data.message || 'Password reset link sent to your email address.',
      };
    } catch (err) {
      return {
        success: false,
        error: 'Password reset service unavailable. Please check backend connection.',
      };
    }
  },

  /**
   * Log out and clear tokens
   */
  async logout() {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {});
      } catch (e) {
        // Ignore network errors during logout
      }
    }

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch (e) {
      // Ignore storage errors
    }
  },

  /**
   * Retrieve active authentication token
   * @returns {string | null}
   */
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Retrieve current user profile from token/session
   * @returns {object | null}
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if a genuine authenticated session exists
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this.getToken());
  },

  /**
   * Get remembered email if available
   * @returns {string}
   */
  getRememberedEmail() {
    try {
      return localStorage.getItem(REMEMBER_KEY) || '';
    } catch (e) {
      return '';
    }
  }
};
