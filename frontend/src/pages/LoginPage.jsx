import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, ShieldAlert, Loader2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import './LoginPage.css';

/* ── Logo (matches LandingPage exactly) ────────────────────────── */
const AdharraLogo = ({ className = '' }) => (
  <div className={`auth-logo-wrap ${className}`}>
    <div className="auth-logo-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </div>
    <span className="auth-logo-text">ADHARRA</span>
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, loginWithMicrosoft, loginAsGuest, isLoading, authError, setAuthError } = useAuth();

  const [email, setEmail] = useState(() => authService.getRememberedEmail());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(authService.getRememberedEmail()));
  const [oauthNotice, setOauthNotice] = useState('');
  const oauthTimerRef = useRef(null);

  const fromDestination = location.state?.from?.pathname
    ? (location.state.from.pathname + (location.state.from.search || ''))
    : null;

  const [errors, setErrors] = useState({ email: '', password: '' });

  // Auto-dismiss OAuth notice after 4s
  useEffect(() => {
    if (oauthNotice) {
      if (oauthTimerRef.current) clearTimeout(oauthTimerRef.current);
      oauthTimerRef.current = setTimeout(() => setOauthNotice(''), 4000);
    }
    return () => { if (oauthTimerRef.current) clearTimeout(oauthTimerRef.current); };
  }, [oauthNotice]);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };
    if (!email.trim()) {
      newErrors.email = 'Email address is required'; isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address'; isValid = false;
    }
    if (!password) { newErrors.password = 'Password is required'; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (setAuthError) setAuthError(null);
    if (validateForm()) {
      const result = await login(email.trim(), password, rememberMe);
      if (result && result.success) {
        navigate(fromDestination || '/dashboard', { replace: true });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (setAuthError) setAuthError(null);
    setOauthNotice('Authentication provider will be connected during backend integration.');
  };

  const handleMicrosoftSignIn = async () => {
    if (setAuthError) setAuthError(null);
    setOauthNotice('Authentication provider will be connected during backend integration.');
  };

  const handleGuestAccess = () => {
    loginAsGuest();
    navigate(fromDestination || '/dashboard', { replace: true });
  };

  return (
    <div className="auth-page auth-page-centered">
      {/* Subtle grid overlay */}
      <div className="auth-grid-bg" aria-hidden="true" />

      <div className="auth-body">
        <div className="auth-centered-card">
          <div className="auth-centered-header">
            <AdharraLogo className="auth-centered-logo" />
            
            <span className="auth-badge">
              ⚡ AI-POWERED PRODUCT INTELLIGENCE
            </span>

            <h1 className="auth-title">
              <span className="auth-text-white">Welcome to<br/></span>
              <span className="auth-text-gradient">ADHARRA</span>
            </h1>

            <p className="auth-desc">
              Sign in to continue to your product intelligence workspace.
            </p>
          </div>

          {fromDestination && (
            <div className="auth-alert auth-alert-info">
              <ShieldAlert size={15} />
              <span>Sign in to access protected features.</span>
            </div>
          )}

          {authError && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={15} />
              <span>{authError}</span>
            </div>
          )}

          <div className="auth-social-buttons">
            <button type="button" className="auth-social-btn" onClick={handleGoogleSignIn} disabled={isLoading}>
              <svg className="social-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign in with Google
            </button>

            <button type="button" className="auth-social-btn" onClick={handleMicrosoftSignIn} disabled={isLoading}>
              <svg className="social-icon" viewBox="0 0 23 23" width="20" height="20">
                <rect x="0" y="0" width="10.5" height="10.5" fill="#f25022"/>
                <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7fba00"/>
                <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00a4ef"/>
                <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </button>
          </div>

          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-label">or</span>
            <span className="auth-divider-line" />
          </div>

          {/* Email & Password form */}
          <form className="auth-form" onSubmit={handleSignIn} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email-input">Email Address</label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" size={16} />
                <input
                  id="email-input"
                  type="email"
                  className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: '' }); }}
                />
              </div>
              {errors.email && (
                <span className="auth-field-error" role="alert">
                  <AlertCircle size={13} />{errors.email}
                </span>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password-input">Password</label>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" size={16} />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: '' }); }}
                />
                <button type="button" className="auth-pwd-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <span className="auth-field-error" role="alert">
                  <AlertCircle size={13} />{errors.password}
                </span>
              )}
            </div>

            <div className="auth-options-row">
              <label className="auth-remember">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="auth-remember-label">Remember Me</span>
              </label>
              <button type="button" className="auth-forgot-link" onClick={() => navigate('/forgot-password')}>
                Forgot Password
              </button>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="auth-loading">
                  <Loader2 size={16} className="auth-spinner" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
            
            <button type="button" className="auth-guest-link" onClick={handleGuestAccess}>
              Continue as Guest (Local Testing)
            </button>
          </form>

          <div className="auth-signup-prompt">
            Don't have an account?{' '}
            <button type="button" className="auth-signup-link" onClick={() => navigate('/signup')}>
              Sign Up
            </button>
          </div>

          <button className="auth-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={15} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
