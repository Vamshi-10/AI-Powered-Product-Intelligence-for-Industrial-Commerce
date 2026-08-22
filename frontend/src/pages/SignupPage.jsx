import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

const SignupPage = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, loginWithMicrosoft, isLoading, authError, setAuthError } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (setAuthError) setAuthError(null);
    setSuccessMessage('');

    if (validateForm()) {
      const result = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (result && result.success) {
        setSuccessMessage(result.message || 'Account registered successfully! Redirecting to sign in...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    }
  };

  const handleGoogleSignUp = async () => {
    if (setAuthError) setAuthError(null);
    await loginWithGoogle();
  };

  const handleMicrosoftSignUp = async () => {
    if (setAuthError) setAuthError(null);
    await loginWithMicrosoft();
  };

  return (
    <div className="auth-page">
      {/* Subtle grid overlay */}
      <div className="auth-grid-bg" aria-hidden="true" />

      {/* ── CENTERED BODY ──────────────────────────── */}
      <div className="auth-body">
        <div className="auth-centered-card">

          <div className="auth-centered-header">
            <AdharraLogo className="auth-centered-logo" />
            
            <span className="auth-badge">
              ⚡ AI-POWERED PRODUCT INTELLIGENCE
            </span>

            <h1 className="auth-title">
              <span className="auth-text-white">Create your<br/></span>
              <span className="auth-text-gradient">Account</span>
            </h1>

            <p className="auth-desc">
              Join Adharra to create your product intelligence workspace.
            </p>
          </div>

            {/* Success Message */}
            {successMessage && (
              <div className="auth-alert auth-alert-info" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
                <CheckCircle2 size={15} style={{ color: '#10B981', flexShrink: 0 }} />
                <span style={{ color: '#34D399', fontSize: '0.83rem' }}>{successMessage}</span>
              </div>
            )}

            {/* Auth error */}
            {authError && (
              <div className="auth-alert auth-alert-error">
                <AlertCircle size={15} />
                <span>{authError}</span>
              </div>
            )}

            {/* Social buttons */}
            <div className="auth-social-buttons">
              <button type="button" className="auth-social-btn" onClick={handleGoogleSignUp} disabled={isLoading}>
                <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue with Google
              </button>

              <button type="button" className="auth-social-btn" onClick={handleMicrosoftSignUp} disabled={isLoading}>
                <svg className="social-icon" viewBox="0 0 23 23" width="18" height="18">
                  <rect x="0" y="0" width="10.5" height="10.5" fill="#f25022"/>
                  <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7fba00"/>
                  <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00a4ef"/>
                  <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#ffb900"/>
                </svg>
                Continue with Microsoft
              </button>
            </div>

            <div className="auth-divider">
              <span className="auth-divider-line" />
              <span className="auth-divider-label">or</span>
              <span className="auth-divider-line" />
            </div>

            {/* Email & Password form */}
            <form className="auth-form" onSubmit={handleSignUp} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="name-input">Full Name</label>
                <div className="auth-input-wrap">
                  <User className="auth-input-icon" size={16} />
                  <input
                    id="name-input"
                    type="text"
                    className={`auth-input ${errors.fullName ? 'auth-input-error' : ''}`}
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors({ ...errors, fullName: '' }); }}
                  />
                </div>
                {errors.fullName && (
                  <span className="auth-field-error" role="alert">
                    <AlertCircle size={13} />{errors.fullName}
                  </span>
                )}
              </div>

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
                    placeholder="Create a strong password"
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

              <div className="auth-field">
                <label className="auth-label" htmlFor="confirm-password-input">Confirm Password</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" size={16} />
                  <input
                    id="confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`auth-input ${errors.confirmPassword ? 'auth-input-error' : ''}`}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }}
                  />
                  <button type="button" className="auth-pwd-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="auth-field-error" role="alert">
                    <AlertCircle size={13} />{errors.confirmPassword}
                  </span>
                )}
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isLoading} style={{ marginTop: '8px' }}>
                {isLoading ? (
                  <span className="auth-loading">
                    <Loader2 size={16} className="auth-spinner" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="auth-signup-prompt">
              Already have an account?{' '}
              <button type="button" className="auth-signup-link" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>

          <button className="auth-back-link" onClick={() => navigate('/')}>
            <ArrowLeft size={15} />
            Back to Adharra
          </button>
        </div>
    </div>
  );
};

export default SignupPage;

