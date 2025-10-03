import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import './Styling/auth.css';

const FarmerLogin = () => {
//   const navigate = useNavigate();
const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    document.body.classList.add('auth-page');
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  // Real-time validation
  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters';
        }
        break;
      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      setGeneralError('Please fix the errors below');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // API call to authenticate
      //we'll simulate a successful login
      console.log('Login data:', formData);
      console.log('Remember me:', rememberMe);

      // Redirect to farmer dashboard or home page
      // navigate('/farmer/dashboard');
      
      alert('Login successful! (This is a demo)');
    } catch (error) {
      setGeneralError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInputClass = (fieldName) => {
    if (errors[fieldName]) return 'input-error';
    if (formData[fieldName] && !errors[fieldName]) return 'input-valid';
    return '';
  };

  const getValidationIcon = (fieldName) => {
    if (!formData[fieldName]) return null;
    if (errors[fieldName]) {
      return <span className="validation-icon invalid">✕</span>;
    }
    return <span className="validation-icon valid">✓</span>;
  };

  return (
    <div className="auth-container login-container">
      <div className="auth-header">
        <h2>🌾 Farmer Login</h2>
        <p>Welcome back! Sign in to manage your farm</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form login-form">
        {generalError && (
          <div className="error-message">
            {generalError}
          </div>
        )}

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
              placeholder="farmer@example.com"
              disabled={isLoading}
              autoComplete="email"
            />
            {getValidationIcon('email')}
          </div>
          {errors.email && (
            <div className="error-message">{errors.email}</div>
          )}
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
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
            {getValidationIcon('password')}
          </div>
          {errors.password && (
            <div className="error-message">{errors.password}</div>
          )}
        </div>

        <div className="form-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            Remember me
          </label>
          <a href="/forgot-password" className="forgot-password">
            Forgot Password?
          </a>
        </div>

        <button 
          type="submit" 
          className="auth-btn"
          disabled={isLoading || Object.keys(errors).some(key => errors[key])}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner"></div>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <span>→</span>
            </>
          )}
        </button>

        <div className="auth-nav-link">
          <p>
            Don't have an account?
            <a href="/signupFarmer">Create Farmer Account</a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default FarmerLogin;
