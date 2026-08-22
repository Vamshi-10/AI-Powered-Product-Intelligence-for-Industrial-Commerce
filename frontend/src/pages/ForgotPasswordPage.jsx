import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { forgotPassword, isLoading, authError, setAuthError } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (setAuthError) setAuthError(null);
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    const result = await forgotPassword(email.trim());
    if (result && result.success) {
      setSuccessMessage(result.message || 'Password reset link has been sent to your email.');
    } else if (result && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-grid-bg" aria-hidden="true" />

      {/* ---- Branding ---- */}
      <div className="login-branding">
        <div className="login-logo">
          <div className="login-logo-icon">A</div>
          <span className="login-logo-text">ADHARRA</span>
        </div>
        <div className="login-badge">
          <span className="login-badge-dot" />
          AI-Powered Product Intelligence
        </div>
      </div>

      {/* ---- Card ---- */}
      <div className="auth-card">
        <div className="auth-card-header">
          <h2 className="auth-title">
            Reset <span className="accent">Password</span>
          </h2>
          <p className="auth-subtitle">
            Enter your account email and we'll send you instructions to reset your password.
          </p>
        </div>

        {/* Success Notice */}
        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#34D399',
            fontSize: '0.84rem',
            fontWeight: 500,
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Notice */}
        {(error || authError) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#FCA5A5',
            fontSize: '0.82rem',
            fontWeight: 500,
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error || authError}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-email">
              Email Address
            </label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input
                id="reset-email"
                type="email"
                className={`form-input ${error ? 'input-error' : ''}`}
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" />
                Sending reset link...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="signup-prompt">
          Remember your password?{' '}
          <button 
            type="button" 
            className="signup-link" 
            onClick={() => navigate('/login')}
          >
            Back to Sign In
          </button>
        </div>
      </div>

      {/* Back to Sign In Link */}
      <button className="back-link" onClick={() => navigate('/login')}>
        <ArrowLeft className="back-arrow" />
        Back to Sign In
      </button>
    </div>
  );
};

export default ForgotPasswordPage;
