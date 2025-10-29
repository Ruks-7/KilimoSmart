import React, { useState } from 'react';
import './Styling/admin.css';
import { API_CONFIG, apiCall } from '../config/api';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // Validation logic
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'email':
        if (!value) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Enter a valid email';
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (value.length < 6) error = 'Min 6 characters';
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    if (error) setError(null);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall(API_CONFIG.ENDPOINTS.AUTH.ADMIN_LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      if (res && res.token) {
        if (rememberMe) {
          localStorage.setItem('authToken', res.token);
          localStorage.setItem('user', JSON.stringify(res.user || {}));
        } else {
          sessionStorage.setItem('authToken', res.token);
          sessionStorage.setItem('user', JSON.stringify(res.user || {}));
        }
        navigate('/admin');
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (field) => {
    if (errors[field]) return 'input-error';
    if (formData[field] && !errors[field]) return 'input-valid';
    return '';
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-header">
          <h2>🛡️ Admin Login</h2>
          <p>Sign in to manage the platform</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputClass('email')}
                placeholder="admin@example.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputClass('password')}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>
          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              Remember me
            </label>
          </div>
          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading || Object.keys(errors).some(key => errors[key])}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
